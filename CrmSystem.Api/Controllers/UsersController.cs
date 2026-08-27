using System.Security.Claims;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Api.Services;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public UsersController(AppDbContext db, ICurrentUserService currentUser, IAuditService auditService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("nameid");
        if (claim != null && int.TryParse(claim.Value, out var id))
        {
            return id;
        }
        return 0;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUserProfile()
    {
        var userId = GetCurrentUserId();
        if (userId <= 0) return Unauthorized(new { message = "Invalid user identity." });

        var identity = await _db.Identities
            .Include(i => i.Role)
            .Include(i => i.IdentityRoles)
                .ThenInclude(ir => ir.Role)
            .FirstOrDefaultAsync(i => i.IdentityId == userId);

        if (identity == null) return NotFound(new { message = "User not found." });

        return Ok(new
        {
            id = identity.IdentityId,
            userId = identity.IdentityId,
            name = identity.Name,
            email = identity.Email,
            role = identity.IdentityRoles.Select(ir => ir.Role!.Name).FirstOrDefault() ?? identity.Role!.Name,
            roles = identity.IdentityRoles.Select(ir => ir.Role!.Name).ToArray(),
            profileImage = identity.ProfileImage,
            isActive = identity.IsActive
        });
    }

    [HttpPut("me/profile-image")]
    [HttpPost("me/profile-image")]
    [HttpPut("me/avatar")]
    [HttpPost("me/avatar")]
    public async Task<IActionResult> UpdateProfileImage([FromBody] UpdateProfileImageRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0) return Unauthorized(new { message = "Invalid user identity." });

        var identity = await _db.Identities.FindAsync(userId);
        if (identity == null) return NotFound(new { message = "User not found." });

        identity.ProfileImage = request.ProfileImage;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Profile image updated successfully.",
            profileImage = identity.ProfileImage
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var userId = GetCurrentUserId();

        var query = _db.Identities
            .Include(i => i.Role)
            .Include(i => i.IdentityRoles)
                .ThenInclude(ir => ir.Role)
            .AsQueryable();

        if (User.IsInRole("SalesRep"))
        {
            query = query.Where(i => i.IdentityId == userId);
        }

        var users = await query.Select(i => new
        {
            Id = i.IdentityId,
            i.Name,
            i.Email,
            // primary role: prefer explicit IdentityRoles, fallback to Role
            Role = i.IdentityRoles.Select(ir => ir.Role!.Name).FirstOrDefault() ?? i.Role!.Name,
            RoleId = i.RoleId,
            Roles = i.IdentityRoles.Select(ir => ir.Role!.Name).ToArray(),
            IsActive = i.IsActive,
            ProfileImage = i.ProfileImage
        }).ToListAsync();

        return Ok(users);
    }

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _db.Roles
            .Where(r => r.Name == "Manager" || r.Name == "SalesRep")
            .Select(r => new { Id = r.RoleId, Name = r.Name })
            .ToListAsync();
        return Ok(roles);
    }

    [HttpPost]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Name, email, and password are required." });
        }

        if (await _db.Identities.AnyAsync(i => i.Email == request.Email))
        {
            return Conflict(new { message = "User with this email already exists." });
        }

        var role = await _db.Roles.FindAsync(request.RoleId);
        if (role is null)
        {
            return BadRequest(new { message = "Invalid role." });
        }

        var isAdmin = User.IsInRole("Admin");

        // Managers can only create Sales Representatives
        if (!isAdmin && role.Name != "SalesRep")
        {
            return Forbid();
        }

        // Prevent creating Admin users directly
        if (role.Name == "Admin")
        {
            return BadRequest(new { message = "Cannot create Admin users directly." });
        }

        var user = new Identity
        {
            Name = request.Name,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = request.RoleId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Identities.Add(user);
        await _db.SaveChangesAsync();

        // persist identity role mapping for multi-role support
        _db.IdentityRoles.Add(new IdentityRole { IdentityId = user.IdentityId, RoleId = request.RoleId });
        await _db.SaveChangesAsync();

        // Audit: log initial role assignment
        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "User");
        if (entityType is not null)
        {
            var roleName = (await _db.Roles.FindAsync(request.RoleId))?.Name;
            await _auditService.LogFieldChangeAsync(entityType.EntityTypeId, user.IdentityId, "Roles", null, roleName, "Create", GetCurrentUserId());
        }

        return CreatedAtAction(nameof(GetUsers), new { id = user.IdentityId }, new { Id = user.IdentityId });
    }

    [HttpPut("{id:int}/role")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> UpdateUserRole(int id, [FromBody] UpdateRoleRequest request)
    {
        var user = await _db.Identities
            .Include(i => i.IdentityRoles)
            .SingleOrDefaultAsync(i => i.IdentityId == id);
        if (user is null)
        {
            return NotFound();
        }

        // Prevent modifying own role
        if (user.IdentityId == GetCurrentUserId())
        {
            return BadRequest(new { message = "Cannot modify your own role." });
        }

        var role = await _db.Roles.FindAsync(request.RoleId);
        if (role is null)
        {
            return BadRequest(new { message = "Invalid role." });
        }

        var isAdmin = User.IsInRole("Admin");

        // Managers can only assign Sales Representative role
        if (!isAdmin && role.Name != "SalesRep")
        {
            return Forbid();
        }

        // Prevent assigning Admin role (this endpoint is for basic role assignment, use /roles for Admin)
        if (role.Name == "Admin")
        {
            return BadRequest(new { message = "Cannot assign Admin role via this endpoint." });
        }

        // Prevent removing the last Admin role
        var wasAdmin = await _db.IdentityRoles.AnyAsync(ir => ir.IdentityId == id && ir.Role!.Name == "Admin");
        if (wasAdmin && role.Name != "Admin")
        {
            var activeAdminCount = await _db.IdentityRoles.CountAsync(ir => ir.Role!.Name == "Admin" && ir.Identity!.IsActive);
            if (activeAdminCount <= 1)
            {
                return BadRequest(new { message = "Cannot remove the last active Admin role." });
            }
        }

        // Sync single-role change to IdentityRoles (clear existing, add new)
        var existing = await _db.IdentityRoles.Where(ir => ir.IdentityId == id).ToListAsync();
        if (existing.Any()) _db.IdentityRoles.RemoveRange(existing);
        _db.IdentityRoles.Add(new IdentityRole { IdentityId = id, RoleId = request.RoleId });

        var oldRole = await _db.Roles.FindAsync(user.RoleId);
        user.RoleId = request.RoleId;
        await _db.SaveChangesAsync();

        // Audit: log role change
        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "User");
        if (entityType is not null)
        {
            var newRole = await _db.Roles.FindAsync(request.RoleId);
            await _auditService.LogFieldChangeAsync(entityType.EntityTypeId, id, "Roles", oldRole?.Name, newRole?.Name, "Update", GetCurrentUserId());
        }

        return NoContent();
    }

    [HttpPut("{id:int}/roles")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> UpdateUserRoles(int id, [FromBody] UpdateRolesRequest request)
    {
        var user = await _db.Identities
            .Include(i => i.IdentityRoles)
            .SingleOrDefaultAsync(i => i.IdentityId == id);
        if (user is null)
        {
            return NotFound();
        }

        // Prevent modifying own roles
        if (user.IdentityId == GetCurrentUserId())
        {
            return BadRequest(new { message = "Cannot modify your own roles." });
        }

        // Validate provided role ids
        var roles = await _db.Roles.Where(r => request.RoleIds.Contains(r.RoleId)).ToListAsync();
        if (roles.Count != request.RoleIds.Distinct().Count())
        {
            return BadRequest(new { message = "One or more roles are invalid." });
        }

        var isAdmin = User.IsInRole("Admin");

        // Managers can only assign Sales Representative role
        if (!isAdmin)
        {
            if (roles.Any(r => r.Name == "Manager" || r.Name == "Admin"))
            {
                return Forbid();
            }
        }

        // Prevent assigning Admin role unless current user is Admin
        if (roles.Any(r => r.Name == "Admin") && !isAdmin)
        {
            return BadRequest(new { message = "Cannot assign Admin role." });
        }

        // Prevent removing the last Admin role
        var wasAdmin = await _db.IdentityRoles.AnyAsync(ir => ir.IdentityId == id && ir.Role!.Name == "Admin");
        var willBeAdmin = roles.Any(r => r.Name == "Admin");
        
        if (wasAdmin && !willBeAdmin)
        {
            var activeAdminCount = await _db.IdentityRoles.CountAsync(ir => ir.Role!.Name == "Admin" && ir.Identity!.IsActive);
            if (activeAdminCount <= 1)
            {
                return BadRequest(new { message = "Cannot remove the last active Admin role." });
            }
        }

        // Sync IdentityRoles: remove existing, add new
        var existing = await _db.IdentityRoles.Where(ir => ir.IdentityId == id).ToListAsync();
        var oldRoleNames = existing.Any()
            ? await _db.IdentityRoles.Where(ir => ir.IdentityId == id).Include(ir => ir.Role).Select(ir => ir.Role!.Name).ToListAsync()
            : new List<string>();
        if (existing.Any()) _db.IdentityRoles.RemoveRange(existing);
        foreach (var rid in request.RoleIds.Distinct())
        {
            _db.IdentityRoles.Add(new IdentityRole { IdentityId = id, RoleId = rid });
        }

        // Keep legacy RoleId in sync with first provided role if any
        if (request.RoleIds.Any())
        {
            user.RoleId = request.RoleIds.First();
        }

        await _db.SaveChangesAsync();

        var updatedRoles = await _db.IdentityRoles
            .Where(ir => ir.IdentityId == id)
            .Include(ir => ir.Role)
            .Select(ir => ir.Role!.Name)
            .ToArrayAsync();

        // Audit: record roles changed
        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "User");
        if (entityType is not null)
        {
            var oldVal = string.Join(",", oldRoleNames);
            var newVal = string.Join(",", updatedRoles);
            await _auditService.LogFieldChangeAsync(entityType.EntityTypeId, id, "Roles", oldVal, newVal, "Update", GetCurrentUserId());
        }

        return Ok(new { Roles = updatedRoles });
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> UpdateUserStatus(int id, [FromBody] UpdateStatusRequest request)
    {
        var user = await _db.Identities
            .Include(i => i.IdentityRoles)
            .ThenInclude(ir => ir.Role)
            .FirstOrDefaultAsync(i => i.IdentityId == id);
            
        if (user is null)
        {
            return NotFound();
        }

        var currentUserId = GetCurrentUserId();

        // Prevent self-status change
        if (user.IdentityId == currentUserId)
        {
            return BadRequest(new { message = "You cannot change your own account status." });
        }

        var isAdmin = User.IsInRole("Admin");
        var isTargetAdmin = user.IdentityRoles.Any(ir => ir.Role!.Name == "Admin");
        var isTargetManager = user.IdentityRoles.Any(ir => ir.Role!.Name == "Manager");

        // Managers cannot deactivate/activate Admins or Managers
        if (!isAdmin && (isTargetAdmin || isTargetManager))
        {
            return Forbid();
        }

        // Prevent deactivating the last active Admin
        if (!request.IsActive && isTargetAdmin && user.IsActive)
        {
            var activeAdminCount = await _db.IdentityRoles.CountAsync(ir => ir.Role!.Name == "Admin" && ir.Identity!.IsActive);
            if (activeAdminCount <= 1)
            {
                return BadRequest(new { message = "Cannot deactivate the last active Admin." });
            }
        }

        user.IsActive = request.IsActive;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _db.Identities
            .Include(i => i.IdentityRoles)
            .ThenInclude(ir => ir.Role)
            .FirstOrDefaultAsync(i => i.IdentityId == id);
            
        if (user is null)
        {
            return NotFound();
        }

        var currentUserId = GetCurrentUserId();

        // Prevent deleting the current user
        if (user.IdentityId == currentUserId)
        {
            return BadRequest(new { message = "Cannot delete your own account." });
        }

        var isAdmin = User.IsInRole("Admin");
        var isTargetAdmin = user.IdentityRoles.Any(ir => ir.Role!.Name == "Admin");
        var isTargetManager = user.IdentityRoles.Any(ir => ir.Role!.Name == "Manager");

        // Managers cannot delete Admins or Managers
        if (!isAdmin && (isTargetAdmin || isTargetManager))
        {
            return Forbid();
        }

        // Prevent deleting the last Admin
        if (isTargetAdmin)
        {
            var adminCount = await _db.IdentityRoles.CountAsync(ir => ir.Role!.Name == "Admin");
            if (adminCount <= 1)
            {
                return BadRequest(new { message = "Cannot delete the last Admin account." });
            }
        }

        // 1. Remove child security records
        var identityRoles = _db.IdentityRoles.Where(ir => ir.IdentityId == id);
        _db.IdentityRoles.RemoveRange(identityRoles);

        var refreshTokens = _db.RefreshTokens.Where(rt => rt.IdentityId == id);
        _db.RefreshTokens.RemoveRange(refreshTokens);

        var passwordResetTokens = _db.PasswordResetTokens.Where(prt => prt.IdentityId == id);
        _db.PasswordResetTokens.RemoveRange(passwordResetTokens);

        var notifications = _db.Notifications.Where(n => n.IdentityId == id);
        _db.Notifications.RemoveRange(notifications);

        // 2. Reassign domain entity references to current Admin user to avoid FK constraint violations
        // We use raw SQL to guarantee all updates hit the database directly, bypassing EF Core tracking/batching issues
        // which previously caused FK constraint conflicts during cascade deletes.
        await _db.Database.ExecuteSqlRawAsync("UPDATE Leads SET AssignedRepId = {0} WHERE AssignedRepId = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE Leads SET CreatedById = {0} WHERE CreatedById = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE Leads SET ConvertedById = {0} WHERE ConvertedById = {1}", currentUserId, id);
        
        await _db.Database.ExecuteSqlRawAsync("UPDATE Opportunities SET OwnerId = {0} WHERE OwnerId = {1}", currentUserId, id);
        
        await _db.Database.ExecuteSqlRawAsync("UPDATE CrmTasks SET AssignedToId = {0} WHERE AssignedToId = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE CrmTasks SET CreatedById = {0} WHERE CreatedById = {1}", currentUserId, id);
        
        await _db.Database.ExecuteSqlRawAsync("UPDATE Activities SET CreatedById = {0} WHERE CreatedById = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE AuditLogs SET ChangedById = {0} WHERE ChangedById = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE StageHistories SET ChangedById = {0} WHERE ChangedById = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE Attachments SET UploadedById = {0} WHERE UploadedById = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE Invoices SET CreatedById = {0} WHERE CreatedById = {1}", currentUserId, id);

        await _db.Database.ExecuteSqlRawAsync("UPDATE Contracts SET CreatedById = {0} WHERE CreatedById = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE Payments SET CreatedById = {0} WHERE CreatedById = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE Payments SET VerifiedById = {0} WHERE VerifiedById = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE Customers SET CreatedById = {0} WHERE CreatedById = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE Customers SET AssignedRepId = {0} WHERE AssignedRepId = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE Companies SET CreatedById = {0} WHERE CreatedById = {1}", currentUserId, id);
        await _db.Database.ExecuteSqlRawAsync("UPDATE Companies SET AssignedRepId = {0} WHERE AssignedRepId = {1}", currentUserId, id);

        // 3. Remove user identity record
        _db.Identities.Remove(user);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("stats")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetUserStats()
    {
        var stats = await _db.Identities
            .Include(i => i.Role)
            .GroupBy(i => i.Role!.Name)
            .Select(g => new
            {
                Role = g.Key,
                Count = g.Count(),
                ActiveCount = g.Count(i => i.IsActive)
            })
            .ToListAsync();

        var totalUsers = await _db.Identities.CountAsync();
        var activeUsers = await _db.Identities.CountAsync(i => i.IsActive);

        return Ok(new
        {
            totalUsers,
            activeUsers,
            byRole = stats
        });
    }
}

public class CreateUserRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int RoleId { get; set; }
}

public class UpdateRoleRequest
{
    public int RoleId { get; set; }
}

public class UpdateStatusRequest
{
    public bool IsActive { get; set; }
}

public class UpdateRolesRequest
{
    public int[] RoleIds { get; set; } = Array.Empty<int>();
}

public class UpdateProfileImageRequest
{
    public string? ProfileImage { get; set; }
}
