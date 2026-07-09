using System;

namespace CrmSystem.Domain.Entities;

public class Attachment
{
    public int AttachmentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? ContentType { get; set; }

    // Polymorphic references – at least one must be set
    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public int? CompanyId { get; set; }
    public Company? Company { get; set; }

    public int? OpportunityId { get; set; }
    public Opportunity? Opportunity { get; set; }

    public int UploadedById { get; set; }
    public Identity? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
