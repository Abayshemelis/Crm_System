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
[Route("api/leads")]
public class LeadsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public LeadsController(AppDbContext db, ICurrentUserService currentUser, IAuditService auditService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
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

        if (query.LeadStatusId is not null)
        {
            leads = leads.Where(l => l.LeadStatusId == query.LeadStatusId);
        }
        else if (!query.ShowConverted)
        {
            leads = leads.Where(l => l.LeadStatus == null || l.LeadStatus.Name != "Converted");
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
            CreatedAt = DateTime.UtcNow,
            CreatedById = _currentUser.UserId
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

        // Capture old values for audit logging
        var oldAssignedRepId = lead.AssignedRepId;
        var oldFirstName = lead.FirstName;
        var oldLastName = lead.LastName;
        var oldEmail = lead.Email;
        var oldPhone = lead.Phone;
        var oldJobTitle = lead.JobTitle;
        var oldCompanyName = lead.CompanyName;
        var oldSourceId = lead.SourceId;
        var oldLeadStatusId = lead.LeadStatusId;
        var oldNotes = lead.Notes;

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

        // Log all field changes
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Lead");
            if (entityType is not null)
            {
                // Log assignment change if AssignedRepId changed
                if (oldAssignedRepId != lead.AssignedRepId)
                {
                    await _auditService.LogAssignmentAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: lead.LeadId,
                        oldRepId: oldAssignedRepId,
                        newRepId: lead.AssignedRepId,
                        changedById: _currentUser.UserId.Value);
                }

                // Log other field changes
                if (oldFirstName != lead.FirstName)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: lead.LeadId,
                        fieldName: "FirstName",
                        oldValue: oldFirstName,
                        newValue: lead.FirstName,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldLastName != lead.LastName)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: lead.LeadId,
                        fieldName: "LastName",
                        oldValue: oldLastName,
                        newValue: lead.LastName,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldEmail != lead.Email)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: lead.LeadId,
                        fieldName: "Email",
                        oldValue: oldEmail ?? string.Empty,
                        newValue: lead.Email ?? string.Empty,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldPhone != lead.Phone)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: lead.LeadId,
                        fieldName: "Phone",
                        oldValue: oldPhone ?? string.Empty,
                        newValue: lead.Phone ?? string.Empty,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldJobTitle != lead.JobTitle)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: lead.LeadId,
                        fieldName: "JobTitle",
                        oldValue: oldJobTitle ?? string.Empty,
                        newValue: lead.JobTitle ?? string.Empty,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldCompanyName != lead.CompanyName)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: lead.LeadId,
                        fieldName: "CompanyName",
                        oldValue: oldCompanyName ?? string.Empty,
                        newValue: lead.CompanyName ?? string.Empty,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldSourceId.HasValue != lead.SourceId.HasValue || (oldSourceId.HasValue && lead.SourceId.HasValue && oldSourceId.Value != lead.SourceId.Value))
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: lead.LeadId,
                        fieldName: "SourceId",
                        oldValue: oldSourceId?.ToString() ?? "null",
                        newValue: lead.SourceId?.ToString() ?? "null",
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldLeadStatusId != lead.LeadStatusId)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: lead.LeadId,
                        fieldName: "LeadStatusId",
                        oldValue: oldLeadStatusId?.ToString() ?? string.Empty,
                        newValue: lead.LeadStatusId?.ToString() ?? string.Empty,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldNotes != lead.Notes)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: lead.LeadId,
                        fieldName: "Notes",
                        oldValue: oldNotes ?? string.Empty,
                        newValue: lead.Notes ?? string.Empty,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }
            }
        }

        await _db.Entry(lead).Reference(l => l.Source).LoadAsync();
        await _db.Entry(lead).Reference(l => l.LeadStatus).LoadAsync();

        return Ok(ToDetailDto(lead));
    }

    [HttpGet("{id:int}/audit")]
    public async Task<ActionResult> GetAuditLogs(int id)
    {
        var lead = await _db.Leads.SingleOrDefaultAsync(l => l.LeadId == id);
        if (lead is null)
        {
            return NotFound(new { message = "Lead not found." });
        }

        var leadEntityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Lead");
        var customerEntityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Customer");

        int? custId = lead.ConvertedCustomerId;

        var query = _db.AuditLogs
            .Include(a => a.AuditActionType)
            .Include(a => a.ChangedBy)
            .Where(a => !a.IsDeleted)
            .AsQueryable();

        query = query.Where(a =>
            (leadEntityType != null && a.EntityTypeId == leadEntityType.EntityTypeId && a.EntityId == id) ||
            (customerEntityType != null && custId.HasValue && a.EntityTypeId == customerEntityType.EntityTypeId && a.EntityId == custId.Value));

        var auditLogs = await query
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
        var lead = await _db.Leads.SingleOrDefaultAsync(l => l.LeadId == id);
        if (lead is null)
        {
            return NotFound(new { message = "Lead not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(lead.AssignedRepId))
        {
            return Forbid();
        }

        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Lead");
        if (entityType is null)
        {
            return Ok(new { message = "History cleared." });
        }

        if (_currentUser.UserId is not null)
        {
            await _auditService.ClearHistoryAsync(entityType.EntityTypeId, lead.LeadId, _currentUser.UserId.Value);
        }

        return Ok(new { message = "History cleared." });
    }

    [HttpPost("{id:int}/convert")]
    public async Task<ActionResult<ConvertLeadResponse>> ConvertLead(int id, ConvertLeadRequest request)
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

        // Optionally create initial opportunity
        int? opportunityId = null;
        if (request.CreateInitialOpportunity)
        {
            var opportunityTitle = (request.OpportunityTitle ?? $"{firstName} {lastName} - Initial Opportunity").Trim();
            var newStage = await _db.OpportunityStages.FirstOrDefaultAsync(os => os.Name == "New");
            if (newStage is null)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Opportunity stage 'New' not found." });
            }

            var opportunity = new Opportunity
            {
                CustomerId = customer.CustomerId,
                Title = opportunityTitle,
                Description = $"Created from lead conversion (Lead ID: {lead.LeadId})",
                OpportunityStageId = newStage.OpportunityStageId,
                EstimatedValue = request.OpportunityEstimatedValue ?? 0,
                ExpectedCloseDate = request.OpportunityExpectedCloseDate,
                OwnerId = lead.AssignedRepId ?? _currentUser.UserId.Value,
                CreatedAt = DateTime.UtcNow
            };

            _db.Opportunities.Add(opportunity);
            await _db.SaveChangesAsync();
            opportunityId = opportunity.OpportunityId;

            // Create initial StageHistory row (OldStageId = null, NewStageId = "New")
            var stageHistory = new StageHistory
            {
                OpportunityId = opportunity.OpportunityId,
                OldStageId = null,
                NewStageId = newStage.OpportunityStageId,
                ChangedAt = DateTime.UtcNow,
                ChangedById = _currentUser.UserId.Value
            };

            _db.StageHistories.Add(stageHistory);
            await _db.SaveChangesAsync();
        }

        // Set status to "Converted" (id=5)
        var convertedStatus = await _db.LeadStatuses.FirstOrDefaultAsync(ls => ls.Name == "Converted");
        var oldStatusName = lead.LeadStatus?.Name ?? "Qualified";
        lead.LeadStatusId = convertedStatus?.LeadStatusId;
        lead.ConvertedCustomerId = customer.CustomerId;
        lead.ConvertedOpportunityId = opportunityId;
        lead.ConvertedAt = DateTime.UtcNow;
        lead.ConvertedById = _currentUser.UserId;
        await _db.SaveChangesAsync();

        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Lead");
            if (entityType is not null)
            {
                await _auditService.LogFieldChangeAsync(
                    entityTypeId: entityType.EntityTypeId,
                    entityId: lead.LeadId,
                    fieldName: "LeadStatus",
                    oldValue: oldStatusName,
                    newValue: "Converted",
                    actionTypeName: "Convert",
                    changedById: _currentUser.UserId.Value);
            }
        }
        // Relink existing activities and tasks to the new Customer/Opportunity
        var leadActivities = await _db.Activities.Where(a => a.LeadId == lead.LeadId).ToListAsync();
        foreach (var act in leadActivities)
        {
            act.CustomerId = customer.CustomerId;
            if (opportunityId.HasValue && act.OpportunityId == null)
            {
                act.OpportunityId = opportunityId.Value;
            }
        }
        
        var leadTasks = await _db.CrmTasks.Where(t => t.LeadId == lead.LeadId).ToListAsync();
        foreach (var task in leadTasks)
        {
            task.CustomerId = customer.CustomerId;
            if (opportunityId.HasValue && task.OpportunityId == null)
            {
                task.OpportunityId = opportunityId.Value;
            }
        }
        
        await _db.SaveChangesAsync();

        await transaction.CommitAsync();

        return Ok(new ConvertLeadResponse(
            lead.LeadId,
            customer.CustomerId,
            companyId,
            opportunityId,
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

        // Log deletion audit
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Lead");
            if (entityType is not null)
            {
                await _auditService.LogDeletionAsync(entityType.EntityTypeId, lead.LeadId, _currentUser.UserId.Value);
            }
        }

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
            lead.CreatedById,
            lead.ConvertedAt,
            lead.ConvertedById,
            lead.ConvertedOpportunityId,
            lead.Notes,
            lead.CreatedAt);
}