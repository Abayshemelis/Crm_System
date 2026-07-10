using CrmSystem.Domain.Dtos.Lead;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LeadsController : ControllerBase
{
    private readonly AppDbContext _db;

    public LeadsController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")!.Value);
    private string GetRole() => User.FindFirst(ClaimTypes.Role)?.Value ?? "SalesRep";

    private LeadReadDto MapToDto(Lead l) => new(
        l.LeadId, l.FirstName, l.LastName, l.Email, l.Phone,
        l.CompanyName, l.JobTitle,
        l.SourceId, l.Source?.Name,
        l.LeadStatusId, l.LeadStatus?.Name ?? "",
        l.AssignedRepId, l.AssignedRep?.Name,
        l.ConvertedCustomerId, l.Notes, l.CreatedAt
    );

    // ── GET /api/leads ─────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? statusId,
        [FromQuery] int? sourceId,
        [FromQuery] int? repId,
        [FromQuery] bool showConverted = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var role = GetRole();
        var userId = GetUserId();

        var q = _db.Leads
            .Include(l => l.Source)
            .Include(l => l.LeadStatus)
            .Include(l => l.AssignedRep)
            .AsQueryable();

        if (role == "SalesRep") q = q.Where(l => l.AssignedRepId == userId);
        if (!showConverted) q = q.Where(l => l.LeadStatus!.Name != "Converted");
        if (statusId.HasValue) q = q.Where(l => l.LeadStatusId == statusId);
        if (sourceId.HasValue) q = q.Where(l => l.SourceId == sourceId);
        if (repId.HasValue && role != "SalesRep") q = q.Where(l => l.AssignedRepId == repId);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return Ok(new { data = items.Select(MapToDto), page, pageSize, totalCount = total, totalPages = (int)Math.Ceiling(total / (double)pageSize) });
    }

    // ── GET /api/leads/{id} ────────────────────────────────────────────────
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var l = await _db.Leads
            .Include(x => x.Source).Include(x => x.LeadStatus).Include(x => x.AssignedRep)
            .SingleOrDefaultAsync(x => x.LeadId == id);

        if (l is null) return NotFound();

        var role = GetRole();
        var userId = GetUserId();
        if (role == "SalesRep" && l.AssignedRepId != userId) return Forbid();

        return Ok(MapToDto(l));
    }

    // ── POST /api/leads ────────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] LeadCreateDto dto)
    {
        var userId = GetUserId();

        var newStatus = await _db.LeadStatuses.FirstOrDefaultAsync(s => s.Name == "New");
        if (newStatus is null) return BadRequest(new { message = "Lead status 'New' not found in database." });

        var lead = new Lead
        {
            FirstName     = dto.FirstName,
            LastName      = dto.LastName,
            Email         = dto.Email,
            Phone         = dto.Phone,
            CompanyName   = dto.CompanyName,
            JobTitle      = dto.JobTitle,
            SourceId      = dto.SourceId,
            LeadStatusId  = newStatus.LeadStatusId,
            AssignedRepId = dto.AssignedRepId ?? userId,
            Notes         = dto.Notes,
        };

        _db.Leads.Add(lead);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = lead.LeadId }, new { id = lead.LeadId });
    }

    // ── PUT /api/leads/{id} ────────────────────────────────────────────────
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] LeadUpdateDto dto)
    {
        var l = await _db.Leads.FindAsync(id);
        if (l is null) return NotFound();

        var role = GetRole();
        var userId = GetUserId();
        if (role == "SalesRep" && l.AssignedRepId != userId) return Forbid();

        l.FirstName     = dto.FirstName;
        l.LastName      = dto.LastName;
        l.Email         = dto.Email;
        l.Phone         = dto.Phone;
        l.CompanyName   = dto.CompanyName;
        l.JobTitle      = dto.JobTitle;
        l.SourceId      = dto.SourceId;
        l.LeadStatusId  = dto.LeadStatusId;
        l.Notes         = dto.Notes;
        if (role != "SalesRep") l.AssignedRepId = dto.AssignedRepId;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── DELETE /api/leads/{id} (soft delete / disqualify) ─────────────────
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var l = await _db.Leads.Include(x => x.LeadStatus).SingleOrDefaultAsync(x => x.LeadId == id);
        if (l is null) return NotFound();

        var role = GetRole();
        var userId = GetUserId();
        if (role == "SalesRep" && l.AssignedRepId != userId) return Forbid();

        var disqualifiedStatus = await _db.LeadStatuses.FirstOrDefaultAsync(s => s.Name == "Disqualified");
        if (disqualifiedStatus is not null)
        {
            l.LeadStatusId = disqualifiedStatus.LeadStatusId;
        }
        else
        {
            l.IsDeleted = true;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── POST /api/leads/{id}/convert ───────────────────────────────────────
    [HttpPost("{id:int}/convert")]
    public async Task<IActionResult> Convert(int id, [FromBody] LeadConvertDto dto)
    {
        var lead = await _db.Leads.Include(l => l.LeadStatus).SingleOrDefaultAsync(l => l.LeadId == id);
        if (lead is null) return NotFound();
        if (lead.ConvertedCustomerId is not null)
            return Conflict(new { message = "This lead has already been converted." });

        var role = GetRole();
        var userId = GetUserId();
        if (role == "SalesRep" && lead.AssignedRepId != userId) return Forbid();

        // 1. Optionally create or reuse a company
        int? companyId = dto.ExistingCompanyId;
        if (companyId is null && !string.IsNullOrWhiteSpace(dto.NewCompanyName))
        {
            var company = new Company { Name = dto.NewCompanyName, AssignedRepId = dto.AssignedRepId ?? userId };
            _db.Companies.Add(company);
            await _db.SaveChangesAsync();
            companyId = company.CompanyId;
        }

        // 2. Create Customer
        var customer = new Customer
        {
            FirstName     = dto.FirstName,
            LastName      = dto.LastName,
            Email         = dto.Email,
            Phone         = dto.Phone,
            SourceId      = lead.SourceId,
            CompanyId     = companyId,
            AssignedRepId = dto.AssignedRepId ?? userId,
        };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        // 3. Optionally create an initial Opportunity
        int? opportunityId = null;
        if (dto.CreateInitialOpportunity && !string.IsNullOrWhiteSpace(dto.OpportunityTitle))
        {
            var firstStage = await _db.OpportunityStages.OrderBy(s => s.SortOrder).FirstOrDefaultAsync();
            var stageId = dto.OpportunityStageId ?? firstStage?.OpportunityStageId;
            if (stageId.HasValue)
            {
                var opp = new Opportunity
                {
                    CustomerId        = customer.CustomerId,
                    Title             = dto.OpportunityTitle,
                    EstimatedValue    = dto.OpportunityValue ?? 0m,
                    OpportunityStageId = stageId.Value,
                    OwnerId           = dto.AssignedRepId ?? userId,
                };
                _db.Opportunities.Add(opp);
                await _db.SaveChangesAsync();
                opportunityId = opp.OpportunityId;

                // Write initial StageHistory row
                var history = new StageHistory
                {
                    OpportunityId = opp.OpportunityId,
                    OldStageId    = null,
                    NewStageId    = stageId.Value,
                    ChangedById   = userId,
                    ChangedAt     = DateTime.UtcNow,
                };
                _db.StageHistories.Add(history);
                await _db.SaveChangesAsync();
            }
        }

        // 4. Mark lead as Converted
        var convertedStatus = await _db.LeadStatuses.FirstOrDefaultAsync(s => s.Name == "Converted");
        if (convertedStatus is not null) lead.LeadStatusId = convertedStatus.LeadStatusId;
        lead.ConvertedCustomerId = customer.CustomerId;

        await _db.SaveChangesAsync();

        return Ok(new { customerId = customer.CustomerId, companyId, opportunityId });
    }
}
