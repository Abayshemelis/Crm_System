namespace CrmSystem.Domain.Entities;

public class Role
{
    public int RoleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystemRole { get; set; } = true;
    public ICollection<IdentityRole> IdentityRoles { get; set; } = new List<IdentityRole>();
}

public class IdentityRole
{
    public int IdentityId { get; set; }
    public Identity? Identity { get; set; }

    public int RoleId { get; set; }
    public Role? Role { get; set; }
}

public enum UserRole
{
    Admin,
    Manager,
    SalesRep
}
