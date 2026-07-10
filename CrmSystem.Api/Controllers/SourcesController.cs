using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SourcesController : ControllerBase
{
    private readonly AppDbContext _db;

    public SourcesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetSources()
    {
        var sources = await _db.Sources.OrderBy(s => s.Name)
            .Select(s => new { Id = s.SourceId, s.Name })
            .ToListAsync();
        return Ok(sources);
    }

    [HttpPost]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> CreateSource([FromBody] Source source)
    {
        if (string.IsNullOrWhiteSpace(source.Name))
        {
            return BadRequest(new { message = "Source name is required." });
        }

        if (await _db.Sources.AnyAsync(s => s.Name == source.Name))
        {
            return Conflict(new { message = "Source already exists." });
        }

        source.IsActive = true;
        _db.Sources.Add(source);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSources), new { id = source.SourceId }, new { source.SourceId });
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> UpdateSource(int id, [FromBody] Source source)
    {
        var existing = await _db.Sources.FindAsync(id);
        if (existing is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(source.Name))
        {
            return BadRequest(new { message = "Source name is required." });
        }

        existing.Name = source.Name;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
