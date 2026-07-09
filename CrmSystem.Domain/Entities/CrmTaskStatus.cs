namespace CrmSystem.Domain.Entities;

public class CrmTaskStatus
{
    public int CrmTaskStatusId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. Pending, InProgress, Completed, Cancelled
    public bool IsTerminal { get; set; } = false;
}
