using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Infrastructure.Services;

public interface IAuditService
{
    Task LogFieldChangeAsync(int entityTypeId, int entityId, string fieldName, string? oldValue, string? newValue, string actionTypeName, int changedById);
    Task LogFieldChangesAsync(int entityTypeId, int entityId, IEnumerable<(string Field, string? OldValue, string? NewValue)> changes, string actionTypeName, int changedById);
    Task LogAssignmentAsync(int entityTypeId, int entityId, int? oldRepId, int? newRepId, int changedById);
    Task LogDeletionAsync(int entityTypeId, int entityId, int changedById);
    Task ClearHistoryAsync(int entityTypeId, int entityId, int changedById);
}

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;

    public AuditService(AppDbContext db)
    {
        _db = db;
    }

    public async Task LogFieldChangeAsync(int entityTypeId, int entityId, string fieldName, string? oldValue, string? newValue, string actionTypeName, int changedById)
    {
        var actionType = await _db.AuditActionTypes.FirstOrDefaultAsync(a => a.Name == actionTypeName);
        if (actionType is null)
        {
            Console.WriteLine($"[AuditService] WARNING: AuditActionType '{actionTypeName}' not found — skipping log.");
            return;
        }

        _db.AuditLogs.Add(new AuditLog
        {
            EntityTypeId = entityTypeId,
            EntityId = entityId,
            FieldName = fieldName,
            OldValue = oldValue,
            NewValue = newValue,
            AuditActionTypeId = actionType.AuditActionTypeId,
            ChangedById = changedById,
            ChangedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Logs multiple field changes for a single entity update in one SaveChangesAsync call.
    /// Use this for PUT endpoints to avoid repeated round-trips.
    /// </summary>
    public async Task LogFieldChangesAsync(int entityTypeId, int entityId, IEnumerable<(string Field, string? OldValue, string? NewValue)> changes, string actionTypeName, int changedById)
    {
        var actionType = await _db.AuditActionTypes.FirstOrDefaultAsync(a => a.Name == actionTypeName);
        if (actionType is null)
        {
            Console.WriteLine($"[AuditService] WARNING: AuditActionType '{actionTypeName}' not found — skipping batch log.");
            return;
        }

        var now = DateTime.UtcNow;
        foreach (var (field, oldVal, newVal) in changes)
        {
            _db.AuditLogs.Add(new AuditLog
            {
                EntityTypeId = entityTypeId,
                EntityId = entityId,
                FieldName = field,
                OldValue = oldVal,
                NewValue = newVal,
                AuditActionTypeId = actionType.AuditActionTypeId,
                ChangedById = changedById,
                ChangedAt = now
            });
        }

        await _db.SaveChangesAsync();
    }

    public async Task LogAssignmentAsync(int entityTypeId, int entityId, int? oldRepId, int? newRepId, int changedById)
    {
        if (oldRepId == newRepId) return;

        var actionType = await _db.AuditActionTypes.FirstOrDefaultAsync(a => a.Name == "Assign");
        if (actionType is null)
        {
            Console.WriteLine($"[AuditService] WARNING: AuditActionType 'Assign' not found — skipping assignment log.");
            return;
        }

        _db.AuditLogs.Add(new AuditLog
        {
            EntityTypeId = entityTypeId,
            EntityId = entityId,
            FieldName = "AssignedRepId",
            OldValue = oldRepId?.ToString(),
            NewValue = newRepId?.ToString(),
            AuditActionTypeId = actionType.AuditActionTypeId,
            ChangedById = changedById,
            ChangedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    public async Task LogDeletionAsync(int entityTypeId, int entityId, int changedById)
    {
        var actionType = await _db.AuditActionTypes.FirstOrDefaultAsync(a => a.Name == "Delete");
        if (actionType is null)
        {
            Console.WriteLine($"[AuditService] WARNING: AuditActionType 'Delete' not found — skipping deletion log.");
            return;
        }

        _db.AuditLogs.Add(new AuditLog
        {
            EntityTypeId = entityTypeId,
            EntityId = entityId,
            FieldName = null,
            OldValue = null,
            NewValue = null,
            AuditActionTypeId = actionType.AuditActionTypeId,
            ChangedById = changedById,
            ChangedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    public async Task ClearHistoryAsync(int entityTypeId, int entityId, int changedById)
    {
        // Soft delete all audit logs for this entity
        var logs = await _db.AuditLogs
            .Where(al => al.EntityTypeId == entityTypeId && al.EntityId == entityId && !al.IsDeleted)
            .ToListAsync();

        foreach (var log in logs)
        {
            log.IsDeleted = true;
        }

        await _db.SaveChangesAsync();
    }
}