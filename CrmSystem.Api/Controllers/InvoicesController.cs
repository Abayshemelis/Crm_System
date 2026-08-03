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

    public InvoicesController(
        AppDbContext db,
        ICurrentUserService currentUser,
        IAuditService auditService,
        IEmailSender emailSender,
        IEmailTemplateService templateService,
        INotificationService notificationService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
        _emailSender = emailSender;
        _templateService = templateService;
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InvoiceReadDto>>> GetAll(
        [FromQuery] int? customerId,
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
        }

        Opportunity? opp = null;
        if (dto.OpportunityId.HasValue)
        {
            opp = await _db.Opportunities.FindAsync(dto.OpportunityId.Value);
            if (opp == null)
                return BadRequest(new { message = "Linked opportunity not found." });
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
            Status = i.Status,
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
