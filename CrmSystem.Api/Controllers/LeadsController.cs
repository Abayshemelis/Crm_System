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
    private readonly ILeadScoringService _scoringService;
    private readonly IEmailTriggerService _emailTriggerService;

    public LeadsController(AppDbContext db, ICurrentUserService currentUser, IAuditService auditService, ILeadScoringService scoringService, IEmailTriggerService emailTriggerService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
        _scoringService = scoringService;
        _emailTriggerService = emailTriggerService;
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
            .Include(l => l.NextFollowUpAssignedTo)
            .AsQueryable();

        if (query.IncludeDeleted)
        {
            leads = leads.IgnoreQueryFilters();
        }
        else
        {
            leads = leads.Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null));
        }

        if (!_currentUser.IsAdmin)
        {
            if (_currentUser.IsManagerOrAbove)
            {
                leads = leads.Where(l => l.AssignedRepId == _currentUser.UserId || (l.AssignedRep != null && l.AssignedRep.ManagerId == _currentUser.UserId));
            }
            else
            {
                leads = leads.Where(l => l.AssignedRepId == _currentUser.UserId);
            }
        }

        if (query.RepId is not null)
        {
            leads = leads.Where(l => l.AssignedRepId == query.RepId);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            leads = leads.Where(l =>
                (l.FirstName + " " + l.LastName).ToLower().Contains(search) ||
                l.FirstName.ToLower().Contains(search) ||
                l.LastName.ToLower().Contains(search) ||
                (l.Email != null && l.Email.ToLower().Contains(search)) ||
                (l.Phone != null && l.Phone.Contains(search)) ||
                (l.CompanyName != null && l.CompanyName.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(query.Priority))
        {
            leads = leads.Where(l => l.Priority == query.Priority);
        }

        if (!string.IsNullOrWhiteSpace(query.Rating))
        {
            var rating = query.Rating.Trim();
            if (string.Equals(rating, "Hot", StringComparison.OrdinalIgnoreCase))
            {
                leads = leads.Where(l => l.LeadScore >= 70);
            }
            else if (string.Equals(rating, "Warm", StringComparison.OrdinalIgnoreCase))
            {
                leads = leads.Where(l => l.LeadScore >= 40 && l.LeadScore < 70);
            }
            else if (string.Equals(rating, "Cold", StringComparison.OrdinalIgnoreCase))
            {
                leads = leads.Where(l => l.LeadScore < 40);
            }
        }

        if (!string.IsNullOrWhiteSpace(query.Company))
        {
            var comp = query.Company.Trim().ToLower();
            leads = leads.Where(l => l.CompanyName != null && l.CompanyName.ToLower().Contains(comp));
        }

        if (!string.IsNullOrWhiteSpace(query.FollowUpFilter))
        {
            var today = DateTime.UtcNow.Date;
            var now = DateTime.UtcNow;
            if (query.FollowUpFilter == "today")
            {
                leads = leads.Where(l => l.NextFollowUpDate.HasValue && l.NextFollowUpDate.Value.Date == today && (l.LeadStatus == null || !l.LeadStatus.IsTerminal));
            }
            else if (query.FollowUpFilter == "overdue")
            {
                leads = leads.Where(l => l.NextFollowUpDate.HasValue && l.NextFollowUpDate.Value < now && (l.LeadStatus == null || !l.LeadStatus.IsTerminal));
            }
            else if (query.FollowUpFilter == "upcoming")
            {
                leads = leads.Where(l => l.NextFollowUpDate.HasValue && l.NextFollowUpDate.Value >= now && (l.LeadStatus == null || !l.LeadStatus.IsTerminal));
            }
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

        if (query.CreatedFrom.HasValue)
        {
            leads = leads.Where(l => l.CreatedAt >= query.CreatedFrom.Value.Date);
        }

        if (query.CreatedTo.HasValue)
        {
            var endOfDay = query.CreatedTo.Value.Date.AddDays(1).AddTicks(-1);
            leads = leads.Where(l => l.CreatedAt <= endOfDay);
        }

        if (query.LastActivityFrom.HasValue)
        {
            leads = leads.Where(l => l.LastActivityAt >= query.LastActivityFrom.Value.Date);
        }

        if (query.LastActivityTo.HasValue)
        {
            var endOfDay = query.LastActivityTo.Value.Date.AddDays(1).AddTicks(-1);
            leads = leads.Where(l => l.LastActivityAt <= endOfDay);
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
            .Include(l => l.NextFollowUpAssignedTo)
            .IgnoreQueryFilters()
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

    [HttpGet("{id:int}/score-breakdown")]
    public async Task<ActionResult<LeadScoreResultDto>> GetLeadScoreBreakdown(int id)
    {
        var lead = await _db.Leads
            .Include(l => l.Source)
            .Include(l => l.LeadStatus)
            .Include(l => l.Activities)
            .SingleOrDefaultAsync(l => l.LeadId == id);

        if (lead is null)
            return NotFound(new { message = "Lead not found." });

        if (!_currentUser.CanAccessOwnedRecord(lead.AssignedRepId))
            return Forbid();

        var result = _scoringService.CalculateScore(lead);
        if (lead.IsManualScore)
        {
            result.Score = lead.LeadScore;
            result.Rating = lead.LeadScore >= 70 ? "Hot" : lead.LeadScore >= 40 ? "Warm" : "Cold";
        }
        else if (lead.LeadScore != result.Score)
        {
            lead.LeadScore = result.Score;
            await _db.SaveChangesAsync();
        }

        return Ok(result);
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

        if (assignedRepId is null && _currentUser.UserId.HasValue)
        {
            assignedRepId = _currentUser.UserId;
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
            Priority = string.IsNullOrWhiteSpace(request.Priority) ? "Medium" : request.Priority.Trim(),
            LeadScore = request.LeadScore,
            NextFollowUpDate = request.NextFollowUpDate,
            NextFollowUpType = request.NextFollowUpType?.Trim(),
            NextFollowUpNotes = request.NextFollowUpNotes?.Trim(),
            NextFollowUpAssignedToId = request.NextFollowUpAssignedToId ?? assignedRepId,
            CreatedAt = DateTime.UtcNow,
            CreatedById = _currentUser.UserId,
            CustomFieldsJson = request.CustomFieldsJson
        };

        if (request.SourceId.HasValue)
        {
            lead.Source = await _db.Sources.FindAsync(request.SourceId.Value);
        }

        var scoreResult = _scoringService.CalculateScore(lead);
        if (request.LeadScore > 0)
        {
            lead.LeadScore = request.LeadScore;
            lead.IsManualScore = true;
        }
        else
        {
            lead.LeadScore = scoreResult.Score;
            lead.IsManualScore = false;
        }

        _db.Leads.Add(lead);
        await _db.SaveChangesAsync();

        await _db.Entry(lead).Reference(l => l.AssignedRep).LoadAsync();
        await _db.Entry(lead).Reference(l => l.Source).LoadAsync();
        await _db.Entry(lead).Reference(l => l.LeadStatus).LoadAsync();

        if (lead.AssignedRep != null)
        {
            await _emailTriggerService.SendLeadAssignedEmailAsync(lead, lead.AssignedRep);
        }

        return CreatedAtAction(nameof(GetLead), new { id = lead.LeadId }, ToDetailDto(lead));
    }

    [HttpGet("dashboard-metrics")]
    public async Task<ActionResult<LeadDashboardMetricsDto>> GetDashboardMetrics()
    {
        if (_currentUser.UserId is null)
        {
            return Unauthorized();
        }

        var leads = _db.Leads
            .AsNoTracking()
            .Where(l => !l.IsDeleted)
            .Include(l => l.LeadStatus)
            .AsQueryable();

        if (!_currentUser.IsAdmin)
        {
            if (_currentUser.IsManagerOrAbove)
            {
                leads = leads.Where(l => l.AssignedRepId == _currentUser.UserId || (l.AssignedRep != null && l.AssignedRep.ManagerId == _currentUser.UserId));
            }
            else
            {
                leads = leads.Where(l => l.AssignedRepId == _currentUser.UserId);
            }
        }

        var today = DateTime.UtcNow.Date;
        var now = DateTime.UtcNow;

        var totalLeads = await leads.CountAsync();
        var newLeads = await leads.CountAsync(l => l.LeadStatus != null && l.LeadStatus.Name == "New");
        var followUpToday = await leads.CountAsync(l => l.NextFollowUpDate.HasValue && l.NextFollowUpDate.Value.Date == today && (l.LeadStatus == null || !l.LeadStatus.IsTerminal));
        var overdueFollowUp = await leads.CountAsync(l => l.NextFollowUpDate.HasValue && l.NextFollowUpDate.Value < now && (l.LeadStatus == null || !l.LeadStatus.IsTerminal));
        var qualifiedLeads = await leads.CountAsync(l => l.LeadStatus != null && l.LeadStatus.Name == "Qualified");
        var convertedLeads = await leads.CountAsync(l => l.LeadStatus != null && l.LeadStatus.Name == "Converted");
        var lostLeads = await leads.CountAsync(l => l.LeadStatus != null && l.LeadStatus.Name == "Lost");

        double conversionRate = totalLeads > 0 ? Math.Round((double)convertedLeads / totalLeads * 100, 1) : 0;

        return Ok(new LeadDashboardMetricsDto(
            totalLeads,
            newLeads,
            followUpToday,
            overdueFollowUp,
            qualifiedLeads,
            convertedLeads,
            lostLeads,
            conversionRate
        ));
    }

    [HttpPost("{id:int}/follow-up")]
    public async Task<ActionResult<LeadDetailDto>> ScheduleFollowUp(int id, [FromBody] ScheduleFollowUpRequest request)
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

        var targetRepId = request.AssignedToId ?? lead.AssignedRepId ?? _currentUser.UserId;

        lead.NextFollowUpDate = request.FollowUpDate;
        lead.NextFollowUpType = request.FollowUpType;
        lead.NextFollowUpNotes = request.Notes;
        lead.NextFollowUpAssignedToId = targetRepId;
        lead.LastActivityAt = DateTime.UtcNow;

        if (lead.LeadStatus == null || !lead.LeadStatus.IsTerminal)
        {
            var followUpStatus = await _db.LeadStatuses.FirstOrDefaultAsync(s => s.Name == "Follow-up Scheduled");
            if (followUpStatus != null)
            {
                lead.LeadStatusId = followUpStatus.LeadStatusId;
            }
        }

        // Auto create/update CrmTask
        var existingTask = await _db.CrmTasks
            .FirstOrDefaultAsync(t => t.LeadId == lead.LeadId && t.Title.StartsWith("Follow-up"));

        var pendingStatus = await _db.CrmTaskStatuses.FirstOrDefaultAsync(s => s.Name == "Pending")
            ?? await _db.CrmTaskStatuses.FirstAsync();

        if (existingTask is null)
        {
            var newTask = new CrmTask
            {
                LeadId = lead.LeadId,
                Title = $"Follow-up ({request.FollowUpType}): {lead.FirstName} {lead.LastName}",
                Description = request.Notes,
                DueDate = request.FollowUpDate,
                CrmTaskStatusId = pendingStatus.CrmTaskStatusId,
                AssignedToId = targetRepId,
                CreatedById = _currentUser.UserId ?? 1,
                CreatedAt = DateTime.UtcNow
            };
            _db.CrmTasks.Add(newTask);
        }
        else
        {
            existingTask.Title = $"Follow-up ({request.FollowUpType}): {lead.FirstName} {lead.LastName}";
            existingTask.Description = request.Notes;
            existingTask.DueDate = request.FollowUpDate;
            existingTask.AssignedToId = targetRepId;
            existingTask.CrmTaskStatusId = pendingStatus.CrmTaskStatusId;
        }

        // Auto log activity
        var callActivityType = await _db.ActivityTypes.FirstOrDefaultAsync(a => a.Name == "Call")
            ?? await _db.ActivityTypes.FirstAsync();
        var activity = new Activity
        {
            LeadId = lead.LeadId,
            ActivityTypeId = callActivityType.ActivityTypeId,
            Subject = $"Follow-up Scheduled ({request.FollowUpType})",
            Description = $"Scheduled for {request.FollowUpDate:yyyy-MM-dd HH:mm}. Notes: {request.Notes}",
            ActivityDate = DateTime.UtcNow,
            DurationMinutes = 15,
            CreatedById = _currentUser.UserId ?? 1,
            CreatedAt = DateTime.UtcNow
        };
        _db.Activities.Add(activity);

        await _db.SaveChangesAsync();

        if (_currentUser.UserId.HasValue)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Lead");
            if (entityType != null)
            {
                await _auditService.LogFieldChangeAsync(entityType.EntityTypeId, lead.LeadId, "NextFollowUpDate", null, request.FollowUpDate.ToString("o"), "Update", _currentUser.UserId.Value);
            }
        }

        await _db.Entry(lead).Reference(l => l.AssignedRep).LoadAsync();
        await _db.Entry(lead).Reference(l => l.Source).LoadAsync();
        await _db.Entry(lead).Reference(l => l.LeadStatus).LoadAsync();
        await _db.Entry(lead).Reference(l => l.NextFollowUpAssignedTo).LoadAsync();

        return Ok(ToDetailDto(lead));
    }

    [HttpPost("{id:int}/complete-follow-up")]
    public async Task<ActionResult<LeadDetailDto>> CompleteFollowUp(int id)
    {
        var lead = await _db.Leads
            .Include(l => l.AssignedRep)
            .Include(l => l.Source)
            .Include(l => l.LeadStatus)
            .Include(l => l.NextFollowUpAssignedTo)
            .SingleOrDefaultAsync(l => l.LeadId == id);

        if (lead is null)
        {
            return NotFound(new { message = "Lead not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(lead.AssignedRepId))
        {
            return Forbid();
        }

        var oldType = lead.NextFollowUpType ?? "Follow-Up";
        var oldDate = lead.NextFollowUpDate;

        // Clear next follow up date
        lead.NextFollowUpDate = null;
        lead.NextFollowUpType = null;
        lead.NextFollowUpNotes = null;
        lead.NextFollowUpAssignedToId = null;
        lead.LastActivityAt = DateTime.UtcNow;

        // Complete matching CrmTask if exists
        var existingTask = await _db.CrmTasks
            .FirstOrDefaultAsync(t => t.LeadId == lead.LeadId && t.Title.StartsWith("Follow-up"));

        if (existingTask != null)
        {
            var completedStatus = await _db.CrmTaskStatuses.FirstOrDefaultAsync(s => s.IsTerminal)
                ?? await _db.CrmTaskStatuses.FirstAsync();
            existingTask.CrmTaskStatusId = completedStatus.CrmTaskStatusId;
        }

        // Auto log activity for completion
        var callActivityType = await _db.ActivityTypes.FirstOrDefaultAsync(a => a.Name == "Call")
            ?? await _db.ActivityTypes.FirstAsync();
        var activity = new Activity
        {
            LeadId = lead.LeadId,
            ActivityTypeId = callActivityType.ActivityTypeId,
            Subject = $"Follow-up Completed ({oldType})",
            Description = oldDate.HasValue ? $"Completed follow-up originally scheduled for {oldDate.Value:yyyy-MM-dd HH:mm}." : "Completed follow-up.",
            ActivityDate = DateTime.UtcNow,
            DurationMinutes = 15,
            CreatedById = _currentUser.UserId ?? 1,
            CreatedAt = DateTime.UtcNow
        };
        _db.Activities.Add(activity);

        await _db.SaveChangesAsync();

        if (_currentUser.UserId.HasValue)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Lead");
            if (entityType != null)
            {
                await _auditService.LogFieldChangeAsync(entityType.EntityTypeId, lead.LeadId, "NextFollowUpDate", oldDate?.ToString("o"), null, "Update", _currentUser.UserId.Value);
            }
        }

        return Ok(ToDetailDto(lead));
    }

    [HttpPost("{id:int}/lost")]
    public async Task<ActionResult<LeadDetailDto>> MarkLeadLost(int id, [FromBody] MarkLeadLostRequest request)
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

        var lostStatus = await _db.LeadStatuses.FirstOrDefaultAsync(s => s.Name == "Lost");
        if (lostStatus is null)
        {
            return BadRequest(new { message = "Lost status not found in system." });
        }

        var oldStatusName = lead.LeadStatus?.Name ?? "Active";
        lead.LeadStatusId = lostStatus.LeadStatusId;
        lead.LostReason = request.LostReason.Trim();
        lead.LastActivityAt = DateTime.UtcNow;

        var callActivityType = await _db.ActivityTypes.FirstOrDefaultAsync(a => a.Name == "Call")
            ?? await _db.ActivityTypes.FirstAsync();
        var activity = new Activity
        {
            LeadId = lead.LeadId,
            ActivityTypeId = callActivityType.ActivityTypeId,
            Subject = "Lead Marked as Lost",
            Description = $"Reason: {request.LostReason.Trim()}",
            ActivityDate = DateTime.UtcNow,
            DurationMinutes = 0,
            CreatedById = _currentUser.UserId ?? 1,
            CreatedAt = DateTime.UtcNow
        };
        _db.Activities.Add(activity);

        await _db.SaveChangesAsync();

        if (_currentUser.UserId.HasValue)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Lead");
            if (entityType != null)
            {
                await _auditService.LogFieldChangeAsync(entityType.EntityTypeId, lead.LeadId, "LeadStatus", oldStatusName, "Lost", "Update", _currentUser.UserId.Value);
                await _auditService.LogFieldChangeAsync(entityType.EntityTypeId, lead.LeadId, "LostReason", null, request.LostReason.Trim(), "Update", _currentUser.UserId.Value);
            }
        }

        return Ok(ToDetailDto(lead));
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

        int? targetAssignedRepId = lead.AssignedRepId;
        if (request.AssignedRepId.HasValue)
        {
            var (isValid, resolvedId) = await ResolveAssignedRepIdAsync(request.AssignedRepId);
            if (!isValid)
            {
                return BadRequest(new { message = "Assigned rep is invalid." });
            }
            targetAssignedRepId = resolvedId;
        }

        if (!_currentUser.IsManagerOrAbove && targetAssignedRepId != lead.AssignedRepId)
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
        lead.AssignedRepId = targetAssignedRepId;
        lead.Notes = request.Notes?.Trim();
        if (!string.IsNullOrWhiteSpace(request.Priority)) lead.Priority = request.Priority.Trim();
        lead.CustomFieldsJson = request.CustomFieldsJson;

        if (request.SourceId.HasValue && (lead.Source == null || lead.Source.SourceId != request.SourceId.Value))
        {
            lead.Source = await _db.Sources.FindAsync(request.SourceId.Value);
        }

        var scoreResult = _scoringService.CalculateScore(lead);
        if (request.LeadScore > 0)
        {
            lead.LeadScore = request.LeadScore;
            lead.IsManualScore = true;
        }
        else
        {
            lead.LeadScore = scoreResult.Score;
            lead.IsManualScore = false;
        }

        if (lead.ConvertedCustomerId.HasValue)
        {
            var convCustomer = await _db.Customers.FindAsync(lead.ConvertedCustomerId.Value);
            if (convCustomer is not null) convCustomer.SourceId = request.SourceId;
        }

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

        await _db.Entry(lead).Reference(l => l.AssignedRep).LoadAsync();
        await _db.Entry(lead).Reference(l => l.Source).LoadAsync();
        await _db.Entry(lead).Reference(l => l.LeadStatus).LoadAsync();
        await _db.Entry(lead).Reference(l => l.NextFollowUpAssignedTo).LoadAsync();

        if (oldAssignedRepId != lead.AssignedRepId && lead.AssignedRep != null)
        {
            await _emailTriggerService.SendLeadAssignedEmailAsync(lead, lead.AssignedRep);
        }

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

        var query = _db.AuditLogs
            .Include(a => a.AuditActionType)
            .Include(a => a.ChangedBy)
            .Where(a => !a.IsDeleted)
            .AsQueryable();

        query = query.Where(a =>
            leadEntityType != null && a.EntityTypeId == leadEntityType.EntityTypeId && a.EntityId == id);

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

        var oldStatusName = lead.LeadStatus?.Name ?? "New";

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

            // Check if a company with matching name already exists to prevent duplicate companies
            var existingCompany = await _db.Companies
                .FirstOrDefaultAsync(c => c.Name.ToLower() == companyName.ToLower());
            if (existingCompany is not null)
            {
                companyId = existingCompany.CompanyId;
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

        var openTasks = await _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Where(t => t.LeadId == id && (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal))
            .ToListAsync();
        _db.CrmTasks.RemoveRange(openTasks);

        await _db.SaveChangesAsync();

        // Log deletion audit
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Lead");
            if (entityType is not null)
            {
                var summary = $"Lead: \"{lead.FirstName} {lead.LastName}\" | Email: {lead.Email ?? "N/A"} | Company: {lead.CompanyName ?? "N/A"} | Status: {lead.LeadStatus?.Name ?? "N/A"}";
                await _auditService.LogDeletionAsync(entityType.EntityTypeId, lead.LeadId, _currentUser.UserId.Value, summary);
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

        if (requestedRepId is null || requestedRepId <= 0)
        {
            return (true, null);
        }

        var repExists = await _db.Identities
            .AnyAsync(u => u.IdentityId == requestedRepId);

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
            lead.Priority,
            lead.LeadScore,
            lead.LostReason,
            lead.NextFollowUpDate,
            lead.NextFollowUpType,
            lead.NextFollowUpNotes,
            lead.NextFollowUpAssignedToId,
            lead.NextFollowUpAssignedTo?.Name,
            lead.LastActivityAt,
            lead.CreatedAt,
            lead.IsDeleted,
            lead.CustomFieldsJson);

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
            lead.Priority,
            lead.LeadScore,
            lead.LostReason,
            lead.NextFollowUpDate,
            lead.NextFollowUpType,
            lead.NextFollowUpNotes,
            lead.NextFollowUpAssignedToId,
            lead.NextFollowUpAssignedTo?.Name,
            lead.LastActivityAt,
            lead.CreatedAt,
            lead.IsDeleted,
            lead.CustomFieldsJson);
}