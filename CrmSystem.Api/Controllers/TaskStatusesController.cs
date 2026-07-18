using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TaskStatusesController : ControllerBase
{
    private readonly AppDbContext _db;
    public TaskStatusesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var statuses = await _db.CrmTaskStatuses
            .OrderBy(s => s.Name)
            .Select(s => new { Id = s.CrmTaskStatusId, s.Name, s.IsTerminal })
            .ToListAsync();
        return Ok(statuses);
    }

    [HttpPost]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> Create([FromBody] CrmTaskStatus dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required." });

        if (await _db.CrmTaskStatuses.AnyAsync(s => s.Name == dto.Name))
            return Conflict(new { message = "Task status already exists." });

        var entity = new CrmTaskStatus { Name = dto.Name.Trim(), IsTerminal = dto.IsTerminal };
        _db.CrmTaskStatuses.Add(entity);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = entity.CrmTaskStatusId }, new { entity.CrmTaskStatusId });
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> Update(int id, [FromBody] CrmTaskStatus dto)
    {
        var existing = await _db.CrmTaskStatuses.FindAsync(id);
        if (existing is null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required." });

        existing.Name = dto.Name.Trim();
        existing.IsTerminal = dto.IsTerminal;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _db.CrmTaskStatuses.FindAsync(id);
        if (existing is null) return NotFound();
        _db.CrmTaskStatuses.Remove(existing);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
