using System;

namespace CrmSystem.Domain.Dtos.Notification;

public class NotificationReadDto
{
    public int NotificationId { get; set; }
    public string Message { get; set; } = string.Empty;
    public int NotificationTypeId { get; set; }
    public string TypeName { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public int? RelatedTaskId { get; set; }
    public string? RelatedTaskTitle { get; set; }
    public int? RelatedOpportunityId { get; set; }
    public string? RelatedOpportunityTitle { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationCountDto
{
    public int UnreadCount { get; set; }
}
