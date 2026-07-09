using System;

namespace CrmSystem.Domain.Entities;

public class Lead
{
    public int LeadId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? CompanyName { get; set; }
    public string? JobTitle { get; set; }

    public int? SourceId { get; set; }
    public Source? Source { get; set; }

    public int LeadStatusId { get; set; }
    public LeadStatus? LeadStatus { get; set; }

    public int? AssignedRepId { get; set; }
    public Identity? AssignedRep { get; set; }

    // Set when lead is converted to a customer
    public int? ConvertedCustomerId { get; set; }
    public Customer? ConvertedCustomer { get; set; }

    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
}
