namespace CrmSystem.Domain.Entities;

public class OpportunityLineItem
{
    public int LineItemId { get; set; }

    public int OpportunityId { get; set; }
    public Opportunity? Opportunity { get; set; }

    public int ProductId { get; set; }
    public Product? Product { get; set; }

    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; } = 0;

    public decimal TotalPrice => Quantity * UnitPrice * (1 - DiscountPercent / 100);
}
