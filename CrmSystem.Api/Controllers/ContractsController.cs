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
        [FromQuery] string? status)
    {
        var query = _db.Contracts
            .Where(c => !c.IsDeleted)
            .Include(c => c.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(c => c.Opportunity)
            .Include(c => c.CreatedBy)
            .AsQueryable();

        if (customerId.HasValue)
            query = query.Where(c => c.CustomerId == customerId.Value);

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

        var dtos = list.Select(c => MapToReadDto(c)).ToList();
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

        return Ok(MapToReadDto(contract));
    }

    [HttpPost]
    public async Task<ActionResult<ContractReadDto>> Create([FromBody] CreateContractDto dto)
    {
        if (!_currentUser.UserId.HasValue)
            return Unauthorized();

        var customer = await _db.Customers.FindAsync(dto.CustomerId);
        if (customer == null)
            return BadRequest(new { message = "Invalid Customer ID." });

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

        try
        {
            await _emailSender.SendEmailAsync(
                recipientEmail,
                $"Contract Signature Request: {contract.Title} ({contract.ContractNumber})",
                html
            );

            if (contract.Status == "Draft")
            {
                contract.Status = !string.IsNullOrEmpty(contract.CompanySignatureDataUrl) ? "PendingCustomer" : "SentForSignature";
            }
            contract.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { message = $"Contract signing invitation emailed to {recipientEmail}" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Failed to send email: {ex.Message}" });
        }
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

    private static ContractReadDto MapToReadDto(Contract c)
    {
        var token = c.SigningToken;
        if (string.IsNullOrEmpty(token)) token = Guid.NewGuid().ToString("N");

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
        };
    }
}

public class SendContractEmailRequest
{
    public string? RecipientEmail { get; set; }
}
