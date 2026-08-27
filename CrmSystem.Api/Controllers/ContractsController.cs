using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Contract;
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
public class ContractsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;
    private readonly IEmailSender _emailSender;
    private readonly IEmailTemplateService _templateService;

    public ContractsController(
        AppDbContext db,
        ICurrentUserService currentUser,
        IAuditService auditService,
        IEmailSender emailSender,
        IEmailTemplateService templateService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
        _emailSender = emailSender;
        _templateService = templateService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ContractReadDto>>> GetAll(
        [FromQuery] int? customerId,
        [FromQuery] int? opportunityId,
        [FromQuery] int? companyId,
        [FromQuery] string? status,
        [FromQuery] string scope = "company")
    {
        var query = _db.Contracts
            .Where(c => !c.IsDeleted)
            .Include(c => c.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(c => c.Customer)
                .ThenInclude(cust => cust.AssignedRep)
            .Include(c => c.Opportunity)
                .ThenInclude(opp => opp.Owner)
            .Include(c => c.CreatedBy)
            .AsQueryable();

        if (_currentUser.UserId == null)
        {
            return Unauthorized();
        }

        var userId = _currentUser.UserId.Value;

        // Role-based authorization & visibility:
        if (!_currentUser.IsAdmin)
        {
            if (_currentUser.IsManagerOrAbove)
            {
                if (scope == "personal")
                {
                    query = query.Where(c =>
                        c.CreatedById == userId ||
                        (c.Customer != null && c.Customer.AssignedRepId == userId) ||
                        (c.Opportunity != null && c.Opportunity.OwnerId == userId)
                    );
                }
                else
                {
                    // Managers see their own contracts + contracts of sales reps they manage
                    query = query.Where(c =>
                        c.CreatedById == userId ||
                        (c.Customer != null && (c.Customer.AssignedRepId == userId || (c.Customer.AssignedRep != null && c.Customer.AssignedRep.ManagerId == userId))) ||
                        (c.Opportunity != null && (c.Opportunity.OwnerId == userId || (c.Opportunity.Owner != null && c.Opportunity.Owner.ManagerId == userId)))
                    );
                }
            }
            else
            {
                // Sales Representatives strictly see ONLY contracts they created or are assigned to
                query = query.Where(c =>
                    c.CreatedById == userId ||
                    (c.Customer != null && c.Customer.AssignedRepId == userId) ||
                    (c.Opportunity != null && c.Opportunity.OwnerId == userId)
                );
            }
        }
        else if (scope == "personal")
        {
            // Admin explicitly viewing "My Contracts"
            query = query.Where(c =>
                c.CreatedById == userId ||
                (c.Customer != null && c.Customer.AssignedRepId == userId) ||
                (c.Opportunity != null && c.Opportunity.OwnerId == userId)
            );
        }

        if (customerId.HasValue)
            query = query.Where(c => c.CustomerId == customerId.Value);

        if (companyId.HasValue)
            query = query.Where(c => c.Customer != null && c.Customer.CompanyId == companyId.Value);

        if (opportunityId.HasValue)
            query = query.Where(c => c.OpportunityId == opportunityId.Value);

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            if (status.Equals("Draft", StringComparison.OrdinalIgnoreCase))
                query = query.Where(c => c.Status == "Draft" || c.Status == "SentForSignature");
            else if (status.Equals("Signed", StringComparison.OrdinalIgnoreCase))
                query = query.Where(c => c.Status == "Signed" || c.Status == "Active");
            else
                query = query.Where(c => c.Status == status);
        }

        var list = await query
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        bool hasChanges = false;
        foreach (var item in list)
        {
            if (string.IsNullOrEmpty(item.SigningToken))
            {
                item.SigningToken = Guid.NewGuid().ToString("N");
                hasChanges = true;
            }
        }
        if (hasChanges) await _db.SaveChangesAsync();

        var contractIds = list.Select(c => c.ContractId).ToList();
        var invoices = await _db.Invoices
            .Where(i => !i.IsDeleted && i.ContractId.HasValue && contractIds.Contains(i.ContractId.Value))
            .Include(i => i.Payments)
            .ToListAsync();
        var invoiceMap = invoices
            .GroupBy(i => i.ContractId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(i => i.CreatedAt).First());

        var dtos = list.Select(c => MapToReadDto(c, invoiceMap.TryGetValue(c.ContractId, out var inv) ? inv : null)).ToList();
        return Ok(dtos);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ContractReadDto>> GetById(int id)
    {
        var contract = await _db.Contracts
            .Where(c => !c.IsDeleted && c.ContractId == id)
            .Include(c => c.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(c => c.Opportunity)
            .Include(c => c.CreatedBy)
            .FirstOrDefaultAsync();

        if (contract == null)
            return NotFound(new { message = "Contract not found." });

        if (string.IsNullOrEmpty(contract.SigningToken))
        {
            contract.SigningToken = Guid.NewGuid().ToString("N");
            await _db.SaveChangesAsync();
        }

        var invoice = await _db.Invoices
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.ContractId == id && !i.IsDeleted);

        return Ok(MapToReadDto(contract, invoice));
    }

    [HttpPost]
    public async Task<ActionResult<ContractReadDto>> Create([FromBody] CreateContractDto dto)
    {
        if (!_currentUser.UserId.HasValue)
            return Unauthorized();

        if (dto.CustomerId <= 0)
            return BadRequest(new { message = "Customer is required." });
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Contract title is required." });
        if (dto.ContractValue < 0)
            return BadRequest(new { message = "Contract value cannot be negative." });
        if (dto.EndDate.Date < dto.StartDate.Date)
            return BadRequest(new { message = "End Date cannot be earlier than Start Date." });

        var userId = _currentUser.UserId.Value;

        var customer = await _db.Customers.FindAsync(dto.CustomerId);
        if (customer == null)
            return BadRequest(new { message = "Invalid Customer ID." });

        // Check if an existing contract is already linked to this Opportunity/Deal to prevent duplicates and reuse it
        if (dto.OpportunityId.HasValue && dto.OpportunityId.Value > 0)
        {
            var existingContract = await _db.Contracts
                .Where(c => !c.IsDeleted && c.OpportunityId == dto.OpportunityId.Value)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingContract != null)
            {
                // Reuse and update the existing contract
                if (!string.IsNullOrWhiteSpace(dto.Title))
                    existingContract.Title = dto.Title.Trim();

                if (dto.ContractValue > 0 || existingContract.ContractValue <= 0)
                    existingContract.ContractValue = dto.ContractValue;

                existingContract.StartDate = dto.StartDate;
                existingContract.EndDate = dto.EndDate;

                if (!string.IsNullOrWhiteSpace(dto.TermsAndConditions))
                    existingContract.TermsAndConditions = dto.TermsAndConditions;

                if (!string.IsNullOrWhiteSpace(dto.Notes))
                    existingContract.Notes = dto.Notes;

                existingContract.CustomerId = dto.CustomerId;
                existingContract.UpdatedAt = DateTime.UtcNow;

                if (string.IsNullOrEmpty(existingContract.SigningToken))
                {
                    existingContract.SigningToken = Guid.NewGuid().ToString("N");
                    existingContract.TokenExpiresAt = DateTime.UtcNow.AddDays(90);
                }

                await _db.SaveChangesAsync();
                return Ok(MapToReadDto(existingContract));
            }
        }

        var contractNumber = $"CTR-{DateTime.UtcNow:yyyyMM}-{String.Format("{0:D5}", await _db.Contracts.CountAsync() + 1)}";

        var contract = new Contract
        {
            ContractNumber = contractNumber,
            CustomerId = dto.CustomerId,
            OpportunityId = dto.OpportunityId,
            Title = dto.Title,
            ContractValue = dto.ContractValue,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Status = "Draft",
            SigningToken = Guid.NewGuid().ToString("N"),
            TokenExpiresAt = DateTime.UtcNow.AddDays(90),
            TermsAndConditions = dto.TermsAndConditions ?? "Standard commercial terms apply. Payment Net 30 days.",
            Notes = dto.Notes,
            CreatedById = _currentUser.UserId ?? 1,
            CreatedAt = DateTime.UtcNow
        };

        _db.Contracts.Add(contract);
        await _db.SaveChangesAsync();

        var created = await _db.Contracts
            .Include(c => c.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(c => c.Opportunity)
            .Include(c => c.CreatedBy)
            .FirstAsync(c => c.ContractId == contract.ContractId);

        return CreatedAtAction(nameof(GetById), new { id = contract.ContractId }, MapToReadDto(created));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateContractDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Contract title is required." });
        if (dto.ContractValue < 0)
            return BadRequest(new { message = "Contract value cannot be negative." });
        if (dto.EndDate.Date < dto.StartDate.Date)
            return BadRequest(new { message = "End Date cannot be earlier than Start Date." });

        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.ContractId == id && !c.IsDeleted);
        if (contract == null)
            return NotFound(new { message = "Contract not found." });

        contract.Title = dto.Title;
        contract.ContractValue = dto.ContractValue;
        contract.StartDate = dto.StartDate;
        contract.EndDate = dto.EndDate;
        contract.Status = dto.Status;
        contract.OpportunityId = dto.OpportunityId;   // allow re-linking a deal
        if (dto.TermsAndConditions != null) contract.TermsAndConditions = dto.TermsAndConditions;
        if (dto.Notes != null) contract.Notes = dto.Notes;
        if (string.IsNullOrEmpty(contract.SigningToken)) contract.SigningToken = Guid.NewGuid().ToString("N");
        contract.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/sign")]
    public async Task<IActionResult> SignContract(int id, [FromBody] SignContractDto dto)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.ContractId == id && !c.IsDeleted);
        if (contract == null)
            return NotFound(new { message = "Contract not found." });

        if (string.IsNullOrWhiteSpace(dto.SignatureDataUrl))
            return BadRequest(new { message = "Signature image data is required." });

        var isCustomer = string.Equals(dto.SignerRole, "Customer", StringComparison.OrdinalIgnoreCase);

        if (isCustomer)
        {
            contract.CustomerSignatureDataUrl = dto.SignatureDataUrl;
            contract.CustomerSignedByName = string.IsNullOrWhiteSpace(dto.SignedByName) ? "Customer Signatory" : dto.SignedByName;
            contract.CustomerSignedAt = DateTime.UtcNow;
            contract.SignatureDataUrl = dto.SignatureDataUrl;
            contract.SignedByName = contract.CustomerSignedByName;
            contract.SignedAt = contract.CustomerSignedAt;
        }
        else
        {
            contract.CompanySignatureDataUrl = dto.SignatureDataUrl;
            contract.CompanySignedByName = string.IsNullOrWhiteSpace(dto.SignedByName) ? "Company Representative" : dto.SignedByName;
            contract.CompanySignedAt = DateTime.UtcNow;
        }

        // Determine contract status based on dual signature state
        var hasCompanySign = !string.IsNullOrEmpty(contract.CompanySignatureDataUrl);
        var hasCustomerSign = !string.IsNullOrEmpty(contract.CustomerSignatureDataUrl);

        if (hasCompanySign && hasCustomerSign)
        {
            contract.Status = "Signed"; // Fully executed by both parties
            contract.SignedAt ??= DateTime.UtcNow;
        }
        else if (hasCompanySign)
        {
            contract.Status = "PendingCustomer";
        }
        else if (hasCustomerSign)
        {
            contract.Status = "PendingSeller";
        }

        contract.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = hasCompanySign && hasCustomerSign 
                ? "Contract is now fully signed and executed by both parties!" 
                : isCustomer 
                    ? "Customer signature recorded. Awaiting company signature." 
                    : "Company signature recorded. Awaiting customer signature.",
            status = contract.Status,
            isFullySigned = hasCompanySign && hasCustomerSign
        });
    }

    [HttpPost("{id:int}/send-email")]
    public async Task<IActionResult> SendSigningEmail(int id, [FromBody] SendContractEmailRequest? req = null)
    {
        var contract = await _db.Contracts
            .Include(c => c.Customer)
            .FirstOrDefaultAsync(c => c.ContractId == id && !c.IsDeleted);

        if (contract == null)
            return NotFound(new { message = "Contract not found." });

        var recipientEmail = !string.IsNullOrWhiteSpace(req?.RecipientEmail) 
            ? req.RecipientEmail.Trim() 
            : contract.Customer?.Email?.Trim();

        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            return BadRequest(new { message = "No recipient email address found. Please enter an email address for the customer." });
        }

        if (contract.Customer != null && !string.IsNullOrWhiteSpace(req?.RecipientEmail) && contract.Customer.Email != req.RecipientEmail.Trim())
        {
            contract.Customer.Email = req.RecipientEmail.Trim();
        }

        if (string.IsNullOrEmpty(contract.SigningToken))
        {
            contract.SigningToken = Guid.NewGuid().ToString("N");
            await _db.SaveChangesAsync();
        }

        // Determine client frontend origin dynamically (handles localhost:5173 & ngrok tunnels)
        string? origin = Request.Headers["Origin"].FirstOrDefault();
        if (string.IsNullOrEmpty(origin) && Request.Headers.TryGetValue("Referer", out var refererHeader))
        {
            var refStr = refererHeader.FirstOrDefault();
            if (Uri.TryCreate(refStr, UriKind.Absolute, out var refUri))
            {
                origin = $"{refUri.Scheme}://{refUri.Authority}";
            }
        }
        if (string.IsNullOrEmpty(origin) || origin.Contains(":5072"))
        {
            origin = "http://localhost:5173";
        }

        var signUrl = $"{origin}/sign/contract/{contract.SigningToken}";
        var custName = contract.Customer != null 
            ? $"{contract.Customer.FirstName} {contract.Customer.LastName}".Trim()
            : "Valued Client";

        var html = _templateService.BuildContractSigningRequestHtml(
            custName,
            contract.Title,
            contract.ContractNumber,
            contract.ContractValue,
            signUrl,
            contract.TokenExpiresAt ?? DateTime.UtcNow.AddDays(90)
        );

        bool emailSent = false;
        string? emailWarning = null;

        try
        {
            await _emailSender.SendEmailAsync(
                recipientEmail,
                $"Contract Signature Request: {contract.Title} ({contract.ContractNumber})",
                html
            );
            emailSent = true;
        }
        catch (Exception ex)
        {
            emailWarning = ex.Message;
            Console.WriteLine($"[ContractsController] SMTP delivery warning to {recipientEmail}: {ex.Message}");
        }

        if (contract.Status == "Draft")
        {
            contract.Status = !string.IsNullOrEmpty(contract.CompanySignatureDataUrl) ? "PendingCustomer" : "SentForSignature";
        }
        contract.UpdatedAt = DateTime.UtcNow;

        // Log an Activity to the CRM timeline so reps can track that the contract email was sent
        try
        {
            var emailType = await _db.ActivityTypes.FirstOrDefaultAsync(at => at.Name.ToLower() == "email")
                ?? await _db.ActivityTypes.FirstOrDefaultAsync();

            var currentUserId = _currentUser.UserId ?? contract.CreatedById;
            var activity = new Activity
            {
                ActivityTypeId = emailType?.ActivityTypeId ?? 2,
                Subject = $"[Contract Email Sent] E-Sign Request: {contract.Title} ({contract.ContractNumber})",
                Description = $"Sent to: {recipientEmail}\nStatus: {(emailSent ? "Dispatched successfully via SMTP" : $"Failed ({emailWarning})")}\nSigning Link: {signUrl}",
                ActivityDate = DateTime.UtcNow,
                CustomerId = contract.CustomerId,
                OpportunityId = contract.OpportunityId,
                CreatedById = currentUserId,
                CreatedAt = DateTime.UtcNow
            };
            _db.Activities.Add(activity);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ContractsController] Note: Could not record timeline activity: {ex.Message}");
        }

        await _db.SaveChangesAsync();

        if (!emailSent && emailWarning != null)
        {
            return Ok(new { 
                success = false, 
                signUrl,
                warning = emailWarning,
                message = $"Failed to dispatch email to {recipientEmail} ({emailWarning}). You can copy and share the direct e-sign link: {signUrl}" 
            });
        }

        return Ok(new { 
            success = true, 
            signUrl,
            message = $"Contract signing invitation successfully emailed to {recipientEmail}!" 
        });
    }

    [HttpPost("{id:int}/generate-invoice")]
    public async Task<ActionResult> GenerateInvoiceForContract(int id)
    {
        var contract = await _db.Contracts
            .Include(c => c.Customer)
            .FirstOrDefaultAsync(c => c.ContractId == id && !c.IsDeleted);

        if (contract == null) return NotFound(new { message = "Contract not found." });

        var existingInvoice = await _db.Invoices
            .FirstOrDefaultAsync(i => i.ContractId == id && !i.IsDeleted);

        if (existingInvoice != null)
        {
            return Ok(new
            {
                message = "Invoice already exists for this contract.",
                invoiceId = existingInvoice.InvoiceId,
                invoiceNumber = existingInvoice.InvoiceNumber,
                status = existingInvoice.Status,
                totalAmount = existingInvoice.TotalAmount,
                paymentUrl = $"/invoices/pay/{existingInvoice.InvoiceNumber}"
            });
        }

        var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{contract.ContractId:D4}";
        if (await _db.Invoices.AnyAsync(i => i.InvoiceNumber == invoiceNumber))
        {
            invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{contract.ContractId:D4}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";
        }

        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber,
            CustomerId = contract.CustomerId,
            ContractId = contract.ContractId,
            OpportunityId = contract.OpportunityId,
            Amount = contract.ContractValue,
            TotalAmount = contract.ContractValue,
            TaxRate = 0m,
            TaxAmount = 0m,
            Status = "Sent",
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            PaymentUrl = $"/invoices/pay/{invoiceNumber}",
            CreatedById = _currentUser.UserId ?? contract.CreatedById,
            Notes = $"Commercial invoice generated for contract #{contract.ContractNumber} ({contract.Title})",
            Terms = contract.TermsAndConditions ?? "Due within 30 days of contract execution."
        };

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Commercial invoice generated successfully!",
            invoiceId = invoice.InvoiceId,
            invoiceNumber = invoice.InvoiceNumber,
            status = invoice.Status,
            totalAmount = invoice.TotalAmount,
            paymentUrl = $"/invoices/pay/{invoice.InvoiceNumber}"
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.ContractId == id);
        if (contract == null)
            return NotFound();

        contract.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static ContractReadDto MapToReadDto(Contract c, Invoice? inv = null)
    {
        var token = c.SigningToken;
        if (string.IsNullOrEmpty(token)) token = Guid.NewGuid().ToString("N");

        string? computedInvoiceStatus = inv?.Status;
        decimal? amountPaid = null;
        decimal? balanceDue = null;

        if (inv != null)
        {
            var verifiedPayments = inv.Payments?.Where(p => p.Status == "Completed" && !p.IsDeleted).ToList() ?? new List<Payment>();
            var paidSum = verifiedPayments.Sum(p => p.Amount);
            var pendingVerification = inv.Payments?.Any(p => p.Status == "PendingVerification" && !p.IsDeleted) ?? false;
            var bal = Math.Max(0m, inv.TotalAmount - paidSum);

            amountPaid = paidSum;
            balanceDue = bal;

            if (inv.Status == "Cancelled")
            {
                computedInvoiceStatus = "Cancelled";
            }
            else if (inv.Status == "Refunded")
            {
                computedInvoiceStatus = "Refunded";
            }
            else if (bal <= 0.01m && paidSum > 0)
            {
                computedInvoiceStatus = "Paid";
            }
            else if (paidSum > 0 && bal > 0.01m)
            {
                computedInvoiceStatus = "PartiallyPaid";
            }
            else if (pendingVerification)
            {
                computedInvoiceStatus = "PendingVerification";
            }
            else
            {
                computedInvoiceStatus = inv.Status ?? "Sent";
            }
        }

        return new ContractReadDto
        {
            ContractId = c.ContractId,
            ContractNumber = c.ContractNumber,
            CustomerId = c.CustomerId,
            CustomerName = c.Customer != null ? $"{c.Customer.FirstName} {c.Customer.LastName}".Trim() : "Unknown",
            CustomerEmail = c.Customer?.Email ?? "",
            CompanyName = c.Customer?.Company?.Name,
            OpportunityId = c.OpportunityId,
            OpportunityTitle = c.Opportunity?.Title,
            Title = c.Title,
            ContractValue = c.ContractValue,
            StartDate = c.StartDate,
            EndDate = c.EndDate,
            Status = c.Status,
            SignatureDataUrl = c.SignatureDataUrl ?? c.CustomerSignatureDataUrl,
            SignedByName = c.SignedByName ?? c.CustomerSignedByName,
            SignedAt = c.SignedAt ?? c.CustomerSignedAt,
            CompanySignatureDataUrl = c.CompanySignatureDataUrl,
            CompanySignedByName = c.CompanySignedByName,
            CompanySignedAt = c.CompanySignedAt,
            CustomerSignatureDataUrl = c.CustomerSignatureDataUrl ?? c.SignatureDataUrl,
            CustomerSignedByName = c.CustomerSignedByName ?? c.SignedByName,
            CustomerSignedAt = c.CustomerSignedAt ?? c.SignedAt,
            TermsAndConditions = c.TermsAndConditions,
            Notes = c.Notes,
            SigningToken = token,
            CreatedById = c.CreatedById,
            CreatedByName = c.CreatedBy?.Name ?? "",
            CreatedAt = c.CreatedAt,
            InvoiceId = inv?.InvoiceId,
            InvoiceNumber = inv?.InvoiceNumber,
            InvoiceStatus = computedInvoiceStatus,
            InvoiceTotalAmount = inv?.TotalAmount,
            InvoiceAmountPaid = amountPaid,
            InvoiceBalanceDue = balanceDue,
            InvoicePaidAt = inv?.PaidAt,
            InvoicePaymentUrl = inv != null ? $"/invoices/pay/{inv.InvoiceNumber}" : null
        };
    }
}

public class SendContractEmailRequest
{
    public string? RecipientEmail { get; set; }
}
