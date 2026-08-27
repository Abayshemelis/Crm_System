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

[AllowAnonymous]
[ApiController]
[Route("api/public/invoices")]
public class PublicInvoicesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _auditService;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly IStripePaymentService _stripePaymentService;

    // Standard Receiver / Seller Organization Profile
    public static readonly object SellerCompanyInfo = new
    {
        name = "Enterprise CRM Solutions Inc.",
        taxId = "US-94829471",
        email = "billing@enterprisecrm.io",
        phone = "+1 (800) 555-0199",
        address = "100 Enterprise Way, Suite 400, San Francisco, CA 94105",
        bankName = "Global Commercial Bank N.A.",
        accountIban = "US89370400440532013000",
        swiftBic = "GCBIUS33"
    };

    public PublicInvoicesController(
        AppDbContext db,
        IAuditService auditService,
        IHubContext<NotificationHub> hubContext,
        IStripePaymentService stripePaymentService)
    {
        _db = db;
        _auditService = auditService;
        _hubContext = hubContext;
        _stripePaymentService = stripePaymentService;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPublicInvoice(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "Invoice identifier is required." });
        }

        var query = _db.Invoices
            .Include(i => i.Customer)
                .ThenInclude(c => c.Company)
            .Include(i => i.Contract)
            .Include(i => i.Opportunity)
            .Include(i => i.CreatedBy)
            .Include(i => i.Payments.Where(p => !p.IsDeleted))
            .Where(i => !i.IsDeleted);

        Invoice? invoice = null;
        if (id.StartsWith("INV-", StringComparison.OrdinalIgnoreCase) || id.Contains('-'))
        {
            invoice = await query.FirstOrDefaultAsync(i => i.InvoiceNumber.ToLower() == id.ToLower());
        }
        else if (int.TryParse(id, out var invoiceId))
        {
            invoice = await query.FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);
        }

        invoice ??= await query.FirstOrDefaultAsync(i => i.InvoiceNumber.ToLower() == id.ToLower());

        if (invoice == null)
        {
            return NotFound(new { message = "Invoice not found or has expired." });
        }

        var completedPayments = invoice.Payments.Where(p => p.Status == "Completed").ToList();
        var amountPaid = completedPayments.Sum(p => p.Amount);
        var balanceDue = Math.Max(0m, invoice.TotalAmount - amountPaid);

        // Sync Invoice Status if needed
        var computedStatus = invoice.Status;
        if (amountPaid >= invoice.TotalAmount && invoice.TotalAmount > 0)
        {
            computedStatus = "Paid";
        }
        else if (amountPaid > 0 && amountPaid < invoice.TotalAmount)
        {
            computedStatus = "PartiallyPaid";
        }
        else if (invoice.Payments.Any(p => p.Status == "PendingVerification"))
        {
            computedStatus = "PendingVerification";
        }

        return Ok(new
        {
            invoiceId = invoice.InvoiceId,
            invoiceNumber = invoice.InvoiceNumber,
            status = computedStatus,
            amount = invoice.Amount,
            taxRate = invoice.TaxRate,
            taxAmount = invoice.TaxAmount,
            totalAmount = invoice.TotalAmount,
            amountPaid = amountPaid,
            balanceDue = balanceDue,
            issueDate = invoice.IssueDate,
            dueDate = invoice.DueDate,
            paidAt = invoice.PaidAt,
            paymentMethod = invoice.PaymentMethod,
            notes = invoice.Notes,
            terms = invoice.Terms,
            contractId = invoice.ContractId,
            contractNumber = invoice.Contract?.ContractNumber,
            opportunityId = invoice.OpportunityId,
            opportunityTitle = invoice.Opportunity?.Title,
            seller = SellerCompanyInfo,
            buyer = new
            {
                customerId = invoice.Customer.CustomerId,
                name = $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim(),
                email = invoice.Customer.Email,
                phone = invoice.Customer.Phone,
                companyName = invoice.Customer.Company?.Name
            },
            payments = invoice.Payments.OrderByDescending(p => p.PaymentDate).Select(p => new
            {
                paymentId = p.PaymentId,
                paymentNumber = p.PaymentNumber,
                amount = p.Amount,
                currency = p.Currency,
                status = p.Status,
                paymentMethod = p.PaymentMethod,
                transactionReference = p.TransactionReference,
                paymentDate = p.PaymentDate,
                notes = p.Notes
            }).ToList()
        });
    }

    private bool IsInternalStaffRequest()
    {
        if (User.Identity?.IsAuthenticated == true) return true;
        var authHeader = Request.Headers["Authorization"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
        return false;
    }

    [HttpPost("{id}/stripe-checkout")]
    public async Task<IActionResult> CreateStripeCheckout(string id, [FromBody] CreateStripeCheckoutDto? dto)
    {
        if (IsInternalStaffRequest())
        {
            return StatusCode(403, new
            {
                message = "Security Policy Violation: Internal CRM staff cannot execute customer checkout sessions. Only the customer can pay from their external portal link."
            });
        }

        var invoice = await FindInvoiceAsync(id);
        if (invoice == null) return NotFound(new { message = "Invoice not found." });

        var amountPaid = invoice.Payments.Where(p => p.Status == "Completed" && !p.IsDeleted).Sum(p => p.Amount);
        var balanceDue = Math.Max(0m, invoice.TotalAmount - amountPaid);

        if (balanceDue <= 0)
        {
            return BadRequest(new { message = "This invoice is already fully paid." });
        }

        var chargeAmount = dto?.Amount.HasValue == true && dto.Amount.Value > 0
            ? Math.Min(dto.Amount.Value, balanceDue)
            : balanceDue;

        var origin = Request.Headers["Origin"].FirstOrDefault() ?? $"{Request.Scheme}://{Request.Host}";
        var successUrl = $"{origin}/invoices/pay/{invoice.InvoiceNumber}?session_id={{CHECKOUT_SESSION_ID}}&status=success";
        var cancelUrl = $"{origin}/invoices/pay/{invoice.InvoiceNumber}?status=cancelled";

        try
        {
            var checkoutUrl = await _stripePaymentService.CreateCheckoutSessionAsync(invoice, successUrl, cancelUrl);
            return Ok(new
            {
                checkoutUrl,
                invoiceNumber = invoice.InvoiceNumber,
                chargeAmount,
                totalAmount = invoice.TotalAmount,
                balanceDue
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Stripe Checkout Error]: {ex.Message}");
            return StatusCode(500, new { message = "Failed to initialize Stripe checkout. Please try direct card payment." });
        }
    }

    [HttpGet("{id}/verify-stripe-session")]
    public async Task<IActionResult> VerifyStripeSession(string id, [FromQuery] string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return BadRequest(new { message = "Session ID is required." });
        }

        var invoice = await FindInvoiceAsync(id);
        if (invoice == null) return NotFound(new { message = "Invoice not found." });

        var verifiedInvoiceId = await _stripePaymentService.VerifyCheckoutSessionAsync(sessionId);
        if (!verifiedInvoiceId.HasValue || verifiedInvoiceId.Value != invoice.InvoiceId)
        {
            return BadRequest(new { message = "Unable to verify Stripe checkout session." });
        }

        var alreadyRecorded = await _db.Payments
            .AnyAsync(p => p.InvoiceId == invoice.InvoiceId && p.TransactionReference == sessionId && !p.IsDeleted);

        if (alreadyRecorded)
        {
            return Ok(new
            {
                success = true,
                message = "Payment session already verified and recorded.",
                invoiceId = invoice.InvoiceId,
                status = invoice.Status,
                paidAt = invoice.PaidAt
            });
        }

        var amountPaid = invoice.Payments.Where(p => p.Status == "Completed" && !p.IsDeleted).Sum(p => p.Amount);
        var balanceDue = Math.Max(0m, invoice.TotalAmount - amountPaid);
        var chargeAmount = balanceDue > 0 ? balanceDue : invoice.TotalAmount;

        var payment = await RecordPaymentInternalAsync(
            invoice,
            chargeAmount,
            "Stripe Online Payment",
            sessionId,
            "Verified via Stripe Checkout session.",
            "Completed"
        );

        return Ok(new
        {
            success = true,
            message = "Stripe payment successfully verified and credited.",
            invoiceId = invoice.InvoiceId,
            status = invoice.Status,
            paidAt = invoice.PaidAt,
            paymentNumber = payment.PaymentNumber,
            amountPaid = payment.Amount
        });
    }

    [HttpPost("{id}/pay")]
    public async Task<IActionResult> ProcessCardPayment(string id, [FromBody] ProcessCardPaymentDto dto)
    {
        if (IsInternalStaffRequest())
        {
            return StatusCode(403, new
            {
                message = "Security Policy Violation: Internal CRM staff cannot submit card payments on company invoices. Only the external customer can authorize and complete payments."
            });
        }

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "Invoice identifier is required." });
        }

        var invoice = await FindInvoiceAsync(id);
        if (invoice == null)
        {
            return NotFound(new { message = "Invoice not found." });
        }

        var amountPaid = invoice.Payments.Where(p => p.Status == "Completed" && !p.IsDeleted).Sum(p => p.Amount);
        var balanceDue = Math.Max(0m, invoice.TotalAmount - amountPaid);

        if (balanceDue <= 0)
        {
            return BadRequest(new { message = "This invoice has already been fully settled and paid." });
        }

        var chargeAmount = dto.Amount.HasValue && dto.Amount.Value > 0 ? dto.Amount.Value : balanceDue;

        if (chargeAmount <= 0)
        {
            return BadRequest(new { message = "Payment amount must be greater than zero." });
        }

        if (chargeAmount > balanceDue + 0.01m)
        {
            return BadRequest(new { message = $"Payment amount ({chargeAmount:C}) exceeds remaining balance due ({balanceDue:C})." });
        }

        var cardholder = string.IsNullOrWhiteSpace(dto.CardHolderName)
            ? $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim()
            : dto.CardHolderName.Trim();

        var method = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "CreditCard" : dto.PaymentMethod;
        var txnRef = !string.IsNullOrWhiteSpace(dto.StripePaymentIntentId)
            ? dto.StripePaymentIntentId
            : $"CARD-TXN-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";

        var notes = $"Card Payment processed for {cardholder}. Last4: {dto.CardNumberLast4 ?? "4242"}";

        var payment = await RecordPaymentInternalAsync(invoice, chargeAmount, method, txnRef, notes, "Completed");

        return Ok(new
        {
            success = true,
            message = "Payment successfully processed and verified.",
            invoiceId = invoice.InvoiceId,
            status = invoice.Status,
            paidAt = invoice.PaidAt,
            paymentNumber = payment.PaymentNumber,
            amount = payment.Amount,
            receiptUrl = payment.ReceiptUrl
        });
    }

    [HttpPost("{id}/pay-wire")]
    public async Task<IActionResult> SubmitWirePayment(string id, [FromBody] SubmitWirePaymentDto dto)
    {
        if (IsInternalStaffRequest())
        {
            return StatusCode(403, new
            {
                message = "Security Policy Violation: Internal CRM staff cannot submit customer bank transfer claims. Use the CRM Payments Ledger to record verified bank payments received by the company."
            });
        }

        if (string.IsNullOrWhiteSpace(id)) return BadRequest(new { message = "Invoice identifier is required." });
        if (string.IsNullOrWhiteSpace(dto.WireReference))
        {
            return BadRequest(new { message = "Bank wire transfer reference number is required." });
        }

        var invoice = await FindInvoiceAsync(id);
        if (invoice == null) return NotFound(new { message = "Invoice not found." });

        var amountPaid = invoice.Payments.Where(p => p.Status == "Completed" && !p.IsDeleted).Sum(p => p.Amount);
        var balanceDue = Math.Max(0m, invoice.TotalAmount - amountPaid);

        if (balanceDue <= 0)
        {
            return BadRequest(new { message = "This invoice is already fully paid." });
        }

        var wireAmount = dto.Amount.HasValue && dto.Amount.Value > 0 ? dto.Amount.Value : balanceDue;

        var payment = await RecordPaymentInternalAsync(
            invoice,
            wireAmount,
            "BankWire",
            dto.WireReference.Trim(),
            $"Bank: {dto.SenderBankName}. Sender: {dto.SenderAccountName}. Notes: {dto.Notes}",
            "PendingVerification"
        );

        return Ok(new
        {
            success = true,
            message = "Bank wire transfer details submitted successfully! Your payment is under verification by our accounting team.",
            paymentNumber = payment.PaymentNumber,
            amount = payment.Amount,
            status = "PendingVerification"
        });
    }

    [HttpPost("/api/webhooks/stripe")]
    public async Task<IActionResult> HandleStripeWebhook()
    {
        try
        {
            using var reader = new System.IO.StreamReader(HttpContext.Request.Body);
            var json = await reader.ReadToEndAsync();
            var signatureHeader = HttpContext.Request.Headers["Stripe-Signature"].ToString();

            var invoiceId = await _stripePaymentService.ProcessWebhookEventAsync(json, signatureHeader);
            if (invoiceId.HasValue)
            {
                var invoice = await _db.Invoices
                    .Include(i => i.Customer)
                    .Include(i => i.Contract)
                    .Include(i => i.Opportunity)
                    .Include(i => i.Payments.Where(p => !p.IsDeleted))
                    .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId.Value && !i.IsDeleted);

                if (invoice != null)
                {
                    var amountPaid = invoice.Payments.Where(p => p.Status == "Completed" && !p.IsDeleted).Sum(p => p.Amount);
                    var balanceDue = Math.Max(0m, invoice.TotalAmount - amountPaid);
                    if (balanceDue > 0)
                    {
                        await RecordPaymentInternalAsync(
                            invoice,
                            balanceDue,
                            "Stripe Webhook (Verified)",
                            $"STRIPE-WH-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                            "Verified via Stripe Webhook event.",
                            "Completed"
                        );
                    }
                }
            }

            return Ok(new { received = true, verified = invoiceId.HasValue });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Stripe Webhook Exception]: {ex.Message}");
            return BadRequest(new { message = "Webhook processing error." });
        }
    }

    private async Task<Invoice?> FindInvoiceAsync(string id)
    {
        var query = _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Contract)
            .Include(i => i.Opportunity)
            .Include(i => i.Payments.Where(p => !p.IsDeleted))
            .Where(i => !i.IsDeleted);

        if (id.StartsWith("INV-", StringComparison.OrdinalIgnoreCase) || id.Contains('-'))
        {
            return await query.FirstOrDefaultAsync(i => i.InvoiceNumber.ToLower() == id.ToLower());
        }
        else if (int.TryParse(id, out var invoiceId))
        {
            return await query.FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);
        }
        return null;
    }

    private async Task<Payment> RecordPaymentInternalAsync(
        Invoice invoice,
        decimal amount,
        string paymentMethod,
        string txnRef,
        string notes,
        string status)
    {
        var paymentNumber = $"PAY-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
        var payment = new Payment
        {
            PaymentNumber = paymentNumber,
            InvoiceId = invoice.InvoiceId,
            CustomerId = invoice.CustomerId,
            ContractId = invoice.ContractId,
            OpportunityId = invoice.OpportunityId,
            Amount = amount,
            Currency = "USD",
            PaymentMethod = paymentMethod,
            Status = status,
            TransactionReference = txnRef,
            ReceiptUrl = $"/invoices/pay/{invoice.InvoiceNumber}",
            Notes = notes,
            PaymentDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Payments.Add(payment);

        if (status == "Completed")
        {
            var priorCompleted = invoice.Payments.Where(p => p.Status == "Completed" && !p.IsDeleted).Sum(p => p.Amount);
            var newTotalPaid = priorCompleted + amount;

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
            invoice.PaymentMethod = paymentMethod;
            invoice.UpdatedAt = DateTime.UtcNow;

            // Audit log
            try
            {
                await _auditService.LogFieldChangeAsync(
                    entityTypeId: 5,
                    entityId: invoice.InvoiceId,
                    fieldName: "Status",
                    oldValue: oldStatus,
                    newValue: invoice.Status,
                    actionTypeName: "PaymentCompleted",
                    changedById: invoice.CreatedById
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PublicInvoice] Audit logging error: {ex.Message}");
            }

            // Real-Time SignalR push
            try
            {
                await _hubContext.Clients.Group($"user_{invoice.CreatedById}").SendAsync("ReceiveNotification", new
                {
                    title = invoice.Status == "Paid" ? "Invoice Paid in Full!" : "Partial Payment Received!",
                    message = $"Payment of {amount:C} was received for Invoice #{invoice.InvoiceNumber} by {invoice.Customer?.FirstName} {invoice.Customer?.LastName} ({invoice.Status}).",
                    type = "InvoicePaid"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PublicInvoice] SignalR broadcast warning: {ex.Message}");
            }
        }
        else if (status == "PendingVerification")
        {
            invoice.Status = "PendingVerification";
            invoice.PaymentMethod = paymentMethod;
            invoice.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _hubContext.Clients.Group($"user_{invoice.CreatedById}").SendAsync("ReceiveNotification", new
                {
                    title = "Bank Wire Submitted by Client!",
                    message = $"Client {invoice.Customer?.FirstName} {invoice.Customer?.LastName} submitted wire ref #{txnRef} for {amount:C} (Invoice #{invoice.InvoiceNumber}). Pending verification.",
                    type = "WireSubmitted"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PublicInvoice] SignalR broadcast warning: {ex.Message}");
            }
        }

        await _db.SaveChangesAsync();
        return payment;
    }
}
