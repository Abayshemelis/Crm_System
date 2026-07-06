namespace CrmSystem.Domain.Entities;

public class Opportunity
{
    public int OpportunityId { get; set; }
    
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    
    public string Title { get; set; } = string.Empty;
    public string Stage { get; set; } = "New";
    public decimal EstimatedValue { get; set; }
    
    public DateTime? ExpectedCloseDate { get; set; }
    public DateTime? ActualCloseDate { get; set; }
    
    public int OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
