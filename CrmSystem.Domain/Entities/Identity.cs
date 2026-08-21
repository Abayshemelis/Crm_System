// ==============================================================================
// CRM SYSTEM DOMAIN ENTITY: IDENTITY (Identity.cs)
// ==============================================================================
// Represents an authenticated user (Administrator, Manager, Sales Representative).
// Stores credentials (BCrypt PasswordHash), assigned Roles, and manager reporting structure.
// ==============================================================================

using System;
using System.Collections.Generic;

namespace CrmSystem.Domain.Entities;

public class Identity
{
    // Primary Key (Maps to JWT 'sub' claim)
    public int IdentityId { get; set; }

    // User Profile
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    // Secure BCrypt password hash (or generated random hash for Google OAuth users)
    public string PasswordHash { get; set; } = string.Empty;

    // Primary Role
    public int RoleId { get; set; }
    public Role? Role { get; set; }

    // Multi-Role Support (IdentityRole join table)
    public ICollection<IdentityRole> IdentityRoles { get; set; } = new List<IdentityRole>();

    // Active status (deactivated users cannot log in)
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Manager Hierarchy (Used for manager team scoping)
    public int? ManagerId { get; set; }
    public Identity? Manager { get; set; }
}
