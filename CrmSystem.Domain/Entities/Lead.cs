// ==============================================================================
// CRM SYSTEM DOMAIN ENTITY: LEAD (Lead.cs)
// ==============================================================================
// Represents an unqualified prospect or potential business opportunity.
//
// Key Lifecycle Steps:
// 1. Prospect Ingestion (Form, CSV, or Manual entry)
// 2. Lead Scoring (Calculated score from 0-100 based on email, company, job title, and engagement)
// 3. Assignment to Sales Rep
// 4. Conversion into Customer and Opportunity once qualified
// ==============================================================================

namespace CrmSystem.Domain.Entities;

public class Lead
{
    // Primary Key
    public int LeadId { get; set; }

    // Contact Information
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? CompanyName { get; set; }
    public string? JobTitle { get; set; }

    // Origin Source (e.g., Website, Referral, Cold Call, Trade Show)
    public int? SourceId { get; set; }
    public Source? Source { get; set; }

    // Status (e.g., New, Contacted, Qualified, Converted, Lost)
    public int? LeadStatusId { get; set; }
    public LeadStatus? LeadStatus { get; set; }

    // Assigned Sales Representative
    public int? AssignedRepId { get; set; }
    public Identity? AssignedRep { get; set; }

    // Conversion Links (Populated when lead is converted to Customer / Deal)
    public int? ConvertedCustomerId { get; set; }
    public Customer? ConvertedCustomer { get; set; }
    public int? ConvertedOpportunityId { get; set; }
    public Opportunity? ConvertedOpportunity { get; set; }
    public DateTime? ConvertedAt { get; set; }
    public int? ConvertedById { get; set; }
    public Identity? ConvertedBy { get; set; }

    // General Notes & Audit Info
    public string? Notes { get; set; }
    public int? CreatedById { get; set; }
    public Identity? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Qualification & Scoring
    public string? Priority { get; set; } = "Medium"; // Low, Medium, High, Urgent
    public int LeadScore { get; set; } = 0;           // 0 to 100
    public bool IsManualScore { get; set; } = false;   // If true, auto-scoring engine won't overwrite
    public string? LostReason { get; set; }            // Captured when marked as Lost

    public DateTime? LastActivityAt { get; set; }

    // Soft-Delete Flag (preserves history without hard database deletion)
    public bool IsDeleted { get; set; } = false;

    // Dynamic schema-less custom field values stored as JSON
    public string? CustomFieldsJson { get; set; }

    // Navigation collections
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
    public ICollection<CrmTask> Tasks { get; set; } = new List<CrmTask>();
}
