namespace CrmSystem.Domain.Entities;

public class NotificationType
{
    public int NotificationTypeId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. TaskDue, OpportunityWon, LeadAssigned
    public string? DefaultChannel { get; set; } // e.g. InApp, Email
}
