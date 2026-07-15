using System.Security.Claims;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
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

    public UsersController(AppDbContext db)
    {
        _db = db;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return int.Parse(claim!.Value);
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value ?? "SalesRep";
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var role = GetCurrentUserRole();
        var userId = GetCurrentUserId();

        var query = _db.Identities.Include(i => i.Role)
            .Where(i => i.Role!.Name != "Admin")
            .AsQueryable();
        if (role == "SalesRep")
        {
            query = query.Where(i => i.IdentityId == userId);
        }

        var users = await query.Select(i => new
        {
            Id = i.IdentityId,
            i.Name,
            i.Email,
            Role = i.Role!.Name,
            RoleId = i.RoleId,
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

        var currentRole = GetCurrentUserRole();

        // Only Admin can create Manager users
        if (role.Name == "Manager" && currentRole != "Admin")
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

        return CreatedAtAction(nameof(GetUsers), new { id = user.IdentityId }, new { Id = user.IdentityId });
    }

    [HttpPut("{id:int}/role")]
    [Authorize(Policy = "ManagerOrAbove")]
    public async Task<IActionResult> UpdateUserRole(int id, [FromBody] UpdateRoleRequest request)
    {
        var user = await _db.Identities.FindAsync(id);
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

        var currentRole = GetCurrentUserRole();

        // Only Admin can assign Manager role
        if (role.Name == "Manager" && currentRole != "Admin")
        {
            return Forbid();
        }

        // Prevent assigning Admin role
        if (role.Name == "Admin")
        {
            return BadRequest(new { message = "Cannot assign Admin role." });
        }

        user.RoleId = request.RoleId;
        await _db.SaveChangesAsync();

        return NoContent();
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
