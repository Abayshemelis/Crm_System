using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrmSystem.Domain.Dtos.Opportunity;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using CrmSystem.Api.Services;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RepOrAbove")]
public class OpportunitiesController : ControllerBase
{
    private readonly IOpportunityService _service;
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public OpportunitiesController(IOpportunityService service, AppDbContext db, ICurrentUserService currentUser, IAuditService auditService)
    {
        _service = service;
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OpportunityReadDto>>> GetAll(
        [FromQuery] int? customerId,
        [FromQuery] int? companyId,
        [FromQuery] int? ownerId,
        [FromQuery] int? opportunityStageId,
        [FromQuery] DateTime? expectedCloseDateFrom,
        [FromQuery] DateTime? expectedCloseDateTo,
        [FromQuery] DateTime? createdDateFrom,
        [FromQuery] DateTime? createdDateTo,
        [FromQuery] decimal? minValue,
        [FromQuery] decimal? maxValue,
        [FromQuery] DateTime? lastActivityFrom,
        [FromQuery] DateTime? lastActivityTo,
        [FromQuery] int? sourceId)
    {
        var list = await _service.GetAllAsync(
            customerId, companyId, ownerId, opportunityStageId,
            expectedCloseDateFrom, expectedCloseDateTo,
            createdDateFrom, createdDateTo,
            minValue, maxValue,
            lastActivityFrom, lastActivityTo,
            sourceId);
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OpportunityReadDto>> Get(int id)
    {
        var opp = await _service.GetByIdAsync(id);
        if (opp == null) return NotFound();
        return Ok(opp);
    }

    [HttpPost]
    public async Task<ActionResult<OpportunityReadDto>> Create([FromBody] OpportunityCreateDto dto)
    {
        // Set default owner to current user if not specified
        if (dto.OwnerId == 0 && _currentUser.UserId.HasValue)
        {
            dto.OwnerId = _currentUser.UserId.Value;
        }

        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = created.OpportunityId }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] OpportunityUpdateDto dto)
    {
        var opp = await _db.Opportunities
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.OpportunityId == id);

        if (opp == null) return NotFound();

        // Capture old values for audit logging BEFORE the update
        var oldOwnerId           = opp.OwnerId;
        var oldTitle             = opp.Title;
        var oldDescription       = opp.Description;
        var oldStageId           = opp.OpportunityStageId;
        var oldEstimatedValue    = opp.EstimatedValue;
        var oldExpectedCloseDate = opp.ExpectedCloseDate;

        var success = await _service.UpdateAsync(id, dto);
        if (!success) return NotFound();

        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Opportunity");
            if (entityType is not null)
            {
                // Build list of changed fields
                var changes = new List<(string Field, string? OldValue, string? NewValue)>();

                if (dto.Title != null && dto.Title != oldTitle)
                    changes.Add(("Title", oldTitle, dto.Title));

                if (dto.Description != null && dto.Description != oldDescription)
                    changes.Add(("Description", oldDescription, dto.Description));

                if (dto.OpportunityStageId.HasValue && dto.OpportunityStageId.Value != oldStageId)
                    changes.Add(("OpportunityStageId", oldStageId.ToString(), dto.OpportunityStageId.Value.ToString()));

                if (dto.EstimatedValue.HasValue && dto.EstimatedValue.Value != oldEstimatedValue)
                    changes.Add(("EstimatedValue", oldEstimatedValue.ToString("F2"), dto.EstimatedValue.Value.ToString("F2")));

                if (dto.ExpectedCloseDate.HasValue && dto.ExpectedCloseDate.Value != oldExpectedCloseDate)
                    changes.Add(("ExpectedCloseDate", oldExpectedCloseDate?.ToString("o"), dto.ExpectedCloseDate.Value.ToString("o")));

                if (changes.Count > 0)
                {
                    await _auditService.LogFieldChangesAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: id,
                        changes: changes,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                // Log owner reassignment separately
                if (dto.OwnerId.HasValue && dto.OwnerId.Value != oldOwnerId)
                {
                    await _auditService.LogAssignmentAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: id,
                        oldRepId: oldOwnerId,
                        newRepId: dto.OwnerId.Value,
                        changedById: _currentUser.UserId.Value);
                }
            }
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var opp = await _db.Opportunities.FindAsync(id);
        if (opp == null) return NotFound();

