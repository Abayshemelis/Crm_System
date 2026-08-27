using System;

namespace CrmSystem.Domain.Dtos.Contract;

public class ContractReadDto
{
    public int ContractId { get; set; }
    public string ContractNumber { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CompanyName { get; set; }

    public int? OpportunityId { get; set; }
    public string? OpportunityTitle { get; set; }

    public string Title { get; set; } = string.Empty;
    public decimal ContractValue { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "Draft";

    public string? SignatureDataUrl { get; set; }
    public string? SignedByName { get; set; }
    public DateTime? SignedAt { get; set; }

    public string? CompanySignatureDataUrl { get; set; }
    public string? CompanySignedByName { get; set; }
    public DateTime? CompanySignedAt { get; set; }

    public string? CustomerSignatureDataUrl { get; set; }
    public string? CustomerSignedByName { get; set; }
    public DateTime? CustomerSignedAt { get; set; }

    public bool IsFullySigned => !string.IsNullOrEmpty(CompanySignatureDataUrl) && !string.IsNullOrEmpty(CustomerSignatureDataUrl);
    public bool IsCompanySigned => !string.IsNullOrEmpty(CompanySignatureDataUrl);
    public bool IsCustomerSigned => !string.IsNullOrEmpty(CustomerSignatureDataUrl);

    public string? TermsAndConditions { get; set; }
    public string? Notes { get; set; }
    public string? SigningToken { get; set; }

    public int CreatedById { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // Linked Commercial Invoice & Payment Details
    public int? InvoiceId { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? InvoiceStatus { get; set; } // "Draft", "Sent", "PartiallyPaid", "Paid", "PendingVerification", "Cancelled", "Refunded"
    public decimal? InvoiceTotalAmount { get; set; }
    public decimal? InvoiceAmountPaid { get; set; }
    public decimal? InvoiceBalanceDue { get; set; }
    public DateTime? InvoicePaidAt { get; set; }
    public string? InvoicePaymentUrl { get; set; }
}

public class CreateContractDto
{
    public int CustomerId { get; set; }
    public int? OpportunityId { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal ContractValue { get; set; }
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddYears(1);
    public string? TermsAndConditions { get; set; }
    public string? Notes { get; set; }
}

public class UpdateContractDto
{
    public string Title { get; set; } = string.Empty;
    public decimal ContractValue { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "Draft";
    public int? OpportunityId { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? Notes { get; set; }
}

public class SignContractDto
{
    public string SignatureDataUrl { get; set; } = string.Empty;
    public string SignedByName { get; set; } = string.Empty;
    public string? SignerRole { get; set; } // "Company" or "Customer"
}
