using System;
using System.Linq;
using System.Threading.Tasks;
using CrmSystem.Api.Hubs;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Payment;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;
    private readonly IHubContext<NotificationHub> _hubContext;

    public PaymentsController(
        AppDbContext db,
        ICurrentUserService currentUser,
        IAuditService auditService,
        IHubContext<NotificationHub> hubContext)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] int? customerId,
        [FromQuery] int? invoiceId,
        [FromQuery] string? search,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var query = _db.Payments
            .Include(p => p.Invoice)
                .ThenInclude(i => i.Payments)
            .Include(p => p.Customer)
                .ThenInclude(c => c.Company)
            .Include(p => p.Contract)
            .Include(p => p.Opportunity)
            .Include(p => p.VerifiedBy)
            .Where(p => !p.IsDeleted);

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            query = query.Where(p => p.Status.ToLower() == status.ToLower());
        }

        if (customerId.HasValue && customerId.Value > 0)
        {
            query = query.Where(p => p.CustomerId == customerId.Value);
        }

        if (invoiceId.HasValue && invoiceId.Value > 0)
        {
            query = query.Where(p => p.InvoiceId == invoiceId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(p => p.PaymentDate >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(p => p.PaymentDate <= endDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p =>
                p.PaymentNumber.ToLower().Contains(term) ||
                p.Invoice.InvoiceNumber.ToLower().Contains(term) ||
                (p.Customer.FirstName + " " + p.Customer.LastName).ToLower().Contains(term) ||
                (p.Customer.Company != null && p.Customer.Company.Name.ToLower().Contains(term)) ||
                (p.TransactionReference != null && p.TransactionReference.ToLower().Contains(term)));
        }

        var list = await query
            .Where(p => !p.IsDeleted && (p.Invoice == null || !p.Invoice.IsDeleted))
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync();

        var dtos = list.Select(MapToDto).ToList();
        return Ok(dtos);
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics()
    {
        var payments = await _db.Payments
            .Include(p => p.Invoice)
            .Where(p => !p.IsDeleted && (p.Invoice == null || !p.Invoice.IsDeleted))
            .ToListAsync();

        var invoices = await _db.Invoices
            .Include(i => i.Payments)
            .Where(i => !i.IsDeleted && i.Status != "Paid" && i.Status != "Cancelled" && i.Status != "Void")
            .ToListAsync();

        var totalCollected = payments.Where(p => p.Status == "Completed").Sum(p => p.Amount);
        var totalPending = payments.Where(p => p.Status == "Pending" || p.Status == "PendingVerification").Sum(p => p.Amount);
        var totalRefunded = payments.Where(p => p.Status == "Refunded").Sum(p => p.Amount);

        // Accounts Receivable (sum of remaining unpaid balances on all open invoices)
        decimal totalReceivable = 0;
        int partiallyPaidInvoices = 0;
        foreach (var inv in invoices)
        {
            var paid = inv.Payments.Where(p => p.Status == "Completed" && !p.IsDeleted).Sum(p => p.Amount);
            var balance = Math.Max(0m, inv.TotalAmount - paid);
            if (balance > 0)
            {
                totalReceivable += balance;
            }
            if (paid > 0 && paid < inv.TotalAmount)
            {
                partiallyPaidInvoices++;
            }
        }

        var completedCount = payments.Count(p => p.Status == "Completed");
        var pendingCount = payments.Count(p => p.Status == "Pending" || p.Status == "PendingVerification");

        return Ok(new
        {
            totalCollected,
            totalPending,
            totalRefunded,
            totalReceivable,
            completedCount,
            pendingCount,
            partiallyPaidInvoices,
            totalTransactions = payments.Count
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var payment = await _db.Payments
            .Include(p => p.Invoice)
                .ThenInclude(i => i.Payments)
            .FirstOrDefaultAsync(p => p.PaymentId == id && !p.IsDeleted);

        if (payment == null)
        {
            return NotFound(new { message = "Payment record not found." });
        }

        payment.IsDeleted = true;
        payment.UpdatedAt = DateTime.UtcNow;

        var invoice = payment.Invoice;
        if (invoice != null && !invoice.IsDeleted)
        {
            var remainingCompleted = invoice.Payments
                .Where(p => p.PaymentId != payment.PaymentId && p.Status == "Completed" && !p.IsDeleted)
                .Sum(p => p.Amount);

            if (remainingCompleted >= invoice.TotalAmount && invoice.TotalAmount > 0)
            {
                invoice.Status = "Paid";
            }
            else if (remainingCompleted > 0)
            {
                invoice.Status = "PartiallyPaid";
                invoice.PaidAt = null;
            }
            else
            {
                invoice.Status = invoice.DueDate.Date < DateTime.UtcNow.Date ? "Overdue" : "Sent";
                invoice.PaidAt = null;
            }
            invoice.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        await _auditService.LogFieldChangeAsync(
            entityTypeId: 5,
            entityId: payment.InvoiceId,
            fieldName: "PaymentDeleted",
            oldValue: $"Amount: {payment.Amount:C}",
            newValue: "Deleted",
            actionTypeName: "PaymentDeleted",
            changedById: _currentUser.UserId ?? payment.CreatedById ?? 1
        );

        return NoContent();
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var payment = await _db.Payments
            .Include(p => p.Invoice)
                .ThenInclude(i => i.Payments)
            .Include(p => p.Customer)
                .ThenInclude(c => c.Company)
            .Include(p => p.Contract)
            .Include(p => p.Opportunity)
            .Include(p => p.VerifiedBy)
            .FirstOrDefaultAsync(p => p.PaymentId == id && !p.IsDeleted);

        if (payment == null)
            return NotFound(new { message = "Payment transaction record not found." });

        return Ok(MapToDto(payment));
    }

    [HttpPost("manual")]
    public async Task<IActionResult> RecordManualPayment([FromBody] RecordManualPaymentDto dto)
    {
        if (dto.Amount <= 0)
        {
            return BadRequest(new { message = "Payment amount must be greater than zero." });
        }

        var invoice = await _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Payments.Where(p => !p.IsDeleted))
            .FirstOrDefaultAsync(i => i.InvoiceId == dto.InvoiceId && !i.IsDeleted);

        if (invoice == null)
        {
            return NotFound(new { message = "Invoice not found." });
        }

        var currentPaid = invoice.Payments.Where(p => p.Status == "Completed").Sum(p => p.Amount);
        var balanceDue = Math.Max(0m, invoice.TotalAmount - currentPaid);

        if (balanceDue <= 0)
        {
            return BadRequest(new { message = "This invoice is already fully paid." });
        }

        if (dto.Amount > balanceDue + 0.01m)
        {
            return BadRequest(new { message = $"Payment amount ({dto.Amount:C}) exceeds remaining invoice balance ({balanceDue:C})." });
        }

        var paymentNumber = $"PAY-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
        var baseMethod = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "Bank Transfer" : dto.PaymentMethod.Trim();
        var paymentMethodName = !string.IsNullOrWhiteSpace(dto.BankName) && (baseMethod.Contains("Bank") || baseMethod.Contains("Check") || baseMethod.Contains("Wire"))
            ? $"{baseMethod} ({dto.BankName.Trim()})"
            : baseMethod;

        var paymentDate = dto.PaymentDate ?? DateTime.UtcNow;

        var payment = new Payment
        {
            PaymentNumber = paymentNumber,
            InvoiceId = invoice.InvoiceId,
            CustomerId = invoice.CustomerId,
            ContractId = invoice.ContractId,
            OpportunityId = invoice.OpportunityId,
            Amount = dto.Amount,
            Currency = "USD",
            PaymentMethod = paymentMethodName,
            Status = "Completed",
            TransactionReference = dto.TransactionReference,
            Notes = dto.Notes,
            PaymentDate = paymentDate,
            VerifiedById = _currentUser.UserId,
            VerifiedAt = DateTime.UtcNow,
            CreatedById = _currentUser.UserId
        };

        _db.Payments.Add(payment);

        var newTotalPaid = currentPaid + dto.Amount;
        var oldInvoiceStatus = invoice.Status;
        if (newTotalPaid >= invoice.TotalAmount)
        {
            invoice.Status = "Paid";
            invoice.PaidAt = paymentDate;
        }
        else
        {
            invoice.Status = "PartiallyPaid";
        }
        invoice.PaymentMethod = payment.PaymentMethod;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Audit Log
        await _auditService.LogFieldChangeAsync(
            entityTypeId: 5,
            entityId: invoice.InvoiceId,
            fieldName: "Status",
            oldValue: oldInvoiceStatus,
            newValue: invoice.Status,
            actionTypeName: "PaymentReceived",
            changedById: _currentUser.UserId ?? invoice.CreatedById
        );

        return Ok(new
        {
            message = "Manual offline payment recorded and verified successfully.",
            payment = MapToDto(payment)
        });
    }

    [HttpPost("{id:int}/verify-wire")]
    public async Task<IActionResult> VerifyWireTransfer(int id)
    {
        var payment = await _db.Payments
            .Include(p => p.Invoice)
                .ThenInclude(i => i.Payments)
            .Include(p => p.Customer)
            .FirstOrDefaultAsync(p => p.PaymentId == id && !p.IsDeleted);

        if (payment == null)
        {
            return NotFound(new { message = "Payment record not found." });
        }

        if (payment.Status == "Completed")
        {
            return BadRequest(new { message = "This payment has already been verified and completed." });
        }

        payment.Status = "Completed";
        payment.VerifiedById = _currentUser.UserId;
        payment.VerifiedAt = DateTime.UtcNow;
        payment.UpdatedAt = DateTime.UtcNow;

        var invoice = payment.Invoice;
        if (invoice != null)
        {
            var otherCompleted = invoice.Payments.Where(p => p.PaymentId != payment.PaymentId && p.Status == "Completed" && !p.IsDeleted).Sum(p => p.Amount);
            var newTotalPaid = otherCompleted + payment.Amount;

            var oldStatus = invoice.Status;
            if (newTotalPaid >= invoice.TotalAmount)
            {
                invoice.Status = "Paid";
                invoice.PaidAt = DateTime.UtcNow;
            }
            else
            {
                invoice.Status = "PartiallyPaid";
            }
            invoice.PaymentMethod = payment.PaymentMethod;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _auditService.LogFieldChangeAsync(
                entityTypeId: 5,
                entityId: invoice.InvoiceId,
                fieldName: "Status",
                oldValue: oldStatus,
                newValue: invoice.Status,
                actionTypeName: "WireVerified",
                changedById: _currentUser.UserId ?? invoice.CreatedById
            );
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Bank wire transfer successfully verified and credited.",
            payment = MapToDto(payment)
        });
    }

    [HttpPost("{id:int}/refund")]
    public async Task<IActionResult> RefundPayment(int id, [FromBody] string? refundReason)
    {
        var payment = await _db.Payments
            .Include(p => p.Invoice)
                .ThenInclude(i => i.Payments)
            .FirstOrDefaultAsync(p => p.PaymentId == id && !p.IsDeleted);

        if (payment == null)
        {
            return NotFound(new { message = "Payment record not found." });
        }

        if (payment.Status == "Refunded")
        {
            return BadRequest(new { message = "Payment is already marked as Refunded." });
        }

        payment.Status = "Refunded";
        payment.Notes = string.IsNullOrWhiteSpace(payment.Notes)
            ? $"Refunded: {refundReason ?? "Customer requested refund"}"
            : $"{payment.Notes} | Refunded: {refundReason ?? "Customer requested refund"}";
        payment.UpdatedAt = DateTime.UtcNow;

        var invoice = payment.Invoice;
        if (invoice != null)
        {
            var remainingCompleted = invoice.Payments
                .Where(p => p.PaymentId != payment.PaymentId && p.Status == "Completed" && !p.IsDeleted)
                .Sum(p => p.Amount);

            if (remainingCompleted >= invoice.TotalAmount && invoice.TotalAmount > 0)
            {
                invoice.Status = "Paid";
            }
            else if (remainingCompleted > 0)
            {
                invoice.Status = "PartiallyPaid";
                invoice.PaidAt = null;
            }
            else
            {
                invoice.Status = "Sent";
                invoice.PaidAt = null;
            }
            invoice.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Payment refunded successfully.",
            payment = MapToDto(payment)
        });
    }

    private static PaymentReadDto MapToDto(Payment p)
    {
        var totalAmount = p.Invoice?.TotalAmount ?? p.Amount;
        var completedPayments = p.Invoice?.Payments?.Where(x => x.Status == "Completed" && !x.IsDeleted).ToList() ?? new List<Payment>();
        var amountPaid = completedPayments.Sum(x => x.Amount);
        var balanceDue = Math.Max(0m, totalAmount - amountPaid);

        return new PaymentReadDto
        {
            PaymentId = p.PaymentId,
            PaymentNumber = p.PaymentNumber,
            InvoiceId = p.InvoiceId,
            InvoiceNumber = p.Invoice?.InvoiceNumber ?? $"INV-{p.InvoiceId}",
            CustomerId = p.CustomerId,
            PayerName = p.Customer != null ? $"{p.Customer.FirstName} {p.Customer.LastName}".Trim() : "Customer",
            PayerEmail = p.Customer?.Email ?? "",
            PayerCompanyName = p.Customer?.Company?.Name,
            ReceiverName = "Enterprise CRM Solutions Inc.",
            ContractId = p.ContractId,
            ContractNumber = p.Contract?.ContractNumber,
            OpportunityId = p.OpportunityId,
            OpportunityTitle = p.Opportunity?.Title,
            Amount = p.Amount,
            Currency = p.Currency,
            InvoiceTotalAmount = totalAmount,
            InvoiceAmountPaid = amountPaid,
            InvoiceBalanceDue = balanceDue,
            PaymentMethod = p.PaymentMethod,
            Provider = p.PaymentMethod.Contains("Wire") ? "BankWire" : p.PaymentMethod.Contains("Cash") || p.PaymentMethod.Contains("Check") ? "Manual" : "Stripe",
            Status = p.Status,
            TransactionReference = p.TransactionReference,
            ReceiptUrl = p.ReceiptUrl,
            Notes = p.Notes,
            PaymentDate = p.PaymentDate,
            VerifiedById = p.VerifiedById,
            VerifiedByName = p.VerifiedBy?.Name,
            VerifiedAt = p.VerifiedAt,
            CreatedAt = p.CreatedAt
        };
    }
}
