namespace CrmSystem.Domain.Entities;

public class AuditActionType
{
    public int AuditActionTypeId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. Create, Update, Delete, StatusChange
}
