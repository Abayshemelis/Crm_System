using System;

namespace CrmSystem.Domain.Entities;

public class Activity
{
    public int ActivityId { get; set; }

    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public int? OpportunityId { get; set; }
    public Opportunity? Opportunity { get; set; }

    public int ActivityTypeId { get; set; }
    public ActivityType? ActivityType { get; set; }

    public string Subject { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime ActivityDate { get; set; } = DateTime.UtcNow;
    public int DurationMinutes { get; set; } = 0;

    public int CreatedById { get; set; }
    public Identity? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
