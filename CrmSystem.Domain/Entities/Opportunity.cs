using System;
using System.Collections.Generic;

namespace CrmSystem.Domain.Entities;

public class Opportunity
{
    public int OpportunityId { get; set; }

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Normalized stage lookup (replaces old string Stage field)
    public int OpportunityStageId { get; set; }
    public OpportunityStage? OpportunityStage { get; set; }

    public decimal EstimatedValue { get; set; }

    public DateTime? ExpectedCloseDate { get; set; }
    public DateTime? ActualCloseDate { get; set; }

    public int OwnerId { get; set; }
    public Identity Owner { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<OpportunityLineItem> LineItems { get; set; } = new List<OpportunityLineItem>();
}
