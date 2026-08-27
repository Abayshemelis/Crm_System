using System;

namespace CrmSystem.Domain.Dtos.Payment;

public class PaymentReadDto
{
    public int PaymentId { get; set; }
    public string PaymentNumber { get; set; } = string.Empty;
    public int InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;

    // Payer / Customer Details
    public int CustomerId { get; set; }
    public string PayerName { get; set; } = string.Empty;
    public string PayerEmail { get; set; } = string.Empty;
    public string? PayerCompanyName { get; set; }

    // Receiver / Company Details
    public string ReceiverName { get; set; } = "Enterprise CRM Solutions Inc.";

    // Linkages
    public int? ContractId { get; set; }
    public string? ContractNumber { get; set; }
    public int? OpportunityId { get; set; }
    public string? OpportunityTitle { get; set; }

    // Financials
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public decimal InvoiceTotalAmount { get; set; }
    public decimal InvoiceAmountPaid { get; set; }
    public decimal InvoiceBalanceDue { get; set; }

    // Method & Status
    public string PaymentMethod { get; set; } = string.Empty;
    public string Provider { get; set; } = "Stripe";
    public string Status { get; set; } = string.Empty;
    public string? TransactionReference { get; set; }
    public string? ReceiptUrl { get; set; }
    public string? Notes { get; set; }

    public DateTime PaymentDate { get; set; }
    public int? VerifiedById { get; set; }
    public string? VerifiedByName { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RecordManualPaymentDto
{
    public int InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "Bank Transfer";
    public string? BankName { get; set; }
    public string? TransactionReference { get; set; }
    public string? Notes { get; set; } // Accounting remarks
    public DateTime? PaymentDate { get; set; }
}

public class SubmitWirePaymentDto
{
    public decimal? Amount { get; set; } // Optional: defaults to remaining invoice balance if null/0
    public string WireReference { get; set; } = string.Empty;
    public string SenderBankName { get; set; } = string.Empty;
    public string? SenderAccountName { get; set; }
    public string? Notes { get; set; }
}

public class ProcessCardPaymentDto
{
    public decimal? Amount { get; set; } // Optional: defaults to remaining balance if null/0
    public string CardHolderName { get; set; } = string.Empty;
    public string? CardNumberLast4 { get; set; }
    public string? PaymentMethod { get; set; } = "CreditCard";
    public string? StripePaymentIntentId { get; set; }
    public string? StripeSessionId { get; set; }
}

public class CreateStripeCheckoutDto
{
    public decimal? Amount { get; set; } // Optional: partial amount or full balance
}
