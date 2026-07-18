using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ActivityTypesController : ControllerBase
{
    private readonly AppDbContext _db;
    public ActivityTypesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var types = await _db.ActivityTypes
            .OrderBy(a => a.Name)
            .Select(a => new { Id = a.ActivityTypeId, a.Name, a.Icon })
            .ToListAsync();
        return Ok(types);
    }

    [HttpPost]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> Create([FromBody] ActivityType dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required." });

        if (await _db.ActivityTypes.AnyAsync(a => a.Name == dto.Name))
            return Conflict(new { message = "Activity type already exists." });

        var entity = new ActivityType { Name = dto.Name.Trim(), Icon = dto.Icon?.Trim() };
        _db.ActivityTypes.Add(entity);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = entity.ActivityTypeId }, new { entity.ActivityTypeId });
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> Update(int id, [FromBody] ActivityType dto)
    {
        var existing = await _db.ActivityTypes.FindAsync(id);
        if (existing is null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required." });

        existing.Name = dto.Name.Trim();
        existing.Icon = dto.Icon?.Trim();
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _db.ActivityTypes.FindAsync(id);
        if (existing is null) return NotFound();
        _db.ActivityTypes.Remove(existing);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
