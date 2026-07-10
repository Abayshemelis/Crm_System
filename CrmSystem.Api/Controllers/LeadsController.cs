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
[Route("api/leads")]
public class LeadsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public LeadsController(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<LeadSummaryDto>>> GetLeads([FromQuery] LeadListQuery query)
    {
        if (_currentUser.UserId is null)
        {
            return Unauthorized();
        }

        var leads = _db.Leads
            .AsNoTracking()
            .Include(l => l.AssignedRep)
            .Include(l => l.Source)
            .Include(l => l.LeadStatus)
            .AsQueryable();

        if (!_currentUser.IsManagerOrAbove)
        {
            leads = leads.Where(l => l.AssignedRepId == _currentUser.UserId);
        }
        else if (query.RepId is not null)
        {
            leads = leads.Where(l => l.AssignedRepId == query.RepId);
        }

        // By default hide converted leads (LeadStatus name "Converted" = id 5)
        if (!query.ShowConverted)
        {
            leads = leads.Where(l => l.LeadStatus == null || l.LeadStatus.Name != "Converted");
        }

        if (query.LeadStatusId is not null)
        {
            leads = leads.Where(l => l.LeadStatusId == query.LeadStatusId);
        }

        if (query.SourceId is not null)
        {
            leads = leads.Where(l => l.SourceId == query.SourceId);
        }

        var page = query.NormalizedPage;
        var pageSize = query.NormalizedPageSize;
        var totalCount = await leads.CountAsync();

        var entities = await leads
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = entities.Select(ToSummaryDto).ToList();

        return Ok(PagedResult<LeadSummaryDto>.Create(items, page, pageSize, totalCount));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<LeadDetailDto>> GetLead(int id)
    {
        var lead = await _db.Leads
            .AsNoTracking()
            .Include(l => l.AssignedRep)
            .Include(l => l.Source)
            .Include(l => l.LeadStatus)
            .SingleOrDefaultAsync(l => l.LeadId == id);

        if (lead is null)
        {
            return NotFound(new { message = "Lead not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(lead.AssignedRepId))
        {
            return Forbid();
        }

        return Ok(ToDetailDto(lead));
    }

    [HttpPost]
    public async Task<ActionResult<LeadDetailDto>> CreateLead(CreateLeadRequest request)
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

        if (request.SourceId is not null &&
            !await _db.Sources.AnyAsync(s => s.SourceId == request.SourceId))
        {
            return BadRequest(new { message = "Source not found." });
        }

        // Default status = "New" (id=1) if not provided
        int? leadStatusId = request.LeadStatusId ?? 1;

        var lead = new Lead
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            JobTitle = request.JobTitle?.Trim(),
            CompanyName = request.CompanyName?.Trim(),
            SourceId = request.SourceId,
            LeadStatusId = leadStatusId,
            AssignedRepId = assignedRepId,
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.Leads.Add(lead);
        await _db.SaveChangesAsync();

        await _db.Entry(lead).Reference(l => l.AssignedRep).LoadAsync();
        await _db.Entry(lead).Reference(l => l.Source).LoadAsync();
        await _db.Entry(lead).Reference(l => l.LeadStatus).LoadAsync();

        return CreatedAtAction(nameof(GetLead), new { id = lead.LeadId }, ToDetailDto(lead));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<LeadDetailDto>> UpdateLead(int id, UpdateLeadRequest request)
    {
        var lead = await _db.Leads
            .Include(l => l.AssignedRep)
            .Include(l => l.Source)
            .Include(l => l.LeadStatus)
            .SingleOrDefaultAsync(l => l.LeadId == id);

        if (lead is null)
        {
            return NotFound(new { message = "Lead not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(lead.AssignedRepId))
        {
            return Forbid();
        }

        // Don't let anyone edit a converted lead
        if (lead.LeadStatus?.Name == "Converted")
        {
            return BadRequest(new { message = "Converted leads cannot be edited." });
        }

        // Don't let status be set to Converted via edit (use /convert endpoint)
        if (request.LeadStatusId is not null)
        {
            var newStatus = await _db.LeadStatuses.FindAsync(request.LeadStatusId);
            if (newStatus?.Name == "Converted")
            {
                return BadRequest(new { message = "Use the convert endpoint to mark a lead as Converted." });
            }
        }

        var (isValid, assignedRepId) = await ResolveAssignedRepIdAsync(request.AssignedRepId);
        if (!isValid)
        {
            return BadRequest(new { message = "Assigned rep is invalid." });
        }

        if (!_currentUser.IsManagerOrAbove && assignedRepId != lead.AssignedRepId)
        {
            return Forbid();
        }

        if (request.SourceId is not null &&
            !await _db.Sources.AnyAsync(s => s.SourceId == request.SourceId))
        {
            return BadRequest(new { message = "Source not found." });
        }

        lead.FirstName = request.FirstName.Trim();
        lead.LastName = request.LastName.Trim();
        lead.Email = request.Email?.Trim();
        lead.Phone = request.Phone?.Trim();
        lead.JobTitle = request.JobTitle?.Trim();
        lead.CompanyName = request.CompanyName?.Trim();
        lead.SourceId = request.SourceId;
        lead.LeadStatusId = request.LeadStatusId ?? lead.LeadStatusId;
        lead.AssignedRepId = assignedRepId;
        lead.Notes = request.Notes?.Trim();

        await _db.SaveChangesAsync();

        await _db.Entry(lead).Reference(l => l.Source).LoadAsync();
        await _db.Entry(lead).Reference(l => l.LeadStatus).LoadAsync();

        return Ok(ToDetailDto(lead));
    }

    [HttpPost("{id:int}/convert")]
    public async Task<ActionResult<ConvertLeadResponse>> ConvertLead(int id, ConvertLeadRequest request)
    {
        if (request.CreateInitialOpportunity)
        {
            return BadRequest(new { message = "Initial opportunity creation will be available in Phase 3." });
        }

        var lead = await _db.Leads
            .Include(l => l.LeadStatus)
            .SingleOrDefaultAsync(l => l.LeadId == id);

        if (lead is null)
        {
            return NotFound(new { message = "Lead not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(lead.AssignedRepId))
        {
            return Forbid();
        }

        if (lead.LeadStatus?.Name == "Converted")
        {
            return BadRequest(new { message = "Lead is already converted." });
        }

        if (lead.LeadStatus?.Name != "Qualified")
        {
            return BadRequest(new { message = "Only qualified leads can be converted." });
        }

        var firstName = (request.FirstName ?? lead.FirstName).Trim();
        var lastName = (request.LastName ?? lead.LastName).Trim();
        var email = (request.Email ?? lead.Email)?.Trim();
        var phone = (request.Phone ?? lead.Phone)?.Trim();

        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new { message = "Email is required to convert a lead to a customer." });
        }

        if (_currentUser.UserId is null)
        {
            return Unauthorized();
        }

        int? companyId = request.CompanyId;

        if (companyId is not null &&
            !await _db.Companies.AnyAsync(c => c.CompanyId == companyId))
        {
            return BadRequest(new { message = "Company not found." });
        }

        if (companyId is null && request.CreateCompany)
        {
            var companyName = (request.CompanyName ?? lead.CompanyName)?.Trim();
            if (string.IsNullOrWhiteSpace(companyName))
            {
                return BadRequest(new { message = "Company name is required when creating a company." });
            }
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();

        if (companyId is null && request.CreateCompany)
        {
            var companyName = (request.CompanyName ?? lead.CompanyName)!.Trim();

            var company = new Company
            {
                Name = companyName,
                AssignedRepId = lead.AssignedRepId ?? _currentUser.UserId
            };

            _db.Companies.Add(company);
            await _db.SaveChangesAsync();
            companyId = company.CompanyId;
        }

        var customer = new Customer
        {
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            Phone = phone,
            JobTitle = lead.JobTitle,
            CompanyId = companyId,
            SourceId = lead.SourceId,
            AssignedRepId = lead.AssignedRepId ?? _currentUser.UserId.Value,
            CreatedAt = DateTime.UtcNow
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        // Set status to "Converted" (id=5)
        var convertedStatus = await _db.LeadStatuses.FirstOrDefaultAsync(ls => ls.Name == "Converted");
        lead.LeadStatusId = convertedStatus?.LeadStatusId;
        lead.ConvertedCustomerId = customer.CustomerId;
        await _db.SaveChangesAsync();

        await transaction.CommitAsync();

        return Ok(new ConvertLeadResponse(
            lead.LeadId,
            customer.CustomerId,
            companyId,
            "Lead converted to customer successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteLead(int id)
    {
        var lead = await _db.Leads
            .Include(l => l.LeadStatus)
            .SingleOrDefaultAsync(l => l.LeadId == id);

        if (lead is null)
        {
            return NotFound(new { message = "Lead not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(lead.AssignedRepId))
        {
            return Forbid();
        }

        if (lead.LeadStatus?.Name == "Converted")
        {
            return BadRequest(new { message = "Converted leads cannot be disqualified." });
        }

        lead.IsDeleted = true;
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

        var repExists = await _db.Identities.AnyAsync(u => u.IdentityId == requestedRepId);
        return repExists ? (true, requestedRepId) : (false, null);
    }

    private static LeadSummaryDto ToSummaryDto(Lead lead) =>
        new(
            lead.LeadId,
            lead.FirstName,
            lead.LastName,
            lead.Email,
            lead.Phone,
            lead.JobTitle,
            lead.CompanyName,
            lead.SourceId,
            lead.Source?.Name,
            lead.LeadStatusId,
            lead.LeadStatus?.Name,
            lead.AssignedRepId,
            lead.AssignedRep?.Name,
            lead.CreatedAt);

    private static LeadDetailDto ToDetailDto(Lead lead) =>
        new(
            lead.LeadId,
            lead.FirstName,
            lead.LastName,
            lead.Email,
            lead.Phone,
            lead.JobTitle,
            lead.CompanyName,
            lead.SourceId,
            lead.Source?.Name,
            lead.LeadStatusId,
            lead.LeadStatus?.Name,
            lead.AssignedRepId,
            lead.AssignedRep?.Name,
            lead.ConvertedCustomerId,
            lead.Notes,
            lead.CreatedAt);
}
