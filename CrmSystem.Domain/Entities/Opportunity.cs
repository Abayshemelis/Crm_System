namespace CrmSystem.Domain.Entities;

public class Opportunity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime CloseDate { get; set; }
    public string Stage { get; set; } = "Prospecting";
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Extra fields
    public int? AccountId { get; set; }
    public int? ContactId { get; set; }
    public int Probability { get; set; }
}
