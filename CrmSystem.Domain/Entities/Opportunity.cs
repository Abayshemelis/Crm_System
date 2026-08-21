// ==============================================================================
// CRM SYSTEM DOMAIN ENTITY: OPPORTUNITY (Opportunity.cs)
// ==============================================================================
// Represents a deal in the visual sales pipeline.
// Tracks sales stages, financial valuation, expected close dates, and products.
// ==============================================================================

using System;
using System.Collections.Generic;

namespace CrmSystem.Domain.Entities;

public class Opportunity
{
    // Primary Key
    public int OpportunityId { get; set; }

    // Linked Customer Account
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    // Deal Details
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Sales Stage Lookup (New, Qualified, Proposal, Negotiation, Closing, Won, Lost)
    public int OpportunityStageId { get; set; }
    public OpportunityStage? OpportunityStage { get; set; }

    // Financial Valuation (Total estimated currency value)
    public decimal EstimatedValue { get; set; }

    // Timeline Forecasting
    public DateTime? ExpectedCloseDate { get; set; }
    public DateTime? ActualCloseDate { get; set; } // Set when marked Won or Lost

    // Deal Owner (Sales Representative)
    public int OwnerId { get; set; }
    public Identity Owner { get; set; } = null!;

    // Audit & Stalled Tracking
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; } // Monitored by notification engine for stalled deals (>14 days)

    // Product Line Items attached to this deal
    public ICollection<OpportunityLineItem> LineItems { get; set; } = new List<OpportunityLineItem>();
}
