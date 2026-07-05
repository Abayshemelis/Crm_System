using System.ComponentModel.DataAnnotations;

namespace CrmSystem.Api.Dtos;

public class OpportunityReadDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime? CloseDate { get; set; }
    public string Stage { get; set; } = string.Empty;
    public int? AccountId { get; set; }
    public int? ContactId { get; set; }
    public double Probability { get; set; }
}
