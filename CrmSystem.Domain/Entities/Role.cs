namespace CrmSystem.Domain.Entities;

public class Role
{
    public int RoleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystemRole { get; set; } = true;
}

public enum UserRole
{
    Admin,
    Manager,
    SalesRep
}
