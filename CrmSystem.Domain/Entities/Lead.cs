namespace CrmSystem.Domain.Entities;

public class Lead
{
    public int LeadId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? CompanyName { get; set; }
    public string? JobTitle { get; set; }
    public int? SourceId { get; set; }
    public Source? Source { get; set; }
    public int? LeadStatusId { get; set; }
    public LeadStatus? LeadStatus { get; set; }
    public int? AssignedRepId { get; set; }
    public Identity? AssignedRep { get; set; }
    public int? ConvertedCustomerId { get; set; }
    public Customer? ConvertedCustomer { get; set; }
    public string? Notes { get; set; }
    public int? CreatedById { get; set; }
    public Identity? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ConvertedAt { get; set; }
    public int? ConvertedById { get; set; }
    public Identity? ConvertedBy { get; set; }
    public int? ConvertedOpportunityId { get; set; }
    public Opportunity? ConvertedOpportunity { get; set; }
    public bool IsDeleted { get; set; } = false;

    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
    public ICollection<CrmTask> Tasks { get; set; } = new List<CrmTask>();
}
