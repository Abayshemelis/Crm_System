using CrmSystem.Api.Dtos;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
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

    public CompaniesController(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
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

        company.IsDeleted = true;
        await _db.SaveChangesAsync();

        return NoContent();
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
