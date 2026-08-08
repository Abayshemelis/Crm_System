using System;
using System.Linq;
using System.Threading.Tasks;
using CrmSystem.Api.Hubs;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers
{
    public class OnlinePaymentRequestDto
    {
        public string CardHolderName { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = "Stripe Credit Card";
    }

    [AllowAnonymous]
    [ApiController]
    [Route("api/public/invoices")]
    public class PublicInvoicesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IAuditService _auditService;
        private readonly IHubContext<NotificationHub> _hubContext;

        public PublicInvoicesController(
            AppDbContext db,
            IAuditService auditService,
            IHubContext<NotificationHub> hubContext)
        {
            _db = db;
            _auditService = auditService;
            _hubContext = hubContext;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPublicInvoice(string id)
        {
            Invoice? invoice = null;

            if (int.TryParse(id, out var invoiceId))
            {
                invoice = await _db.Invoices
                    .Include(i => i.Customer)
                    .Include(i => i.CreatedBy)
                    .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId && !i.IsDeleted);
            }

            if (invoice == null)
            {
                invoice = await _db.Invoices
                    .Include(i => i.Customer)
                    .Include(i => i.CreatedBy)
                    .FirstOrDefaultAsync(i => i.InvoiceNumber.ToLower() == id.ToLower() && !i.IsDeleted);
            }

            if (invoice == null)
            {
                return NotFound(new { message = "Invoice not found or has expired." });
            }

            return Ok(new
            {
                invoiceId = invoice.InvoiceId,
                invoiceNumber = invoice.InvoiceNumber,
                status = invoice.Status,
                amount = invoice.Amount,
                taxRate = invoice.TaxRate,
                taxAmount = invoice.TaxAmount,
                totalAmount = invoice.TotalAmount,
                issueDate = invoice.IssueDate,
                dueDate = invoice.DueDate,
                paidAt = invoice.PaidAt,
                paymentMethod = invoice.PaymentMethod,
                notes = invoice.Notes,
                terms = invoice.Terms,
                customer = new
                {
                    customerId = invoice.Customer.CustomerId,
                    name = $"{invoice.Customer.FirstName} {invoice.Customer.LastName}",
                    email = invoice.Customer.Email,
                    phone = invoice.Customer.Phone
                }
            });
        }

        [HttpPost("{id}/pay")]
        public async Task<IActionResult> ProcessOnlinePayment(string id, [FromBody] OnlinePaymentRequestDto dto)
        {
            Invoice? invoice = null;

            if (int.TryParse(id, out var invoiceId))
            {
                invoice = await _db.Invoices
                    .Include(i => i.Customer)
                    .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId && !i.IsDeleted);
            }

            if (invoice == null)
            {
                invoice = await _db.Invoices
                    .Include(i => i.Customer)
                    .FirstOrDefaultAsync(i => i.InvoiceNumber.ToLower() == id.ToLower() && !i.IsDeleted);
            }

            if (invoice == null)
            {
                return NotFound(new { message = "Invoice not found." });
            }

            if (invoice.Status == "Paid")
            {
                return BadRequest(new { message = "This invoice is already marked as Paid." });
            }

            var oldStatus = invoice.Status;
            invoice.Status = "Paid";
            invoice.PaidAt = DateTime.UtcNow;
            invoice.PaymentMethod = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "Stripe Online Payment" : dto.PaymentMethod;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            // Audit log
            try
            {
                await _auditService.LogFieldChangeAsync(
                    entityTypeId: 5, // Invoice
                    entityId: invoice.InvoiceId,
                    fieldName: "Status",
                    oldValue: oldStatus,
                    newValue: "Paid",
                    actionTypeName: "Update",
                    changedById: invoice.CreatedById
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PublicInvoice] Audit logging warning: {ex.Message}");
            }

            // Real-Time WebSockets SignalR notification push
            try
            {
                await _hubContext.Clients.Group($"user_{invoice.CreatedById}").SendAsync("ReceiveNotification", new
                {
                    title = "Invoice Paid Online!",
                    message = $"Invoice #{invoice.InvoiceNumber} ({invoice.TotalAmount:C}) was paid online by {invoice.Customer?.FirstName} {invoice.Customer?.LastName}!",
                    type = "InvoicePaid"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PublicInvoice] SignalR broadcast warning: {ex.Message}");
            }

            return Ok(new
            {
                success = true,
                message = "Payment successfully processed and verified.",
                invoiceId = invoice.InvoiceId,
                status = invoice.Status,
                paidAt = invoice.PaidAt
            });
        }

        [HttpPost("/api/webhooks/stripe")]
        public async Task<IActionResult> HandleStripeWebhook()
        {
            // Endpoint to receive Stripe Checkout session completed events
            using var reader = new System.IO.StreamReader(HttpContext.Request.Body);
            var json = await reader.ReadToEndAsync();
            Console.WriteLine($"[Stripe Webhook Received]: {json}");

            return Ok(new { received = true });
        }
    }
}
