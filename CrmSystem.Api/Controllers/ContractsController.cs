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

    public ContractsController(AppDbContext db, ICurrentUserService currentUser, IAuditService auditService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ContractReadDto>>> GetAll(
        [FromQuery] int? customerId,
        [FromQuery] string? status)
    {
        var query = _db.Contracts
            .Where(c => !c.IsDeleted)
            .Include(c => c.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(c => c.Opportunity)
            .Include(c => c.CreatedBy)
            .AsNoTracking();

        if (customerId.HasValue)
            query = query.Where(c => c.CustomerId == customerId.Value);

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            query = query.Where(c => c.Status == status);

        var list = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => MapToReadDto(c))
            .ToListAsync();

        return Ok(list);
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
            .AsNoTracking()
            .FirstOrDefaultAsync();

        if (contract == null)
            return NotFound(new { message = "Contract not found." });

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
            TermsAndConditions = dto.TermsAndConditions ?? "Standard commercial terms apply. Payment Net 30 days.",
            Notes = dto.Notes,
            CreatedById = _currentUser.UserId.Value,
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

        contract.SignatureDataUrl = dto.SignatureDataUrl;
        contract.SignedByName = string.IsNullOrWhiteSpace(dto.SignedByName) ? "Authorized Signatory" : dto.SignedByName;
        contract.SignedAt = DateTime.UtcNow;
        contract.Status = "Signed";
        contract.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Contract digitally signed successfully!", signedAt = contract.SignedAt });
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

    private static ContractReadDto MapToReadDto(Contract c) => new()
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
        SignatureDataUrl = c.SignatureDataUrl,
        SignedByName = c.SignedByName,
        SignedAt = c.SignedAt,
        TermsAndConditions = c.TermsAndConditions,
        Notes = c.Notes,
        CreatedById = c.CreatedById,
        CreatedByName = c.CreatedBy?.Name ?? "System",
        CreatedAt = c.CreatedAt
    };
}
