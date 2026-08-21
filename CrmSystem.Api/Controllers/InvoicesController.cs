using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Invoice;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RepOrAbove")]
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;
    private readonly IEmailSender _emailSender;
    private readonly IEmailTemplateService _templateService;
    private readonly INotificationService _notificationService;
    private readonly IStripePaymentService _stripePaymentService;

    public InvoicesController(
        AppDbContext db,
        ICurrentUserService currentUser,
        IAuditService auditService,
        IEmailSender emailSender,
        IEmailTemplateService templateService,
        INotificationService notificationService,
        IStripePaymentService stripePaymentService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
        _emailSender = emailSender;
        _templateService = templateService;
        _notificationService = notificationService;
        _stripePaymentService = stripePaymentService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InvoiceReadDto>>> GetAll(
        [FromQuery] int? customerId,
        [FromQuery] int? opportunityId,
        [FromQuery] int? contractId,
        [FromQuery] string? status)
    {
        var query = _db.Invoices
            .Where(i => !i.IsDeleted)
            .Include(i => i.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(i => i.Contract)
            .Include(i => i.Opportunity)
            .Include(i => i.CreatedBy)
            .AsNoTracking();

        if (customerId.HasValue)
            query = query.Where(i => i.CustomerId == customerId.Value);

        if (opportunityId.HasValue)
            query = query.Where(i => i.OpportunityId == opportunityId.Value);

        if (contractId.HasValue)
            query = query.Where(i => i.ContractId == contractId.Value);

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            query = query.Where(i => i.Status.ToLower() == status.ToLower());

        var list = await query
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => MapToReadDto(i))
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<InvoiceReadDto>> GetById(int id)
    {
        var invoice = await _db.Invoices
            .Where(i => !i.IsDeleted && i.InvoiceId == id)
            .Include(i => i.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(i => i.Contract)
            .Include(i => i.Opportunity)
            .Include(i => i.CreatedBy)
            .AsNoTracking()
            .FirstOrDefaultAsync();

        if (invoice == null) return NotFound();
        return Ok(MapToReadDto(invoice));
    }

    [HttpPost]
    public async Task<ActionResult<InvoiceReadDto>> Create([FromBody] CreateInvoiceDto dto)
    {
        var customer = await _db.Customers.FindAsync(dto.CustomerId);
        if (customer == null || customer.IsDeleted)
            return BadRequest(new { message = "Invalid customer." });

        Contract? contract = null;
        if (dto.ContractId.HasValue)
        {
            contract = await _db.Contracts.FindAsync(dto.ContractId.Value);
            if (contract == null || contract.IsDeleted)
                return BadRequest(new { message = "Linked contract not found." });

            // Prevent duplicate invoices: If an active invoice already exists for this contract, return it immediately.
            var existingContractInvoice = await _db.Invoices
                .Where(i => !i.IsDeleted && i.ContractId == dto.ContractId.Value && i.Status != "Cancelled")
                .Include(i => i.Customer)
                    .ThenInclude(cust => cust.Company)
                .Include(i => i.Contract)
                .Include(i => i.Opportunity)
                .Include(i => i.CreatedBy)
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingContractInvoice != null)
            {
                return Ok(MapToReadDto(existingContractInvoice));
            }
        }

        Opportunity? opp = null;
        if (dto.OpportunityId.HasValue)
        {
            opp = await _db.Opportunities.FindAsync(dto.OpportunityId.Value);
            if (opp == null)
                return BadRequest(new { message = "Linked opportunity not found." });

            if (!dto.ContractId.HasValue)
            {
                var existingOppInvoice = await _db.Invoices
                    .Where(i => !i.IsDeleted && i.OpportunityId == dto.OpportunityId.Value && i.ContractId == null && i.Status != "Cancelled")
                    .Include(i => i.Customer)
                        .ThenInclude(cust => cust.Company)
                    .Include(i => i.Contract)
                    .Include(i => i.Opportunity)
                    .Include(i => i.CreatedBy)
                    .OrderByDescending(i => i.CreatedAt)
                    .FirstOrDefaultAsync();

                if (existingOppInvoice != null)
                {
                    return Ok(MapToReadDto(existingOppInvoice));
                }
            }
        }

        var userId = _currentUser.UserId ?? 1;
        var countToday = await _db.Invoices.CountAsync(i => i.CreatedAt.Date == DateTime.UtcNow.Date);
        var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{(countToday + 1):D4}";

        var taxRate = dto.TaxRate >= 0 ? dto.TaxRate : 0m;
        var taxAmount = Math.Round(dto.Amount * (taxRate / 100m), 2);
        var totalAmount = dto.Amount + taxAmount;

        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber,
            CustomerId = dto.CustomerId,
            ContractId = dto.ContractId,
            OpportunityId = dto.OpportunityId,
            Amount = dto.Amount,
            TaxRate = taxRate,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            Status = "Sent",
            IssueDate = dto.IssueDate,
            DueDate = dto.DueDate,
            Notes = dto.Notes,
            Terms = dto.Terms,
            CreatedById = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        var created = await _db.Invoices
            .Where(i => i.InvoiceId == invoice.InvoiceId)
            .Include(i => i.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(i => i.Contract)
            .Include(i => i.Opportunity)
            .Include(i => i.CreatedBy)
            .FirstAsync();

        // Send Invoice Issued Email to Customer
        try
        {
            if (created.Customer != null && !string.IsNullOrWhiteSpace(created.Customer.Email))
            {
                var custName = $"{created.Customer.FirstName} {created.Customer.LastName}".Trim();
                var html = _templateService.BuildInvoiceIssuedHtml(
                    custName,
                    created.InvoiceNumber,
                    created.Amount,
                    created.TotalAmount,
                    created.IssueDate,
                    created.DueDate,
                    created.Contract?.ContractNumber
                );
                await _emailSender.SendEmailAsync(
                    created.Customer.Email,
                    $"New Invoice Issued #{created.InvoiceNumber}",
                    html
                );
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Email] Could not send invoice email: {ex.Message}");
        }

        return CreatedAtAction(nameof(GetById), new { id = invoice.InvoiceId }, MapToReadDto(created));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInvoiceDto dto)
    {
        var invoice = await _db.Invoices.FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);
        if (invoice == null) return NotFound();

        if (invoice.Status == "Paid")
            return BadRequest(new { message = "Paid invoices cannot be edited." });

        var taxRate = dto.TaxRate >= 0 ? dto.TaxRate : 0m;
        var taxAmount = Math.Round(dto.Amount * (taxRate / 100m), 2);
        var totalAmount = dto.Amount + taxAmount;

        invoice.Amount = dto.Amount;
        invoice.TaxRate = taxRate;
        invoice.TaxAmount = taxAmount;
        invoice.TotalAmount = totalAmount;
        invoice.Status = dto.Status;
        invoice.IssueDate = dto.IssueDate;
        invoice.DueDate = dto.DueDate;
        invoice.PaymentMethod = dto.PaymentMethod;
        if (dto.Notes != null) invoice.Notes = dto.Notes;
        if (dto.Terms != null) invoice.Terms = dto.Terms;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id:int}/pay")]
    public async Task<IActionResult> RecordPayment(int id, [FromBody] PayInvoiceDto dto)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);

        if (invoice == null) return NotFound();

        invoice.Status = "Paid";
        invoice.PaidAt = DateTime.UtcNow;
        invoice.PaymentMethod = dto.PaymentMethod ?? "Bank Transfer";
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            invoice.Notes = (invoice.Notes ?? "") + $"\nPayment Note: {dto.Notes}";
        invoice.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Send Payment Receipt Email to Customer
        try
        {
            if (invoice.Customer != null && !string.IsNullOrWhiteSpace(invoice.Customer.Email))
            {
                var custName = $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim();
                var html = _templateService.BuildInvoicePaymentReceiptHtml(
                    custName,
                    invoice.InvoiceNumber,
                    invoice.TotalAmount,
                    invoice.PaidAt.Value,
                    invoice.PaymentMethod
                );
                await _emailSender.SendEmailAsync(
                    invoice.Customer.Email,
                    $"Payment Receipt for Invoice #{invoice.InvoiceNumber}",
                    html
                );
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Email] Could not send payment receipt email: {ex.Message}");
        }

        // Send in-app notification to creator
        try
        {
            var custName = invoice.Customer != null ? $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim() : "Customer";
            var msg = $"💳 Payment of ${invoice.TotalAmount:N2} received for Invoice #{invoice.InvoiceNumber} ({custName}) via {invoice.PaymentMethod}.";
            await _notificationService.CreateNotificationAsync(
                invoice.CreatedById,
                "TaskDue",
                msg,
                opportunityId: invoice.OpportunityId
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[InAppNotification] Error creating payment notification: {ex.Message}");
        }

        return NoContent();
    }

    [HttpPost("{id:int}/stripe-checkout")]
    public async Task<IActionResult> GenerateStripeCheckout(int id, [FromQuery] string successUrl, [FromQuery] string cancelUrl)
    {
        var invoice = await _db.Invoices.FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);
        if (invoice == null) return NotFound();

        if (invoice.Status == "Paid")
            return BadRequest(new { message = "Invoice is already paid." });

        if (string.IsNullOrWhiteSpace(successUrl) || string.IsNullOrWhiteSpace(cancelUrl))
            return BadRequest(new { message = "successUrl and cancelUrl are required." });

        try
        {
            var paymentUrl = await _stripePaymentService.CreateCheckoutSessionAsync(invoice, successUrl, cancelUrl);
            invoice.StripeSessionId = "session_created"; // We can't get the actual ID easily without changing the return type of CreateCheckoutSessionAsync, but URL is enough
            invoice.PaymentUrl = paymentUrl;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new { url = paymentUrl });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Could not generate Stripe payment link.", error = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("verify-stripe-session")]
    public async Task<IActionResult> VerifyStripeSession([FromQuery] string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
            return BadRequest(new { message = "sessionId is required." });

        var invoiceId = await _stripePaymentService.VerifyCheckoutSessionAsync(sessionId);
        if (invoiceId is null)
        {
            return BadRequest(new { message = "Payment session could not be verified or is unpaid." });
        }

        var invoice = await _db.Invoices
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId.Value && !i.IsDeleted);
        if (invoice == null) return NotFound(new { message = "Invoice not found." });

        if (invoice.Status != "Paid")
        {
            invoice.Status = "Paid";
            invoice.PaidAt = DateTime.UtcNow;
            invoice.PaymentMethod = "Stripe Credit Card";
            invoice.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Send Payment Receipt Email to Customer
            try
            {
                if (invoice.Customer != null && !string.IsNullOrWhiteSpace(invoice.Customer.Email))
                {
                    var custName = $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim();
                    var html = _templateService.BuildInvoicePaymentReceiptHtml(
                        custName,
                        invoice.InvoiceNumber,
                        invoice.TotalAmount,
                        invoice.PaidAt.Value,
                        invoice.PaymentMethod
                    );
                    await _emailSender.SendEmailAsync(
                        invoice.Customer.Email,
                        $"Payment Receipt for Invoice #{invoice.InvoiceNumber}",
                        html
                    );
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Email] Could not send payment receipt email: {ex.Message}");
            }

            try
            {
                var msg = $"💳 Payment of ${invoice.TotalAmount:N2} received for Invoice #{invoice.InvoiceNumber} via Stripe.";
                await _notificationService.CreateNotificationAsync(
                    invoice.CreatedById,
                    "TaskDue",
                    msg,
                    opportunityId: invoice.OpportunityId
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Notification] Error creating payment notification: {ex.Message}");
            }
        }

        return Ok(new { message = "Payment verified successfully.", invoiceId = invoice.InvoiceId, invoiceNumber = invoice.InvoiceNumber });
    }

    [HttpPost("{id:int}/sync-stripe")]
    public async Task<IActionResult> SyncStripePayment(int id)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);
        if (invoice == null) return NotFound(new { message = "Invoice not found." });

        if (invoice.Status == "Paid")
            return Ok(new { message = "Invoice is already marked as Paid.", status = "Paid" });

        var isPaid = await _stripePaymentService.CheckInvoicePaidInStripeAsync(invoice);
        if (isPaid)
        {
            invoice.Status = "Paid";
            invoice.PaidAt = DateTime.UtcNow;
            invoice.PaymentMethod = "Stripe Credit Card";
            invoice.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Send Payment Receipt Email to Customer
            try
            {
                if (invoice.Customer != null && !string.IsNullOrWhiteSpace(invoice.Customer.Email))
                {
                    var custName = $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim();
                    var html = _templateService.BuildInvoicePaymentReceiptHtml(
                        custName,
                        invoice.InvoiceNumber,
                        invoice.TotalAmount,
                        invoice.PaidAt.Value,
                        invoice.PaymentMethod
                    );
                    await _emailSender.SendEmailAsync(
                        invoice.Customer.Email,
                        $"Payment Receipt for Invoice #{invoice.InvoiceNumber}",
                        html
                    );
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Email] Could not send payment receipt email: {ex.Message}");
            }

            try
            {
                var msg = $"💳 Payment of ${invoice.TotalAmount:N2} confirmed via Stripe sync for Invoice #{invoice.InvoiceNumber}.";
                await _notificationService.CreateNotificationAsync(
                    invoice.CreatedById,
                    "TaskDue",
                    msg,
                    opportunityId: invoice.OpportunityId
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Notification] Error creating payment notification: {ex.Message}");
            }

            return Ok(new { message = $"Stripe confirmed payment! Invoice #{invoice.InvoiceNumber} is now marked as Paid & Settled.", status = "Paid" });
        }

        return Ok(new { message = "No completed payment session was found in Stripe for this invoice yet.", status = invoice.Status });
    }

    [AllowAnonymous]
    [HttpPost("webhook")]
    public async Task<IActionResult> StripeWebhook()
    {
        var json = await new System.IO.StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        var signature = Request.Headers["Stripe-Signature"].ToString();

        try
        {
            var invoiceId = await _stripePaymentService.ProcessWebhookEventAsync(json, signature);
            if (invoiceId.HasValue)
            {
                var invoice = await _db.Invoices.FirstOrDefaultAsync(i => i.InvoiceId == invoiceId.Value && !i.IsDeleted);
                if (invoice != null && invoice.Status != "Paid")
                {
                    invoice.Status = "Paid";
                    invoice.PaidAt = DateTime.UtcNow;
                    invoice.PaymentMethod = "Stripe Credit Card";
                    invoice.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                }
            }
            return Ok();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Stripe Webhook Error: {ex.Message}");
            return BadRequest();
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var invoice = await _db.Invoices.FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);
        if (invoice == null) return NotFound();

        invoice.IsDeleted = true;
        invoice.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static InvoiceReadDto MapToReadDto(Invoice i)
    {
        var status = i.Status;
        if (!string.Equals(status, "Paid", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(status, "Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            if (i.DueDate.Date < DateTime.UtcNow.Date)
            {
                status = "Overdue";
            }
            else if (string.Equals(status, "Overdue", StringComparison.OrdinalIgnoreCase))
            {
                status = "Sent";
            }
        }

        return new InvoiceReadDto
        {
            InvoiceId = i.InvoiceId,
            InvoiceNumber = i.InvoiceNumber,
            CustomerId = i.CustomerId,
            CustomerName = i.Customer != null ? $"{i.Customer.FirstName} {i.Customer.LastName}".Trim() : string.Empty,
            CustomerEmail = i.Customer?.Email ?? string.Empty,
            CompanyName = i.Customer?.Company?.Name,
            ContractId = i.ContractId,
            ContractNumber = i.Contract?.ContractNumber,
            ContractTitle = i.Contract?.Title,
            OpportunityId = i.OpportunityId,
            OpportunityTitle = i.Opportunity?.Title,
            Amount = i.Amount,
            TaxRate = i.TaxRate,
            TaxAmount = i.TaxAmount,
            TotalAmount = i.TotalAmount,
            Status = status,
            IssueDate = i.IssueDate,
            DueDate = i.DueDate,
            PaidAt = i.PaidAt,
            PaymentMethod = i.PaymentMethod,
            Notes = i.Notes,
            Terms = i.Terms,
            CreatedById = i.CreatedById,
            CreatedByName = i.CreatedBy?.Name ?? string.Empty,
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt,
        };
    }
}
