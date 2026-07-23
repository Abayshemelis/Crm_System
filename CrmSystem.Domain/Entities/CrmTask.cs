using System;

namespace CrmSystem.Domain.Entities;

public class CrmTask
{
    public int CrmTaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; }

    public int CrmTaskStatusId { get; set; }
    public CrmTaskStatus? CrmTaskStatus { get; set; }

    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public int? OpportunityId { get; set; }
    public Opportunity? Opportunity { get; set; }

    public int? LeadId { get; set; }
    public Lead? Lead { get; set; }

    public int? ActivityId { get; set; }
    public Activity? Activity { get; set; }

    public int? AssignedToId { get; set; }
    public Identity? AssignedTo { get; set; }

    public int CreatedById { get; set; }
    public Identity? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
