using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrmSystem.Infrastructure;
using CrmSystem.Api.Services;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/audit-logs")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public AuditLogsController(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<AuditLogPagedResult>> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 1000,
        [FromQuery] string? entityTypeName = null,
        [FromQuery] string? auditActionTypeName = null,
        [FromQuery] int? changedById = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? search = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 5000) pageSize = 5000;

        var isAdmin = _currentUser.IsAdmin;
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;

        var query = _db.AuditLogs
            .Include(a => a.EntityType)
            .Include(a => a.AuditActionType)
            .Include(a => a.ChangedBy)
            .Where(a => !a.IsDeleted && (isAdmin || isManager || a.ChangedById == userId))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityTypeName))
        {
            query = query.Where(a => a.EntityType != null && a.EntityType.Name.ToLower() == entityTypeName.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(auditActionTypeName))
        {
            query = query.Where(a => a.AuditActionType != null && a.AuditActionType.Name.ToLower() == auditActionTypeName.ToLower());
        }

        if (changedById.HasValue)
        {
            query = query.Where(a => a.ChangedById == changedById.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(a => a.ChangedAt >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(a => a.ChangedAt <= toDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(a =>
                (a.FieldName != null && a.FieldName.ToLower().Contains(term)) ||
                (a.OldValue != null && a.OldValue.ToLower().Contains(term)) ||
                (a.NewValue != null && a.NewValue.ToLower().Contains(term)) ||
                (a.ChangedBy != null && a.ChangedBy.Name.ToLower().Contains(term)) ||
                (a.EntityType != null && a.EntityType.Name.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var items = await query
            .OrderByDescending(a => a.ChangedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto(
                a.AuditLogId,
                a.EntityTypeId,
                a.EntityType != null ? a.EntityType.Name : "Unknown",
                a.EntityId,
                a.FieldName,
                a.OldValue,
                a.NewValue,
                a.AuditActionTypeId,
                a.AuditActionType != null ? a.AuditActionType.Name : "Unknown",
                a.ChangedById,
                a.ChangedBy != null ? a.ChangedBy.Name : "Unknown",
                a.ChangedBy != null ? a.ChangedBy.Email : null,
                a.ChangedAt
            ))
            .ToListAsync();

        return Ok(new AuditLogPagedResult(items, totalCount, page, pageSize, totalPages));
    }

    [HttpDelete("clear")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ClearAuditLogs(
        [FromQuery] string? entityTypeName = null,
        [FromQuery] string? auditActionTypeName = null)
    {
        var query = _db.AuditLogs.Where(a => !a.IsDeleted).AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityTypeName) && entityTypeName != "All")
        {
            query = query.Where(a => a.EntityType != null && a.EntityType.Name.ToLower() == entityTypeName.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(auditActionTypeName) && auditActionTypeName != "All")
        {
            query = query.Where(a => a.AuditActionType != null && a.AuditActionType.Name.ToLower() == auditActionTypeName.ToLower());
        }

        var logsToClear = await query.ToListAsync();
        foreach (var log in logsToClear)
        {
            log.IsDeleted = true;
        }

        await _db.SaveChangesAsync();
        return Ok(new { clearedCount = logsToClear.Count, message = "Audit history cleared successfully." });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetAuditStats(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var isAdmin = _currentUser.IsAdmin;
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;

        var query = _db.AuditLogs
            .Include(a => a.EntityType)
            .Include(a => a.AuditActionType)
            .Include(a => a.ChangedBy)
            .Where(a => !a.IsDeleted && (isAdmin || isManager || a.ChangedById == userId))
            .AsQueryable();

        if (fromDate.HasValue) query = query.Where(a => a.ChangedAt >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(a => a.ChangedAt <= toDate.Value);

        var allLogs = await query.ToListAsync();

        var totalEvents = allLogs.Count;
        var createdCount = allLogs.Count(a => (a.AuditActionType != null && (a.AuditActionType.Name.Contains("Insert") || a.AuditActionType.Name.Contains("Create"))));
        var updatedCount = allLogs.Count(a => (a.AuditActionType != null && (a.AuditActionType.Name.Contains("Update") || a.AuditActionType.Name.Contains("Modify"))));
        var deletedCount = allLogs.Count(a => (a.AuditActionType != null && a.AuditActionType.Name.Contains("Delete")));
        var loginCount = allLogs.Count(a => (a.EntityType != null && a.EntityType.Name.Contains("Auth")) || (a.AuditActionType != null && a.AuditActionType.Name.Contains("Login")));

        var byModule = allLogs
            .GroupBy(a => a.EntityType != null ? a.EntityType.Name : "Other")
            .Select(g => new { module = g.Key, count = g.Count(), percentage = totalEvents > 0 ? Math.Round((double)g.Count() / totalEvents * 100, 1) : 0 })
            .OrderByDescending(x => x.count)
            .ToList();

        var byAction = allLogs
            .GroupBy(a => a.AuditActionType != null ? a.AuditActionType.Name : "Action")
            .Select(g => new { action = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        var byUser = allLogs
            .GroupBy(a => new { a.ChangedById, Name = a.ChangedBy != null ? a.ChangedBy.Name : "System", Email = a.ChangedBy != null ? a.ChangedBy.Email : "" })
            .Select(g => new { userId = g.Key.ChangedById, name = g.Key.Name, email = g.Key.Email, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(10)
            .ToList();

        var timeline = allLogs
            .GroupBy(a => a.ChangedAt.ToString("yyyy-MM-dd"))
            .OrderBy(g => g.Key)
            .Select(g => new { date = g.Key, count = g.Count() })
            .ToList();

        return Ok(new
        {
            totalEvents,
            createdCount,
            updatedCount,
            deletedCount,
            loginCount,
            byModule,
            byAction,
            byUser,
            timeline
        });
    }
}

public record AuditLogDto(
    int AuditLogId,
    int EntityTypeId,
    string EntityTypeName,
    int EntityId,
    string? FieldName,
    string? OldValue,
    string? NewValue,
    int AuditActionTypeId,
    string AuditActionTypeName,
    int ChangedById,
    string ChangedByName,
    string? ChangedByEmail,
    DateTime ChangedAt
);

public record AuditLogPagedResult(
    List<AuditLogDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);
