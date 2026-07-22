using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Notification;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RepOrAbove")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _service;
    private readonly ICurrentUserService _currentUser;

    public NotificationsController(INotificationService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    /// <summary>GET /api/notifications  — latest 30, newest first</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NotificationReadDto>>> GetMine()
    {
        if (!_currentUser.UserId.HasValue) return Unauthorized();
        return Ok(await _service.GetForUserAsync(_currentUser.UserId.Value));
    }

    /// <summary>GET /api/notifications/count  — unread count</summary>
    [HttpGet("count")]
    public async Task<ActionResult<NotificationCountDto>> GetUnreadCount()
    {
        if (!_currentUser.UserId.HasValue) return Unauthorized();
        var count = await _service.GetUnreadCountAsync(_currentUser.UserId.Value);
        return Ok(new NotificationCountDto { UnreadCount = count });
    }

    /// <summary>PATCH /api/notifications/{id}/read</summary>
    [HttpPatch("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        if (!_currentUser.UserId.HasValue) return Unauthorized();
        await _service.MarkReadAsync(id, _currentUser.UserId.Value);
        return NoContent();
    }

    /// <summary>POST /api/notifications/read-all</summary>
    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        if (!_currentUser.UserId.HasValue) return Unauthorized();
        await _service.MarkAllReadAsync(_currentUser.UserId.Value);
        return NoContent();
    }
}
