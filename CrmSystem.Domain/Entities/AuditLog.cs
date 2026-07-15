using System;

namespace CrmSystem.Domain.Entities;

public class AuditLog
{
    public int AuditLogId { get; set; }

    public int EntityTypeId { get; set; }
    public EntityType? EntityType { get; set; }

    public int EntityId { get; set; } // The PK of the affected row

    public string? FieldName { get; set; } // Null for Create/Delete
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }

    public int AuditActionTypeId { get; set; }
    public AuditActionType? AuditActionType { get; set; }

    public int ChangedById { get; set; }
    public Identity? ChangedBy { get; set; }

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    public bool IsDeleted { get; set; } = false;
}