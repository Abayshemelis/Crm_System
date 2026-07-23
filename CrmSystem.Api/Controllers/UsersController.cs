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
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return int.Parse(claim!.Value);
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var userId = GetCurrentUserId();

        var query = _db.Identities
            .Include(i => i.Role)
            .Include(i => i.IdentityRoles)
                .ThenInclude(ir => ir.Role)
            .Where(i => i.Role!.Name != "Admin")
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
            IsActive = i.IsActive
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

        // Only Admin can create Manager users
        if (role.Name == "Manager" && !isAdmin)
        {
            return Forbid();
        }

        // Prevent creating Admin users
        if (role.Name == "Admin")
        {
            return BadRequest(new { message = "Cannot create Admin users." });
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

        // Only Admin can assign Manager role
        if (role.Name == "Manager" && !isAdmin)
        {
            return Forbid();
        }

        // Prevent assigning Admin role
        if (role.Name == "Admin")
        {
            return BadRequest(new { message = "Cannot assign Admin role." });
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

        // Only Admin can assign Manager or Admin roles
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
        var user = await _db.Identities.FindAsync(id);
        if (user is null)
        {
            return NotFound();
        }

        user.IsActive = request.IsActive;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _db.Identities.FindAsync(id);
        if (user is null)
        {
            return NotFound();
        }

        // Prevent deleting the current user
        if (user.IdentityId == GetCurrentUserId())
        {
            return BadRequest(new { message = "Cannot delete your own account." });
        }

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
