using System;

namespace CrmSystem.Domain.Entities;

public class Notification
{
    public int NotificationId { get; set; }

    public int IdentityId { get; set; }
    public Identity? Identity { get; set; }

    public int NotificationTypeId { get; set; }
    public NotificationType? NotificationType { get; set; }

    public string Message { get; set; } = string.Empty;

    public int? RelatedTaskId { get; set; }
    public CrmTask? RelatedTask { get; set; }

    public int? RelatedOpportunityId { get; set; }
    public Opportunity? RelatedOpportunity { get; set; }

    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
