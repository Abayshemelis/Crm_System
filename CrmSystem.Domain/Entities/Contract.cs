using System;

namespace CrmSystem.Domain.Entities;

public class Contract
{
    public int ContractId { get; set; }
    public string ContractNumber { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public int? OpportunityId { get; set; }
    public Opportunity? Opportunity { get; set; }

    public string Title { get; set; } = string.Empty;
    public decimal ContractValue { get; set; }
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddYears(1);

    // Statuses: Draft, SentForSignature, Signed, Active, Expired, Terminated
    public string Status { get; set; } = "Draft";

    public string? SignatureDataUrl { get; set; }
    public string? SignedByName { get; set; }
    public DateTime? SignedAt { get; set; }

    public string? TermsAndConditions { get; set; }
    public string? Notes { get; set; }

    public int CreatedById { get; set; }
    public Identity CreatedBy { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public bool IsDeleted { get; set; } = false;
}
