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
    public async Task<ActionResult<IReadOnlyList<OpportunityReadDto>>> GetAll()
    {
        var list = await _service.GetAllAsync();
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
        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = created.OpportunityId }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] OpportunityUpdateDto dto)
    {
        var opp = await _db.Opportunities.FindAsync(id);
        if (opp == null) return NotFound();

        // Capture old OwnerId for audit logging
        var oldOwnerId = opp.OwnerId;

        var success = await _service.UpdateAsync(id, dto);
        if (!success) return NotFound();

        // Log owner reassignment if OwnerId changed
        if (oldOwnerId != opp.OwnerId && _currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Opportunity");
            if (entityType is not null)
            {
                await _auditService.LogAssignmentAsync(
                    entityTypeId: entityType.EntityTypeId,
                    entityId: opp.OpportunityId,
                    oldRepId: oldOwnerId,
                    newRepId: opp.OwnerId,
                    changedById: _currentUser.UserId.Value);
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

        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Opportunity");
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
        await _db.SaveChangesAsync();

        return NoContent();
    }
}