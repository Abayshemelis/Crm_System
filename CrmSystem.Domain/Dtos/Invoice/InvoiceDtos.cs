using System;

namespace CrmSystem.Domain.Dtos.Invoice;

public class InvoiceReadDto
{
    public int InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;

    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CompanyName { get; set; }

    public int? ContractId { get; set; }
    public string? ContractNumber { get; set; }
    public string? ContractTitle { get; set; }

    public int? OpportunityId { get; set; }
    public string? OpportunityTitle { get; set; }

    public decimal Amount { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = "Draft";

    public DateTime IssueDate { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? PaidAt { get; set; }

    public string? PaymentMethod { get; set; }
    public string? Notes { get; set; }
    public string? Terms { get; set; }

    public int CreatedById { get; set; }
    public string CreatedByName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateInvoiceDto
{
    public int CustomerId { get; set; }
    public int? ContractId { get; set; }
    public int? OpportunityId { get; set; }

    public decimal Amount { get; set; }
    public decimal TaxRate { get; set; } = 0m;
    public DateTime IssueDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(30);

    public string? Notes { get; set; }
    public string? Terms { get; set; }
}

public class UpdateInvoiceDto
{
    public decimal Amount { get; set; }
    public decimal TaxRate { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime IssueDate { get; set; }
    public DateTime DueDate { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Notes { get; set; }
    public string? Terms { get; set; }
}

public class PayInvoiceDto
{
    public string PaymentMethod { get; set; } = "Bank Transfer";
    public string? Notes { get; set; }
}
