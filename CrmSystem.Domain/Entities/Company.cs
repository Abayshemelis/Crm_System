namespace CrmSystem.Domain.Entities;

public class Company
{
    public int CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Industry { get; set; }
    public string? Website { get; set; }
    public string? Address { get; set; }
    public int? AssignedRepId { get; set; }
    public User? AssignedRep { get; set; }
    public bool IsDeleted { get; set; } = false;
}
