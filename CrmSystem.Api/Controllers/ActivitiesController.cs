using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Activity;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RepOrAbove")]
public class ActivitiesController : ControllerBase
{
    private readonly IActivityService _service;
    private readonly ICurrentUserService _currentUser;

    public ActivitiesController(IActivityService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    /// <summary>
    /// GET /api/activities?customerId=&opportunityId=
    /// Returns merged, reverse-chronological timeline.
    /// At least one filter is required.
    /// </summary>
    [HttpGet("timeline")]
    public async Task<IActionResult> GetTimeline(
        [FromQuery] int? customerId,
        [FromQuery] int? opportunityId)
    {
        if (!customerId.HasValue && !opportunityId.HasValue)
            return BadRequest(new { message = "Provide customerId or opportunityId." });

        var result = await _service.GetTimelineAsync(customerId, opportunityId);
        return Ok(result);
    }

    /// <summary>
    /// GET /api/activities
    /// Returns all activities for dropdown selection.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ActivityReadDto>>> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(result);
    }

    /// <summary>POST /api/activities</summary>
    [HttpPost]
    public async Task<ActionResult<ActivityReadDto>> Create([FromBody] ActivityCreateDto dto)
    {
        if (!_currentUser.UserId.HasValue)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Subject))
            return BadRequest(new { message = "Subject is required." });

        var result = await _service.CreateAsync(dto, _currentUser.UserId.Value);
        return CreatedAtAction(nameof(GetTimeline), new { customerId = result.CustomerId }, result);
    }

    /// <summary>DELETE /api/activities/{id}</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!_currentUser.UserId.HasValue)
            return Unauthorized();

        var deleted = await _service.DeleteAsync(id, _currentUser.UserId.Value, _currentUser.IsAdmin);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
