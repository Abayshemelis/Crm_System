using System;

namespace CrmSystem.Domain.Entities;

public class Invoice
{
    public int InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public int? ContractId { get; set; }
    public Contract? Contract { get; set; }

    public int? OpportunityId { get; set; }
    public Opportunity? Opportunity { get; set; }

    public decimal Amount { get; set; }
    public decimal TaxRate { get; set; } = 0m;
    public decimal TaxAmount { get; set; } = 0m;
    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = "Draft"; // Draft, Sent, Paid, Overdue, Cancelled

    public DateTime IssueDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(30);
    public DateTime? PaidAt { get; set; }

    public string? PaymentMethod { get; set; }
    public string? StripeSessionId { get; set; }
    public string? PaymentUrl { get; set; }
    public string? Notes { get; set; }
    public string? Terms { get; set; }

    public int CreatedById { get; set; }
    public Identity CreatedBy { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
}
