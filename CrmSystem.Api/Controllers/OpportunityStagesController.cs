using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using CrmSystem.Api.Services;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RepOrAbove")]
public class OpportunityStagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public OpportunityStagesController(AppDbContext db, ICurrentUserService currentUser, IAuditService auditService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OpportunityStage>>> GetAll()
    {
        var stages = await _db.OpportunityStages
            .OrderBy(s => s.SortOrder)
            .ToListAsync();
        return Ok(stages);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OpportunityStage>> Get(int id)
    {
        var stage = await _db.OpportunityStages.FindAsync(id);
        if (stage == null)
            return NotFound(new { message = "Opportunity stage not found." });

        return Ok(stage);
    }

    [HttpPost]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<ActionResult<OpportunityStage>> Create([FromBody] CreateOpportunityStageRequest request)
    {
        if (_currentUser.UserId is null)
            return Unauthorized();

        var stage = new OpportunityStage
        {
            Name = request.Name.Trim(),
            SortOrder = request.SortOrder,
            IsWon = request.IsWon,
            IsLost = request.IsLost
        };

        _db.OpportunityStages.Add(stage);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = stage.OpportunityStageId }, stage);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<ActionResult<OpportunityStage>> Update(int id, [FromBody] UpdateOpportunityStageRequest request)
    {
        var stage = await _db.OpportunityStages.FindAsync(id);
        if (stage == null)
            return NotFound(new { message = "Opportunity stage not found." });

        var oldName = stage.Name;
        var oldSortOrder = stage.SortOrder;
        var oldIsWon = stage.IsWon;
        var oldIsLost = stage.IsLost;

        stage.Name = request.Name.Trim();
        stage.SortOrder = request.SortOrder;
        stage.IsWon = request.IsWon;
        stage.IsLost = request.IsLost;

        await _db.SaveChangesAsync();

        // Log field changes
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "OpportunityStage");
            if (entityType is not null)
            {
                if (oldName != stage.Name)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: stage.OpportunityStageId,
                        fieldName: "Name",
                        oldValue: oldName,
                        newValue: stage.Name,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldSortOrder != stage.SortOrder)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: stage.OpportunityStageId,
                        fieldName: "SortOrder",
                        oldValue: oldSortOrder.ToString(),
                        newValue: stage.SortOrder.ToString(),
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldIsWon != stage.IsWon)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: stage.OpportunityStageId,
                        fieldName: "IsWon",
                        oldValue: oldIsWon.ToString(),
                        newValue: stage.IsWon.ToString(),
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldIsLost != stage.IsLost)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: stage.OpportunityStageId,
                        fieldName: "IsLost",
                        oldValue: oldIsLost.ToString(),
                        newValue: stage.IsLost.ToString(),
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }
            }
        }

        return Ok(stage);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> Delete(int id)
    {
        var stage = await _db.OpportunityStages.FindAsync(id);
        if (stage == null)
            return NotFound(new { message = "Opportunity stage not found." });

        // Check if stage is in use
        if (await _db.Opportunities.AnyAsync(o => o.OpportunityStageId == id))
        {
            return BadRequest(new { message = "Cannot delete stage that is in use by opportunities." });
        }

        // Log deletion audit
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "OpportunityStage");
            if (entityType is not null)
            {
                await _auditService.LogDeletionAsync(entityType.EntityTypeId, stage.OpportunityStageId, _currentUser.UserId.Value);
            }
        }

        _db.OpportunityStages.Remove(stage);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}

public class CreateOpportunityStageRequest
{
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsWon { get; set; } = false;
    public bool IsLost { get; set; } = false;
}

public class UpdateOpportunityStageRequest
{
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsWon { get; set; }
    public bool IsLost { get; set; }
}
