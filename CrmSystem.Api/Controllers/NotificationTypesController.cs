using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationTypesController : ControllerBase
{
    private readonly AppDbContext _db;
    public NotificationTypesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var types = await _db.NotificationTypes
            .OrderBy(n => n.Name)
            .Select(n => new { Id = n.NotificationTypeId, n.Name, n.DefaultChannel })
            .ToListAsync();
        return Ok(types);
    }

    [HttpPost]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> Create([FromBody] NotificationType dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required." });

        if (await _db.NotificationTypes.AnyAsync(n => n.Name == dto.Name))
            return Conflict(new { message = "Notification type already exists." });

        var entity = new NotificationType { Name = dto.Name.Trim(), DefaultChannel = dto.DefaultChannel?.Trim() };
        _db.NotificationTypes.Add(entity);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = entity.NotificationTypeId }, new { entity.NotificationTypeId });
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> Update(int id, [FromBody] NotificationType dto)
    {
        var existing = await _db.NotificationTypes.FindAsync(id);
        if (existing is null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required." });

        existing.Name = dto.Name.Trim();
        existing.DefaultChannel = dto.DefaultChannel?.Trim();
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _db.NotificationTypes.FindAsync(id);
        if (existing is null) return NotFound();
        _db.NotificationTypes.Remove(existing);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
