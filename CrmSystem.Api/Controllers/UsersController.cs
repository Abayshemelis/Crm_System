using System.Security.Claims;
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

        var query = _db.Identities.Include(i => i.Role).AsQueryable();
        if (role == "SalesRep")
        {
            query = query.Where(i => i.IdentityId == userId);
        }

        var users = await query.Select(i => new
        {
            Id = i.IdentityId,
            i.Name,
            i.Email,
            Role = i.Role!.Name
        }).ToListAsync();

        return Ok(users);
    }
}
