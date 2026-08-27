// ==============================================================================
// CRM SYSTEM DOMAIN ENTITY: CUSTOMER (Customer.cs)
// ==============================================================================
// Represents a paying client, converted lead, or corporate point of contact.
// Customers are linked to Companies, Assigned Reps, Opportunities, and Invoices.
// ==============================================================================

namespace CrmSystem.Domain.Entities;

public class Customer
{
    // Primary Key
    public int CustomerId { get; set; }

    // Contact Details
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? JobTitle { get; set; }

    // Associated Organization / Account
    public int? CompanyId { get; set; }
    public Company? Company { get; set; }

    // Acquisition Source
    public int? SourceId { get; set; }
    public Source? Source { get; set; }

    // Portfolio Ownership (Assigned Sales Representative)
    public int AssignedRepId { get; set; }
    public Identity? AssignedRep { get; set; }

    // Audit Info
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? CreatedById { get; set; }
    public Identity? CreatedBy { get; set; }

    // Soft-Delete Flag
    public bool IsDeleted { get; set; }

    // Schema-less Custom Field Values (JSON)
    public string? CustomFieldsJson { get; set; }

    // Segmentation tags (e.g., VIP, Enterprise, Important)
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();

    // Payment history
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
