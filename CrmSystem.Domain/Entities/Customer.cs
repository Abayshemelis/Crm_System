namespace CrmSystem.Domain.Entities;

public class Customer
{
    public int CustomerId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? JobTitle { get; set; }
    public int? CompanyId { get; set; }
    public Company? Company { get; set; }
    public int? SourceId { get; set; }
    public Source? Source { get; set; }
    public int AssignedRepId { get; set; }
    public Identity? AssignedRep { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
}
