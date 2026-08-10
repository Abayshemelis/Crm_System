using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrmSystem.Infrastructure;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/audit-logs")]
[Authorize(Policy = "ManagerOrAbove")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditLogsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<AuditLogPagedResult>> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? entityTypeName = null,
        [FromQuery] string? auditActionTypeName = null,
        [FromQuery] int? changedById = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? search = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = _db.AuditLogs
            .Include(a => a.EntityType)
            .Include(a => a.AuditActionType)
            .Include(a => a.ChangedBy)
            .Where(a => !a.IsDeleted)
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

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteSingleAuditLog(int id)
    {
        var log = await _db.AuditLogs.FirstOrDefaultAsync(a => a.AuditLogId == id && !a.IsDeleted);
        if (log is null) return NotFound();

        log.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
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
