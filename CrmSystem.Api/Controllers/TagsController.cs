using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TagsController : ControllerBase
{
    private readonly AppDbContext _context;

    public TagsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetTags()
    {
        var tags = await _context.Tags.Select(t => new { Id = t.TagId, t.Name, ColorHex = "#3b82f6" }).ToListAsync();
        return Ok(tags);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTag([FromBody] Tag tag)
    {
        if (string.IsNullOrWhiteSpace(tag.Name))
        {
            return BadRequest(new { message = "Tag name is required." });
        }

        if (await _context.Tags.AnyAsync(t => t.Name == tag.Name))
        {
            return Conflict(new { message = "Tag already exists." });
        }

        _context.Tags.Add(tag);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetTags), new { id = tag.TagId }, new { tag.TagId });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateTag(int id, [FromBody] Tag tag)
    {
        var existing = await _context.Tags.FindAsync(id);
        if (existing is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(tag.Name))
        {
            return BadRequest(new { message = "Tag name is required." });
        }

        existing.Name = tag.Name;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTag(int id)
    {
        var existing = await _context.Tags.FindAsync(id);
        if (existing is null)
        {
            return NotFound();
        }

        _context.Tags.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
