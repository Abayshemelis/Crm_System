using System;

namespace CrmSystem.Domain.Dtos.Activity;

public class ActivityCreateDto
{
    public int ActivityTypeId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime ActivityDate { get; set; } = DateTime.UtcNow;
    public int DurationMinutes { get; set; } = 0;
    public int? CustomerId { get; set; }
    public int? OpportunityId { get; set; }
}

public class ActivityReadDto
{
    public int ActivityId { get; set; }
    public int ActivityTypeId { get; set; }
    public string ActivityTypeName { get; set; } = string.Empty;
    public string? ActivityTypeIcon { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime ActivityDate { get; set; }
    public int DurationMinutes { get; set; }
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public int? OpportunityId { get; set; }
    public string? OpportunityTitle { get; set; }
    public int CreatedById { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
