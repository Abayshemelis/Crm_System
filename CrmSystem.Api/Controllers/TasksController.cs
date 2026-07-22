using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Task;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RepOrAbove")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _service;
    private readonly ICurrentUserService _currentUser;

    public TasksController(ITaskService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    /// <summary>GET /api/tasks/my  — grouped: Overdue, DueToday, Upcoming (current user)</summary>
    [HttpGet("my")]
    public async Task<ActionResult<TaskGroupedDto>> GetMyTasks()
    {
        if (!_currentUser.UserId.HasValue) return Unauthorized();
        return Ok(await _service.GetMyTasksAsync(_currentUser.UserId.Value));
    }

    /// <summary>GET /api/tasks/assignee/{id}  — grouped tasks for any user (managers)</summary>
    [HttpGet("assignee/{assigneeId:int}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<ActionResult<TaskGroupedDto>> GetByAssignee(int assigneeId)
        => Ok(await _service.GetByAssigneeAsync(assigneeId));

    /// <summary>GET /api/tasks/calendar?year=&month=&assignedToId=</summary>
    [HttpGet("calendar")]
    public async Task<ActionResult<List<CalendarDayDto>>> GetCalendar(
        [FromQuery] int year,
        [FromQuery] int month,
        [FromQuery] int? assignedToId)
    {
        if (year == 0) year = DateTime.UtcNow.Year;
        if (month == 0) month = DateTime.UtcNow.Month;
        return Ok(await _service.GetCalendarAsync(year, month, assignedToId));
    }

    /// <summary>GET /api/tasks?customerId=&opportunityId=</summary>
    [HttpGet]
    public async Task<IActionResult> GetScoped(
        [FromQuery] int? customerId,
        [FromQuery] int? opportunityId)
    {
        if (customerId.HasValue)
            return Ok(await _service.GetByCustomerAsync(customerId.Value));
        if (opportunityId.HasValue)
            return Ok(await _service.GetByOpportunityAsync(opportunityId.Value));
        return BadRequest(new { message = "Provide customerId or opportunityId." });
    }

    /// <summary>POST /api/tasks</summary>
    [HttpPost]
    public async Task<ActionResult<TaskReadDto>> Create([FromBody] TaskCreateDto dto)
    {
        if (!_currentUser.UserId.HasValue) return Unauthorized();
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required." });

        var result = await _service.CreateAsync(dto, _currentUser.UserId.Value);
        return CreatedAtAction(nameof(GetMyTasks), new { }, result);
    }

    /// <summary>PUT /api/tasks/{id}</summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<TaskReadDto>> Update(int id, [FromBody] TaskUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required." });

        var result = await _service.UpdateAsync(id, dto);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>PATCH /api/tasks/{id}/complete</summary>
    [HttpPatch("{id:int}/complete")]
    public async Task<ActionResult<TaskReadDto>> Complete(int id, [FromBody] CrmSystem.Domain.Dtos.Task.TaskCompleteDto? dto)
    {
        if (!_currentUser.UserId.HasValue) return Unauthorized();
        var result = await _service.CompleteAsync(id, dto?.CompletionNote, _currentUser.UserId.Value);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>PATCH /api/tasks/{id}/cancel</summary>
    [HttpPatch("{id:int}/cancel")]
    public async Task<ActionResult<TaskReadDto>> Cancel(int id, [FromBody] CrmSystem.Domain.Dtos.Task.TaskCancelDto? dto)
    {
        if (!_currentUser.UserId.HasValue) return Unauthorized();
        var result = await _service.CancelAsync(id, dto?.CancellationNote);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>DELETE /api/tasks/{id}</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