        // Log deletion audit before deleting
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Opportunity");
            if (entityType is not null)
            {
                await _auditService.LogDeletionAsync(entityType.EntityTypeId, opp.OpportunityId, _currentUser.UserId.Value);
            }
        }

        var success = await _service.DeleteAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpGet("{id}/audit")]
    public async Task<ActionResult> GetAuditLogs(int id)
    {
        var opp = await _db.Opportunities.FindAsync(id);
        if (opp == null)
        {
            return NotFound(new { message = "Opportunity not found." });
        }

        var oppEntityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Opportunity");
        var leadEntityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Lead");

        var lead = await _db.Leads
            .FirstOrDefaultAsync(l => l.ConvertedOpportunityId == id);

        int? leadId = lead?.LeadId;

        var query = _db.AuditLogs
            .Include(a => a.AuditActionType)
            .Include(a => a.ChangedBy)
            .Where(a => !a.IsDeleted)
            .AsQueryable();

        query = query.Where(a =>
            (oppEntityType != null && a.EntityTypeId == oppEntityType.EntityTypeId && a.EntityId == id) ||
            (leadEntityType != null && leadId.HasValue && a.EntityTypeId == leadEntityType.EntityTypeId && a.EntityId == leadId.Value));

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

    [HttpDelete("{id}/audit")]
    public async Task<IActionResult> ClearHistory(int id)
    {
        var opp = await _db.Opportunities.FindAsync(id);
        if (opp == null)
        {
            return NotFound(new { message = "Opportunity not found." });
        }

        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Opportunity");
        if (entityType is null)
        {
            return Ok(new { message = "History cleared." });
        }

        if (_currentUser.UserId is not null)
        {
            await _auditService.ClearHistoryAsync(entityType.EntityTypeId, opp.OpportunityId, _currentUser.UserId.Value);
        }

        return Ok(new { message = "History cleared." });
    }

    [HttpPatch("{id}/stage")]
    public async Task<IActionResult> UpdateStage(int id, [FromBody] UpdateStageRequest request)
    {
        var opp = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .SingleOrDefaultAsync(o => o.OpportunityId == id);

        if (opp == null)
        {
            return NotFound(new { message = "Opportunity not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(opp.OwnerId))
        {
            return Forbid();
        }

        if (_currentUser.UserId is null)
        {
            return Unauthorized();
        }

        var newStage = await _db.OpportunityStages.FindAsync(request.StageId);
        if (newStage == null)
        {
            return BadRequest(new { message = "Stage not found." });
        }

        var oldStageId = opp.OpportunityStageId;
        var oldActualCloseDate = opp.ActualCloseDate;

        // Set ActualCloseDate automatically
        if (newStage.IsWon || newStage.IsLost)
        {
            opp.ActualCloseDate = DateTime.UtcNow;
        }
        else
        {
            opp.ActualCloseDate = null;
        }

        // Update opportunity stage
        opp.OpportunityStageId = request.StageId;
        opp.UpdatedAt = DateTime.UtcNow;

        // Create StageHistory entry
        var stageHistory = new StageHistory
        {
            OpportunityId = opp.OpportunityId,
            OldStageId = oldStageId,
            NewStageId = newStage.OpportunityStageId,
            ChangedAt = DateTime.UtcNow,
            ChangedById = _currentUser.UserId.Value
        };

        _db.StageHistories.Add(stageHistory);

        // Audit Logging
        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Opportunity");
        if (entityType is not null)
        {
            var changes = new List<(string Field, string? OldValue, string? NewValue)>
            {
                ("OpportunityStageId", oldStageId.ToString(), newStage.OpportunityStageId.ToString())
            };
            
            if (oldActualCloseDate != opp.ActualCloseDate)
            {
                changes.Add(("ActualCloseDate", oldActualCloseDate?.ToString("o"), opp.ActualCloseDate?.ToString("o")));
            }

            await _auditService.LogFieldChangesAsync(
                entityTypeId: entityType.EntityTypeId,
                entityId: id,
                changes: changes,
                actionTypeName: "Update",
                changedById: _currentUser.UserId.Value);
        }

        await _db.SaveChangesAsync();

        return NoContent();
    }
}
