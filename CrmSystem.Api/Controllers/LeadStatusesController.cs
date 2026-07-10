using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LeadStatusesController : ControllerBase
{
    private readonly AppDbContext _db;

    public LeadStatusesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetLeadStatuses()
    {
        var statuses = await _db.LeadStatuses.OrderBy(ls => ls.SortOrder)
            .Select(ls => new { Id = ls.LeadStatusId, ls.Name, ls.SortOrder, ls.IsTerminal })
            .ToListAsync();
        return Ok(statuses);
    }

    [HttpPost]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> CreateLeadStatus([FromBody] LeadStatus status)
    {
        if (string.IsNullOrWhiteSpace(status.Name))
        {
            return BadRequest(new { message = "Lead status name is required." });
        }

        if (await _db.LeadStatuses.AnyAsync(ls => ls.Name == status.Name))
        {
            return Conflict(new { message = "Lead status already exists." });
        }

        _db.LeadStatuses.Add(status);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetLeadStatuses), new { id = status.LeadStatusId }, new { status.LeadStatusId });
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> UpdateLeadStatus(int id, [FromBody] LeadStatus status)
    {
        var existing = await _db.LeadStatuses.FindAsync(id);
        if (existing is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(status.Name))
        {
            return BadRequest(new { message = "Lead status name is required." });
        }

        existing.Name = status.Name;
        existing.SortOrder = status.SortOrder;
        existing.IsTerminal = status.IsTerminal;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
