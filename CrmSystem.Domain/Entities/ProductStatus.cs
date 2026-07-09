namespace CrmSystem.Domain.Entities;

public class ProductStatus
{
    public int ProductStatusId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. Active, Inactive, Discontinued
    public bool IsSelectable { get; set; } = true; // Can be selected when adding line items
}
