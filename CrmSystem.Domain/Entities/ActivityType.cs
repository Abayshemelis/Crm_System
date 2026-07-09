namespace CrmSystem.Domain.Entities;

public class ActivityType
{
    public int ActivityTypeId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. Call, Email, Meeting, Note
    public string? Icon { get; set; }
}
