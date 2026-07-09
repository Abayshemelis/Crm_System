namespace CrmSystem.Domain.Entities;

public class EntityType
{
    public int EntityTypeId { get; set; }
    public string Name { get; set; } = string.Empty;       // e.g. Customer, Company, Opportunity
    public string TableName { get; set; } = string.Empty;  // e.g. Customers, Companies
}
