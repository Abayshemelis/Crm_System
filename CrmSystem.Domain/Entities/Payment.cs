using System;

namespace CrmSystem.Domain.Entities;

public class Payment
{
    public int PaymentId { get; set; }
    public string PaymentNumber { get; set; } = string.Empty;

    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public int? ContractId { get; set; }
    public Contract? Contract { get; set; }

    public int? OpportunityId { get; set; }
    public Opportunity? Opportunity { get; set; }

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";

    public string PaymentMethod { get; set; } = "CreditCard"; // Stripe, CreditCard, BankWire, ACH, ManualCash, ManualCheck
    public string Status { get; set; } = "Completed"; // Completed, Pending, Failed, Refunded, Cancelled

    public string? TransactionReference { get; set; } // Stripe Charge/PaymentIntent/Session ID or Bank Wire Ref
    public string? ReceiptUrl { get; set; }
    public string? Notes { get; set; }

    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    public int? VerifiedById { get; set; }
    public Identity? VerifiedBy { get; set; }
    public DateTime? VerifiedAt { get; set; }

    public int? CreatedById { get; set; }
    public Identity? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
}
