using CrmSystem.Api.Dtos;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[Authorize(Policy = "RepOrAbove")]
[ApiController]
[Route("api/companies")]
public class CompaniesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public CompaniesController(AppDbContext db, ICurrentUserService currentUser, IAuditService auditService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<CompanySummaryDto>>> GetCompanies([FromQuery] CompanyListQuery query)
    {
        if (_currentUser.UserId is null)
        {
            return Unauthorized();
        }

        var companies = _db.Companies
            .AsNoTracking()
            .Include(c => c.AssignedRep)
            .AsQueryable();

        if (!_currentUser.IsManagerOrAbove)
        {
            companies = companies.Where(c => c.AssignedRepId == _currentUser.UserId);
        }
        else if (query.RepId is not null)
        {
            companies = companies.Where(c => c.AssignedRepId == query.RepId);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            companies = companies.Where(c => c.Name.Contains(search));
        }

        var page = query.NormalizedPage;
        var pageSize = query.NormalizedPageSize;
        var totalCount = await companies.CountAsync();

        var entities = await companies
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var companyIds = entities.Select(c => c.CompanyId).ToList();
        var contactCounts = await _db.Customers
            .AsNoTracking()
            .Where(c => c.CompanyId != null && companyIds.Contains(c.CompanyId.Value))
            .GroupBy(c => c.CompanyId!.Value)
            .Select(g => new { CompanyId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CompanyId, x => x.Count);

        var items = entities
            .Select(c => ToSummaryDto(c, contactCounts.GetValueOrDefault(c.CompanyId)))
            .ToList();

        return Ok(PagedResult<CompanySummaryDto>.Create(items, page, pageSize, totalCount));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CompanyDetailDto>> GetCompany(int id)
    {
        var company = await _db.Companies
            .AsNoTracking()
            .Include(c => c.AssignedRep)
            .Include(c => c.Source)
            .SingleOrDefaultAsync(c => c.CompanyId == id);

        if (company is null)
        {
            return NotFound(new { message = "Company not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(company.AssignedRepId))
        {
            return Forbid();
        }

        var contacts = await _db.Customers
            .AsNoTracking()
            .Where(c => c.CompanyId == id)
            .OrderBy(c => c.LastName)
            .ThenBy(c => c.FirstName)
            .Select(c => new CompanyContactDto(
                c.CustomerId,
                c.FirstName,
                c.LastName,
                c.Email,
                c.Phone))
            .ToListAsync();

        var totalOpenPipelineValue = await CalculateCompanyTotalOpenPipelineAsync(id);

        return Ok(ToDetailDto(company, contacts, totalOpenPipelineValue));
    }

    [HttpPost]
    public async Task<ActionResult<CompanyDetailDto>> CreateCompany(CreateCompanyRequest request)
    {
        if (_currentUser.UserId is null)
        {
            return Unauthorized();
        }

        var (isValid, assignedRepId) = await ResolveAssignedRepIdAsync(request.AssignedRepId);
        if (!isValid)
        {
            return BadRequest(new { message = "Assigned rep is invalid." });
        }

        if (request.SourceId is not null && !await _db.Sources.AnyAsync(s => s.SourceId == request.SourceId))
        {
            return BadRequest(new { message = "Source not found." });
        }

        var company = new Company
        {
            Name = request.Name.Trim(),
            Industry = request.Industry?.Trim(),
            CompanySize = request.CompanySize?.Trim(),
            Website = request.Website?.Trim(),
            Address = request.Address?.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            SourceId = request.SourceId,
            AssignedRepId = assignedRepId
        };

        _db.Companies.Add(company);
        await _db.SaveChangesAsync();

        await _db.Entry(company).Reference(c => c.AssignedRep).LoadAsync();
        await _db.Entry(company).Reference(c => c.Source).LoadAsync();

        return CreatedAtAction(
            nameof(GetCompany),
            new { id = company.CompanyId },
            ToDetailDto(company, [], totalOpenPipelineValue: 0m));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CompanyDetailDto>> UpdateCompany(int id, UpdateCompanyRequest request)
    {
        var company = await _db.Companies
            .Include(c => c.AssignedRep)
            .Include(c => c.Source)
            .SingleOrDefaultAsync(c => c.CompanyId == id);

        if (company is null)
        {
            return NotFound(new { message = "Company not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(company.AssignedRepId))
        {
            return Forbid();
        }

        var (isValid, assignedRepId) = await ResolveAssignedRepIdAsync(request.AssignedRepId);
        if (!isValid)
        {
            return BadRequest(new { message = "Assigned rep is invalid." });
        }

        if (!_currentUser.IsManagerOrAbove && assignedRepId != company.AssignedRepId)
        {
            return Forbid();
        }

        if (request.SourceId is not null && !await _db.Sources.AnyAsync(s => s.SourceId == request.SourceId))
        {
            return BadRequest(new { message = "Source not found." });
        }

        // Capture old values for audit logging
        var oldAssignedRepId = company.AssignedRepId;
        var oldName = company.Name;
        var oldIndustry = company.Industry;
        var oldCompanySize = company.CompanySize;
        var oldWebsite = company.Website;
        var oldAddress = company.Address;
        var oldPhone = company.Phone;
        var oldEmail = company.Email;
        var oldSourceId = company.SourceId;

        company.Name = request.Name.Trim();
        company.Industry = request.Industry?.Trim();
        company.CompanySize = request.CompanySize?.Trim();
        company.Website = request.Website?.Trim();
        company.Address = request.Address?.Trim();
        company.Phone = request.Phone?.Trim();
        company.Email = request.Email?.Trim();
        company.SourceId = request.SourceId;
        company.AssignedRepId = assignedRepId;

        await _db.SaveChangesAsync();

        // Log audit – collect all changed fields then persist in a single call
        if (_currentUser.UserId is not null)
        {
            try
            {
                var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Company");
                if (entityType is null)
                {
                    Console.WriteLine("[CompaniesController] WARNING: EntityType 'Company' not found in DB — audit skipped.");
                }
                else
                {
                    // Log rep assignment change first (uses its own action type "Assign")
                    if (oldAssignedRepId != company.AssignedRepId)
                    {
                        await _auditService.LogAssignmentAsync(
                            entityType.EntityTypeId, company.CompanyId,
                            oldAssignedRepId, company.AssignedRepId,
                            _currentUser.UserId.Value);
                    }

                    // Collect all other field changes
                    var changes = new List<(string Field, string? OldValue, string? NewValue)>();

                    if (oldName != company.Name)
                        changes.Add(("Name", oldName, company.Name));

                    if (oldIndustry != company.Industry)
                        changes.Add(("Industry", oldIndustry ?? string.Empty, company.Industry ?? string.Empty));

                    if (oldCompanySize != company.CompanySize)
                        changes.Add(("CompanySize", oldCompanySize ?? string.Empty, company.CompanySize ?? string.Empty));

                    if (oldWebsite != company.Website)
                        changes.Add(("Website", oldWebsite ?? string.Empty, company.Website ?? string.Empty));

                    if (oldAddress != company.Address)
                        changes.Add(("Address", oldAddress ?? string.Empty, company.Address ?? string.Empty));

                    if (oldPhone != company.Phone)
                        changes.Add(("Phone", oldPhone ?? string.Empty, company.Phone ?? string.Empty));

                    if (oldEmail != company.Email)
                        changes.Add(("Email", oldEmail ?? string.Empty, company.Email ?? string.Empty));

                    if (oldSourceId != company.SourceId)
                        changes.Add(("SourceId", oldSourceId?.ToString() ?? "null", company.SourceId?.ToString() ?? "null"));

                    if (changes.Count > 0)
                    {
                        Console.WriteLine($"[CompaniesController] Logging {changes.Count} field change(s) for Company {company.CompanyId}.");
                        await _auditService.LogFieldChangesAsync(
                            entityType.EntityTypeId, company.CompanyId,
                            changes, "Update",
                            _currentUser.UserId.Value);
                    }
                    else
                    {
                        Console.WriteLine($"[CompaniesController] No field changes detected for Company {company.CompanyId} — no audit log written.");
                    }
                }
            }
            catch (Exception ex)
            {
                // Audit failure must not break the successful update response
                Console.WriteLine($"[CompaniesController] ERROR writing audit log for Company {company.CompanyId}: {ex.Message}");
            }
        }

        var contacts = await _db.Customers
            .AsNoTracking()
            .Where(c => c.CompanyId == id)
            .OrderBy(c => c.LastName)
            .ThenBy(c => c.FirstName)
            .Select(c => new CompanyContactDto(
                c.CustomerId,
                c.FirstName,
                c.LastName,
                c.Email,
                c.Phone))
            .ToListAsync();

        var totalOpenPipelineValue = await CalculateCompanyTotalOpenPipelineAsync(id);

        return Ok(ToDetailDto(company, contacts, totalOpenPipelineValue));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCompany(int id)
    {
        var company = await _db.Companies.SingleOrDefaultAsync(c => c.CompanyId == id);

        if (company is null)
        {
            return NotFound(new { message = "Company not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(company.AssignedRepId))
        {
            return Forbid();
        }

        // Soft delete the company
        company.IsDeleted = true;
        await _db.SaveChangesAsync();

        // Log deletion audit if user info available
        if (_currentUser.UserId.HasValue)
        {
            var entityTypeDel = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Company");
            if (entityTypeDel != null)
            {
                await _auditService.LogDeletionAsync(entityTypeDel.EntityTypeId, company.CompanyId, _currentUser.UserId.Value);
            }
        }

        return NoContent();
    }

    [HttpGet("{id:int}/audit")]
    public async Task<ActionResult> GetAuditLogs(int id)
    {
        var company = await _db.Companies.SingleOrDefaultAsync(c => c.CompanyId == id);
        if (company is null)
        {
            return NotFound(new { message = "Company not found." });
        }

        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Company");
        if (entityType is null)
        {
            return Ok(new object[0]);
        }

        var auditLogs = await _db.AuditLogs
            .Include(a => a.ChangedBy)
            .Where(a => a.EntityTypeId == entityType.EntityTypeId && a.EntityId == id)
            .OrderByDescending(a => a.ChangedAt)
            .Select(a => new
            {
                a.AuditLogId,
                AuditActionType = a.AuditActionType != null ? a.AuditActionType.Name : null,
                a.FieldName,
                a.OldValue,
                a.NewValue,
                ChangedByName = a.ChangedBy != null ? a.ChangedBy.Name : null,
                a.ChangedAt
            })
            .ToListAsync();

        return Ok(auditLogs);
    }

    [HttpDelete("{id:int}/audit")]
    public async Task<IActionResult> ClearHistory(int id)
    {
        var company = await _db.Companies.SingleOrDefaultAsync(c => c.CompanyId == id);
        if (company is null)
        {
            return NotFound(new { message = "Company not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(company.AssignedRepId))
        {
            return Forbid();
        }

        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Company");
        if (entityType is null)
        {
            return Ok(new { message = "History cleared." });
        }

        if (_currentUser.UserId is not null)
        {
            await _auditService.ClearHistoryAsync(entityType.EntityTypeId, company.CompanyId, _currentUser.UserId.Value);
        }

        return Ok(new { message = "History cleared." });
    }

    private async Task<(bool IsValid, int? RepId)> ResolveAssignedRepIdAsync(int? requestedRepId)
    {
        if (_currentUser.UserId is null)
        {
            return (false, null);
        }

        if (!_currentUser.IsManagerOrAbove)
        {
            return (true, _currentUser.UserId);
        }

        if (requestedRepId is null)
        {
            return (true, null);
        }

        var repExists = await _db.Identities
            .Include(u => u.Role)
            .AnyAsync(u => u.IdentityId == requestedRepId && u.Role != null && u.Role.Name != "Admin");
        return repExists ? (true, requestedRepId) : (false, null);
    }

    private static CompanySummaryDto ToSummaryDto(Company company, int contactCount) =>
        new(
            company.CompanyId,
            company.Name,
            company.Industry,
            company.Website,
            company.AssignedRepId,
            company.AssignedRep?.Name,
            contactCount);

    private static CompanyDetailDto ToDetailDto(
        Company company,
        IReadOnlyList<CompanyContactDto> contacts,
        decimal totalOpenPipelineValue) =>
        new(
            company.CompanyId,
            company.Name,
            company.Industry,
            company.CompanySize,
            company.Website,
            company.Address,
            company.Phone,
            company.Email,
            company.SourceId,
            company.Source?.Name,
            company.AssignedRepId,
            company.AssignedRep?.Name,
            company.AssignedRep?.Email,
            totalOpenPipelineValue,
            contacts);

    private async Task<decimal> CalculateCompanyTotalOpenPipelineAsync(int companyId)
    {
        return await _db.Opportunities
            .AsNoTracking()
            .Where(o => o.Customer != null && o.Customer.CompanyId == companyId)
            .Where(o => o.OpportunityStage != null && !o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)
            .SumAsync(o => (decimal?)o.EstimatedValue) ?? 0m;
    }
}