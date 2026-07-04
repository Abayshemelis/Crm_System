using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _context;

    public CustomersController(AppDbContext context)
    {
        _context = context;
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
    public async Task<IActionResult> GetCustomers([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var role = GetCurrentUserRole();
        var userId = GetCurrentUserId();

        var query = _context.Customers
            .Include(c => c.Company)
            .Include(c => c.Tags)
            .AsQueryable();

        if (role == "SalesRep")
        {
            query = query.Where(c => c.AssignedRepId == userId);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CustomerId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                Id = c.CustomerId,
                c.FirstName,
                c.LastName,
                c.Email,
                c.Phone,
                Address = "",
                c.Source,
                c.AssignedRepId,
                Company = c.Company != null ? new { Id = c.Company.CompanyId, c.Company.Name } : null,
                Tags = c.Tags.Select(t => new { Id = t.TagId, t.Name, ColorHex = "#3b82f6" })
            })
            .ToListAsync();

        return Ok(new { items, totalCount, page, pageSize });
    }

    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] Customer customer)
    {
        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetCustomers), new { id = customer.CustomerId }, customer);
    }
}
