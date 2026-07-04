namespace CrmSystem.Domain.Entities;

public class Tag
{
    public int TagId { get; set; }
    public string Name { get; set; } = string.Empty;
    
    public ICollection<Customer> Customers { get; set; } = new List<Customer>();
}
