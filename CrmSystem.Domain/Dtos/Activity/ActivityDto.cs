using System;
using System.Text.Json.Serialization;

namespace CrmSystem.Domain.Dtos.Activity;

public class ActivityCreateDto
{
    [JsonPropertyName("activityTypeId")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int ActivityTypeId { get; set; }
    [JsonPropertyName("subject")]
    public string Subject { get; set; } = string.Empty;
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    [JsonPropertyName("activityDate")]
    public DateTime ActivityDate { get; set; } = DateTime.UtcNow;
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int DurationMinutes { get; set; } = 0;
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int? CustomerId { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int? OpportunityId { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int? LeadId { get; set; }
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
    public int? LeadId { get; set; }
    public string? LeadName { get; set; }
    public int CreatedById { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
