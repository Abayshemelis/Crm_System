// ==============================================================================
// CRM SYSTEM DOMAIN ENTITY: CRM TASK (CrmTask.cs)
// ==============================================================================
// Represents an actionable to-do, follow-up call, or meeting task.
// Features polymorphic links to Leads, Customers, Opportunities, and Activities.
// Monitored by NotificationBackgroundService for Due Today & Overdue alerts.
// ==============================================================================

using System;

namespace CrmSystem.Domain.Entities;

public class CrmTask
{
    // Primary Key
    public int CrmTaskId { get; set; }

    // Task Details
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; } // UTC deadline

    // Status Lookup (Pending, In Progress, Completed, Cancelled)
    public int CrmTaskStatusId { get; set; }
    public CrmTaskStatus? CrmTaskStatus { get; set; }

    // Context Associations (Polymorphic relations)
    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public int? OpportunityId { get; set; }
    public Opportunity? Opportunity { get; set; }

    public int? LeadId { get; set; }
    public Lead? Lead { get; set; }

    public int? ActivityId { get; set; }
    public Activity? Activity { get; set; }

    // Assignee & Creator
    public int? AssignedToId { get; set; }
    public Identity? AssignedTo { get; set; }

    public int CreatedById { get; set; }
    public Identity? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
