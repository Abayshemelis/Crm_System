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
        [FromQuery] int? companyId,
        [FromQuery] string? status)
    {
        if (_currentUser.UserId == null) return Unauthorized();

        var query = _db.Invoices
            .Where(i => !i.IsDeleted)
            .Include(i => i.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(i => i.Customer)
                .ThenInclude(cust => cust.AssignedRep)
            .Include(i => i.Contract)
            .Include(i => i.Opportunity)
                .ThenInclude(opp => opp.Owner)
            .Include(i => i.CreatedBy)
            .Include(i => i.Payments)
            .AsNoTracking();

        // RBAC & IDOR scoped filtering:
        if (!_currentUser.IsAdmin)
        {
            var userId = _currentUser.UserId.Value;
            if (_currentUser.IsManagerOrAbove)
            {
                query = query.Where(i =>
                    i.CreatedById == userId ||
                    (i.Customer != null && (i.Customer.AssignedRepId == userId || (i.Customer.AssignedRep != null && i.Customer.AssignedRep.ManagerId == userId))) ||
                    (i.Opportunity != null && (i.Opportunity.OwnerId == userId || (i.Opportunity.Owner != null && i.Opportunity.Owner.ManagerId == userId)))
                );
            }
            else
            {
                query = query.Where(i =>
                    i.CreatedById == userId ||
                    (i.Customer != null && i.Customer.AssignedRepId == userId) ||
                    (i.Opportunity != null && i.Opportunity.OwnerId == userId)
                );
            }
        }

        if (customerId.HasValue)
            query = query.Where(i => i.CustomerId == customerId.Value);

        if (companyId.HasValue)
            query = query.Where(i => i.Customer != null && i.Customer.CompanyId == companyId.Value);

        if (opportunityId.HasValue)
            query = query.Where(i => i.OpportunityId == opportunityId.Value);

        if (contractId.HasValue)
            query = query.Where(i => i.ContractId == contractId.Value);

        var list = await query
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var dtoList = list.Select(MapToReadDto).ToList();

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            dtoList = dtoList.Where(i => i.Status.Equals(status, StringComparison.OrdinalIgnoreCase) || i.PaymentStatus.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return Ok(dtoList);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<InvoiceReadDto>> GetById(int id)
    {
        var invoice = await _db.Invoices
            .Where(i => !i.IsDeleted && i.InvoiceId == id)
            .Include(i => i.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(i => i.Customer)
                .ThenInclude(cust => cust.AssignedRep)
            .Include(i => i.Contract)
            .Include(i => i.Opportunity)
            .Include(i => i.CreatedBy)
            .Include(i => i.Payments)
            .AsNoTracking()
            .FirstOrDefaultAsync();

        if (invoice == null) return NotFound();

        if (!_currentUser.IsAdmin)
        {
            bool canAccess = _currentUser.CanAccessOwnedRecord(invoice.Customer?.AssignedRepId) ||
                             invoice.CreatedById == _currentUser.UserId ||
                             _currentUser.CanAccessOwnedRecord(invoice.Opportunity?.OwnerId);
            if (!canAccess) return Forbid();
        }

        return Ok(MapToReadDto(invoice));
    }

    [HttpPost]
    public async Task<ActionResult<InvoiceReadDto>> Create([FromBody] CreateInvoiceDto dto)
    {
        if (dto.CustomerId <= 0)
            return BadRequest(new { message = "Customer is required." });
        if (dto.Amount <= 0)
            return BadRequest(new { message = "Invoice amount must be greater than zero." });
        if (dto.TaxRate < 0 || dto.TaxRate > 100)
            return BadRequest(new { message = "Tax rate must be between 0% and 100%." });

        var customer = await _db.Customers.FindAsync(dto.CustomerId);
        if (customer == null || customer.IsDeleted)
            return BadRequest(new { message = "Invalid customer." });

        Contract? contract = null;
        if (dto.ContractId.HasValue && dto.ContractId.Value > 0)
        {
            contract = await _db.Contracts.FindAsync(dto.ContractId.Value);
            if (contract == null || contract.IsDeleted)
                return BadRequest(new { message = "Linked contract not found." });

            // Prevent duplicate invoices: If an active invoice already exists for this contract, update and return it.
            var existingContractInvoice = await _db.Invoices
                .Where(i => !i.IsDeleted && i.ContractId == dto.ContractId.Value && i.Status != "Cancelled" && i.Status != "Void")
                .Include(i => i.Customer)
                .Include(i => i.Contract)
                .Include(i => i.Opportunity)
                .Include(i => i.Payments)
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingContractInvoice != null)
            {
                if (existingContractInvoice.Status != "Paid")
                {
                    var existingTaxRate = dto.TaxRate >= 0 ? dto.TaxRate : existingContractInvoice.TaxRate;
                    existingContractInvoice.Amount = dto.Amount > 0 ? dto.Amount : existingContractInvoice.Amount;
                    existingContractInvoice.TaxRate = existingTaxRate;
                    existingContractInvoice.TaxAmount = Math.Round(existingContractInvoice.Amount * (existingTaxRate / 100m), 2);
                    existingContractInvoice.TotalAmount = existingContractInvoice.Amount + existingContractInvoice.TaxAmount;
                    if (dto.DueDate != default) existingContractInvoice.DueDate = dto.DueDate;
                    if (!string.IsNullOrWhiteSpace(dto.Notes)) existingContractInvoice.Notes = dto.Notes;
                    if (!string.IsNullOrWhiteSpace(dto.Terms)) existingContractInvoice.Terms = dto.Terms;
                    existingContractInvoice.OpportunityId = dto.OpportunityId ?? existingContractInvoice.OpportunityId;
                    existingContractInvoice.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                }
                return Ok(MapToReadDto(existingContractInvoice));
            }
        }

        Opportunity? opp = null;
        if (dto.OpportunityId.HasValue && dto.OpportunityId.Value > 0)
        {
            opp = await _db.Opportunities.FindAsync(dto.OpportunityId.Value);
            if (opp == null)
                return BadRequest(new { message = "Linked opportunity not found." });

            var existingOppInvoice = await _db.Invoices
                .Where(i => !i.IsDeleted && i.OpportunityId == dto.OpportunityId.Value && i.Status != "Cancelled" && i.Status != "Void")
                .Include(i => i.Customer)
                .Include(i => i.Contract)
                .Include(i => i.Opportunity)
                .Include(i => i.Payments)
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingOppInvoice != null)
            {
                if (dto.ContractId.HasValue && !existingOppInvoice.ContractId.HasValue)
                {
                    existingOppInvoice.ContractId = dto.ContractId.Value;
                }
                if (existingOppInvoice.Status != "Paid")
                {
                    var existingTaxRate = dto.TaxRate >= 0 ? dto.TaxRate : existingOppInvoice.TaxRate;
                    existingOppInvoice.Amount = dto.Amount > 0 ? dto.Amount : existingOppInvoice.Amount;
                    existingOppInvoice.TaxRate = existingTaxRate;
                    existingOppInvoice.TaxAmount = Math.Round(existingOppInvoice.Amount * (existingTaxRate / 100m), 2);
                    existingOppInvoice.TotalAmount = existingOppInvoice.Amount + existingOppInvoice.TaxAmount;
                    if (dto.DueDate != default) existingOppInvoice.DueDate = dto.DueDate;
                    if (!string.IsNullOrWhiteSpace(dto.Notes)) existingOppInvoice.Notes = dto.Notes;
                    if (!string.IsNullOrWhiteSpace(dto.Terms)) existingOppInvoice.Terms = dto.Terms;
                    existingOppInvoice.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                }
                return Ok(MapToReadDto(existingOppInvoice));
            }
        }

        // Generate unique invoice number: INV-YYYYMMDD-XXXX
        var datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
        var countToday = await _db.Invoices.CountAsync(i => i.InvoiceNumber.StartsWith($"INV-{datePrefix}"));
        var invoiceNumber = $"INV-{datePrefix}-{(countToday + 1):D4}";

        var taxRateCalc = dto.TaxRate >= 0 ? dto.TaxRate : 0m;
        var taxAmountCalc = Math.Round(dto.Amount * (taxRateCalc / 100m), 2);
        var totalAmountCalc = dto.Amount + taxAmountCalc;

        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber,
            CustomerId = dto.CustomerId,
            ContractId = dto.ContractId,
            OpportunityId = dto.OpportunityId,
            Amount = dto.Amount,
            TaxRate = taxRateCalc,
            TaxAmount = taxAmountCalc,
            TotalAmount = totalAmountCalc,
            Status = "Draft",
            IssueDate = dto.IssueDate != default ? dto.IssueDate : DateTime.UtcNow,
            DueDate = dto.DueDate != default ? dto.DueDate : DateTime.UtcNow.AddDays(30),
            Notes = dto.Notes,
            Terms = dto.Terms ?? "Payment due within 30 days of issue date.",
            CreatedById = _currentUser.UserId ?? 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = invoice.InvoiceId }, MapToReadDto(invoice));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInvoiceDto dto)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Opportunity)
            .FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);

        if (invoice == null) return NotFound();

        if (!_currentUser.IsAdmin)
        {
            bool canAccess = _currentUser.CanAccessOwnedRecord(invoice.Customer?.AssignedRepId) ||
                             invoice.CreatedById == _currentUser.UserId ||
                             _currentUser.CanAccessOwnedRecord(invoice.Opportunity?.OwnerId);
            if (!canAccess) return Forbid();
        }

        if (invoice.Status == "Paid")
            return BadRequest(new { message = "Paid and settled invoices cannot be edited." });

        if (dto.Amount <= 0)
            return BadRequest(new { message = "Invoice amount must be greater than zero." });
        if (dto.TaxRate < 0 || dto.TaxRate > 100)
            return BadRequest(new { message = "Tax rate must be between 0% and 100%." });

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
        if (dto.ContractId.HasValue) invoice.ContractId = dto.ContractId.Value > 0 ? dto.ContractId.Value : null;
        if (dto.OpportunityId.HasValue) invoice.OpportunityId = dto.OpportunityId.Value > 0 ? dto.OpportunityId.Value : null;
        if (dto.Notes != null) invoice.Notes = dto.Notes;
        if (dto.Terms != null) invoice.Terms = dto.Terms;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Sends an official payment request link via email to the Customer (Payer).
    /// </summary>
    [HttpPost("{id:int}/send-payment-request")]
    public async Task<IActionResult> SendPaymentRequest(int id, [FromBody] SendPaymentRequestDto? dto)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Opportunity)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);

        if (invoice == null) return NotFound();

        if (!_currentUser.IsAdmin)
        {
            bool canAccess = _currentUser.CanAccessOwnedRecord(invoice.Customer?.AssignedRepId) ||
                             invoice.CreatedById == _currentUser.UserId ||
                             _currentUser.CanAccessOwnedRecord(invoice.Opportunity?.OwnerId);
            if (!canAccess) return Forbid();
        }

        if (invoice.Customer == null || string.IsNullOrWhiteSpace(invoice.Customer.Email))
            return BadRequest(new { message = "Customer has no valid email address to receive payment link." });

        var completedPaid = invoice.Payments?.Where(p => !p.IsDeleted && p.Status == "Completed").Sum(p => p.Amount) ?? 0m;
        var balanceDue = Math.Max(0m, invoice.TotalAmount - completedPaid);

        if (balanceDue <= 0 && invoice.Status == "Paid")
            return BadRequest(new { message = "Invoice is already fully paid and settled." });

        // Update status from Draft to Sent
        if (invoice.Status == "Draft")
        {
            invoice.Status = "Sent";
        }

        var origin = Request.Headers["Origin"].ToString();
        if (string.IsNullOrWhiteSpace(origin))
        {
            origin = $"{Request.Scheme}://{Request.Host}";
        }

        var payUrl = $"{origin}/invoices/pay/{invoice.InvoiceNumber}";
        bool emailSent = false;
        string? emailError = null;

        // Send Email to Customer
        try
        {
            var custName = $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim();
            var emailHtml = _templateService.BuildInvoicePaymentRequestHtml(
                custName,
                invoice.InvoiceNumber,
                invoice.TotalAmount,
                balanceDue,
                invoice.DueDate,
                payUrl,
                dto?.CustomMessage
            );

            await _emailSender.SendEmailAsync(
                invoice.Customer.Email,
                $"Payment Request: Invoice #{invoice.InvoiceNumber} (${balanceDue:N2} due)",
                emailHtml
            );
            emailSent = true;
        }
        catch (Exception ex)
        {
            emailError = ex.Message;
            Console.WriteLine($"[Email] Failed to send payment request email to {invoice.Customer.Email}: {ex.Message}");
        }

        return Ok(new
        {
            emailSent,
            message = emailSent
                ? $"Payment request email successfully delivered to {invoice.Customer.Email}."
                : $"Payment portal link generated. (Email notice: {emailError ?? "SMTP credentials not configured"}).",
            paymentUrl = payUrl,
            balanceDue,
            emailError
        });
    }

    /// <summary>
    /// Internal CRM user records an offline or bank transfer payment received from the customer.
    /// Creates a verified Payment entity with Company as Receiver and Customer as Payer.
    /// </summary>
    [HttpPost("{id:int}/pay")]
    public async Task<IActionResult> RecordPayment(int id, [FromBody] PayInvoiceDto dto)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Opportunity)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);

        if (invoice == null) return NotFound();

        if (!_currentUser.IsAdmin)
        {
            bool canAccess = _currentUser.CanAccessOwnedRecord(invoice.Customer?.AssignedRepId) ||
                             invoice.CreatedById == _currentUser.UserId ||
                             _currentUser.CanAccessOwnedRecord(invoice.Opportunity?.OwnerId);
            if (!canAccess) return Forbid();
        }

        var completedPaid = invoice.Payments?.Where(p => !p.IsDeleted && p.Status == "Completed").Sum(p => p.Amount) ?? 0m;
        var balanceDue = Math.Max(0m, invoice.TotalAmount - completedPaid);

        if (balanceDue <= 0)
            return BadRequest(new { message = "This invoice is already fully settled ($0 balance remaining)." });

        var paymentAmount = dto.Amount.HasValue && dto.Amount.Value > 0 ? dto.Amount.Value : balanceDue;
        if (paymentAmount > balanceDue)
            return BadRequest(new { message = $"Payment amount (${paymentAmount:N2}) exceeds remaining balance (${balanceDue:N2})." });

        // Generate Payment Number: PAY-YYYYMMDD-XXXX
        var datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
        var countToday = await _db.Payments.CountAsync(p => p.PaymentNumber.StartsWith($"PAY-{datePrefix}"));
        var paymentNumber = $"PAY-{datePrefix}-{(countToday + 1):D4}";

        var currentUserId = _currentUser.UserId ?? 1;
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
            Amount = paymentAmount,
            Currency = "USD",
            PaymentMethod = paymentMethodName,
            Status = "Completed",
            TransactionReference = dto.TransactionReference ?? $"MANUAL-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            Notes = dto.Notes,
            PaymentDate = paymentDate,
            VerifiedById = currentUserId,
            VerifiedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Payments.Add(payment);

        var newTotalPaid = completedPaid + paymentAmount;
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

        // Send Payment Receipt Email to Customer
        try
        {
            if (invoice.Customer != null && !string.IsNullOrWhiteSpace(invoice.Customer.Email))
            {
                var custName = $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim();
                var html = _templateService.BuildInvoicePaymentReceiptHtml(
                    custName,
                    invoice.InvoiceNumber,
                    paymentAmount,
                    payment.PaymentDate,
                    paymentMethodName
                );
                await _emailSender.SendEmailAsync(
                    invoice.Customer.Email,
                    $"Payment Receipt for Invoice #{invoice.InvoiceNumber} - ${paymentAmount:N2}",
                    html
                );
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Email] Could not send payment receipt email: {ex.Message}");
        }

        // Send in-app notification to invoice creator
        try
        {
            var custName = invoice.Customer != null ? $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim() : "Customer";
            var msg = $"💳 Payment of ${paymentAmount:N2} received for Invoice #{invoice.InvoiceNumber} ({custName}) via {paymentMethodName}. Remaining Balance: ${(invoice.TotalAmount - newTotalPaid):N2}.";
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

        return Ok(new
        {
            message = $"Payment of ${paymentAmount:N2} recorded successfully.",
            paymentNumber,
            invoiceStatus = invoice.Status,
            amountPaid = newTotalPaid,
            balanceDue = Math.Max(0m, invoice.TotalAmount - newTotalPaid)
        });
    }

    [HttpPost("{id:int}/stripe-checkout")]
    public async Task<IActionResult> GenerateStripeCheckout(int id, [FromQuery] string successUrl, [FromQuery] string cancelUrl)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Opportunity)
            .FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);
        if (invoice == null) return NotFound();

        if (invoice.Status == "Paid")
            return BadRequest(new { message = "Invoice is already fully paid." });

        if (string.IsNullOrWhiteSpace(successUrl) || string.IsNullOrWhiteSpace(cancelUrl))
            return BadRequest(new { message = "successUrl and cancelUrl are required." });

        try
        {
            var paymentUrl = await _stripePaymentService.CreateCheckoutSessionAsync(invoice, successUrl, cancelUrl);
            invoice.StripeSessionId = "session_created";
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
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId.Value && !i.IsDeleted);
        if (invoice == null) return NotFound(new { message = "Invoice not found." });

        if (invoice.Status != "Paid")
        {
            // Record Payment Entity
            var datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
            var countToday = await _db.Payments.CountAsync(p => p.PaymentNumber.StartsWith($"PAY-{datePrefix}"));
            var paymentNumber = $"PAY-{datePrefix}-{(countToday + 1):D4}";

            var completedPaid = invoice.Payments?.Where(p => !p.IsDeleted && p.Status == "Completed").Sum(p => p.Amount) ?? 0m;
            var balanceDue = Math.Max(0m, invoice.TotalAmount - completedPaid);
            var payAmount = balanceDue > 0 ? balanceDue : invoice.TotalAmount;

            var payment = new Payment
            {
                PaymentNumber = paymentNumber,
                InvoiceId = invoice.InvoiceId,
                CustomerId = invoice.CustomerId,
                ContractId = invoice.ContractId,
                OpportunityId = invoice.OpportunityId,
                Amount = payAmount,
                Currency = "USD",
                PaymentMethod = "Stripe Credit Card",
                Status = "Completed",
                TransactionReference = sessionId,
                PaymentDate = DateTime.UtcNow,
                VerifiedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Payments.Add(payment);

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
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);
        if (invoice == null) return NotFound(new { message = "Invoice not found." });

        if (invoice.Status == "Paid")
            return Ok(new { message = "Invoice is already marked as Paid.", status = "Paid" });

        var isPaid = await _stripePaymentService.CheckInvoicePaidInStripeAsync(invoice);
        if (isPaid)
        {
            var datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
            var countToday = await _db.Payments.CountAsync(p => p.PaymentNumber.StartsWith($"PAY-{datePrefix}"));
            var paymentNumber = $"PAY-{datePrefix}-{(countToday + 1):D4}";

            var completedPaid = invoice.Payments?.Where(p => !p.IsDeleted && p.Status == "Completed").Sum(p => p.Amount) ?? 0m;
            var balanceDue = Math.Max(0m, invoice.TotalAmount - completedPaid);
            var payAmount = balanceDue > 0 ? balanceDue : invoice.TotalAmount;

            var payment = new Payment
            {
                PaymentNumber = paymentNumber,
                InvoiceId = invoice.InvoiceId,
                CustomerId = invoice.CustomerId,
                ContractId = invoice.ContractId,
                OpportunityId = invoice.OpportunityId,
                Amount = payAmount,
                Currency = "USD",
                PaymentMethod = "Stripe Credit Card",
                Status = "Completed",
                TransactionReference = invoice.StripeSessionId ?? $"STRIPE-SYNC-{invoice.InvoiceNumber}",
                PaymentDate = DateTime.UtcNow,
                VerifiedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Payments.Add(payment);

            invoice.Status = "Paid";
            invoice.PaidAt = DateTime.UtcNow;
            invoice.PaymentMethod = "Stripe Credit Card";
            invoice.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

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
                var invoice = await _db.Invoices.Include(i => i.Payments).FirstOrDefaultAsync(i => i.InvoiceId == invoiceId.Value && !i.IsDeleted);
                if (invoice != null && invoice.Status != "Paid")
                {
                    var datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
                    var countToday = await _db.Payments.CountAsync(p => p.PaymentNumber.StartsWith($"PAY-{datePrefix}"));
                    var paymentNumber = $"PAY-{datePrefix}-{(countToday + 1):D4}";

                    var completedPaid = invoice.Payments?.Where(p => !p.IsDeleted && p.Status == "Completed").Sum(p => p.Amount) ?? 0m;
                    var balanceDue = Math.Max(0m, invoice.TotalAmount - completedPaid);
                    var payAmount = balanceDue > 0 ? balanceDue : invoice.TotalAmount;

                    var payment = new Payment
                    {
                        PaymentNumber = paymentNumber,
                        InvoiceId = invoice.InvoiceId,
                        CustomerId = invoice.CustomerId,
                        ContractId = invoice.ContractId,
                        OpportunityId = invoice.OpportunityId,
                        Amount = payAmount,
                        Currency = "USD",
                        PaymentMethod = "Stripe Credit Card",
                        Status = "Completed",
                        PaymentDate = DateTime.UtcNow,
                        VerifiedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _db.Payments.Add(payment);

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

    [HttpPost("{id:int}/sync-pricing")]
    public async Task<ActionResult<InvoiceReadDto>> SyncPricing(int id)
    {
        if (_currentUser.UserId == null) return Unauthorized();

        var invoice = await _db.Invoices
            .Include(i => i.Customer)
                .ThenInclude(c => c.Company)
            .Include(i => i.Contract)
            .Include(i => i.Opportunity)
                .ThenInclude(opp => opp!.LineItems)
                    .ThenInclude(li => li.Product)
            .Include(i => i.CreatedBy)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);

        if (invoice == null) return NotFound(new { message = "Invoice not found." });

        if (!_currentUser.IsAdmin)
        {
            bool canAccess = _currentUser.CanAccessOwnedRecord(invoice.Customer?.AssignedRepId) ||
                             invoice.CreatedById == _currentUser.UserId ||
                             _currentUser.CanAccessOwnedRecord(invoice.Opportunity?.OwnerId);
            if (!canAccess) return Forbid();
        }

        var oldAmount = invoice.Amount;
        decimal newAmount = oldAmount;

        if (invoice.Opportunity != null)
        {
            // Sync line items against product catalog
            int updatedCount = 0;
            foreach (var item in invoice.Opportunity.LineItems)
            {
                if (item.Product != null && item.UnitPrice != item.Product.Price)
                {
                    item.UnitPrice = item.Product.Price;
                    updatedCount++;
                }
            }

            if (invoice.Opportunity.LineItems.Any())
            {
                var calculatedTotal = invoice.Opportunity.LineItems
                    .Sum(li => li.Quantity * li.UnitPrice * (1 - li.DiscountPercent / 100m));
                invoice.Opportunity.EstimatedValue = calculatedTotal;
                invoice.Opportunity.UpdatedAt = DateTime.UtcNow;
                newAmount = calculatedTotal;
            }
            else
            {
                newAmount = invoice.Opportunity.EstimatedValue;
            }
        }
        else if (invoice.Contract != null && invoice.Contract.ContractValue > 0)
        {
            newAmount = invoice.Contract.ContractValue;
        }

        invoice.Amount = newAmount;
        invoice.TaxAmount = invoice.Amount * (invoice.TaxRate / 100m);
        invoice.TotalAmount = invoice.Amount + invoice.TaxAmount;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Invoice");
        if (entityType != null && oldAmount != invoice.Amount)
        {
            var changes = new List<(string Field, string? OldValue, string? NewValue)>
            {
                ("Amount", oldAmount.ToString("F2"), invoice.Amount.ToString("F2")),
                ("TotalAmount", (oldAmount + (oldAmount * invoice.TaxRate / 100m)).ToString("F2"), invoice.TotalAmount.ToString("F2"))
            };
            await _auditService.LogFieldChangesAsync(entityType.EntityTypeId, invoice.InvoiceId, changes, "Update", _currentUser.UserId.Value);
        }

        return Ok(MapToReadDto(invoice));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Opportunity)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.InvoiceId == id && !i.IsDeleted);
        if (invoice == null) return NotFound();

        if (!_currentUser.IsAdmin)
        {
            bool canAccess = _currentUser.CanAccessOwnedRecord(invoice.Customer?.AssignedRepId) ||
                             invoice.CreatedById == _currentUser.UserId ||
                             _currentUser.CanAccessOwnedRecord(invoice.Opportunity?.OwnerId);
            if (!canAccess) return Forbid();
        }

        invoice.IsDeleted = true;
        invoice.UpdatedAt = DateTime.UtcNow;

        if (invoice.Payments != null)
        {
            foreach (var p in invoice.Payments)
            {
                p.IsDeleted = true;
                p.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static InvoiceReadDto MapToReadDto(Invoice i)
    {
        var completedPayments = i.Payments != null 
            ? i.Payments.Where(p => !p.IsDeleted && string.Equals(p.Status, "Completed", StringComparison.OrdinalIgnoreCase)).ToList() 
            : new List<Payment>();

        var pendingWires = i.Payments != null
            ? i.Payments.Where(p => !p.IsDeleted && string.Equals(p.Status, "PendingVerification", StringComparison.OrdinalIgnoreCase)).ToList()
            : new List<Payment>();

        var amountPaid = completedPayments.Sum(p => p.Amount);
        var balanceDue = Math.Max(0m, i.TotalAmount - amountPaid);

        var status = i.Status;
        var paymentStatus = "Unpaid";

        if (amountPaid >= i.TotalAmount && i.TotalAmount > 0)
        {
            status = "Paid";
            paymentStatus = "Paid";
        }
        else if (pendingWires.Any())
        {
            status = "PendingVerification";
            paymentStatus = "PendingVerification";
        }
        else if (amountPaid > 0)
        {
            status = "PartiallyPaid";
            paymentStatus = "PartiallyPaid";
        }
        else if (!string.Equals(status, "Paid", StringComparison.OrdinalIgnoreCase) &&
                 !string.Equals(status, "Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            if (i.DueDate.Date < DateTime.UtcNow.Date)
            {
                status = "Overdue";
                paymentStatus = "Overdue";
            }
            else if (string.Equals(status, "Overdue", StringComparison.OrdinalIgnoreCase))
            {
                status = "Sent";
                paymentStatus = "Unpaid";
            }
            else
            {
                paymentStatus = status == "Draft" ? "Draft" : "Unpaid";
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
            AmountPaid = amountPaid,
            BalanceDue = balanceDue,
            Status = status,
            PaymentStatus = paymentStatus,
            PaymentCount = (i.Payments?.Count(p => !p.IsDeleted) ?? 0),
            IssueDate = i.IssueDate,
            DueDate = i.DueDate,
            PaidAt = i.PaidAt,
            PaymentMethod = i.PaymentMethod,
            PaymentUrl = $"/invoices/pay/{i.InvoiceNumber}",
            Notes = i.Notes,
            Terms = i.Terms,
            CreatedById = i.CreatedById,
            CreatedByName = i.CreatedBy?.Name ?? string.Empty,
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt,
        };
    }
}
