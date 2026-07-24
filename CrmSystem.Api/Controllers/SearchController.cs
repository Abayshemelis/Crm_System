using System.Linq;
using System.Threading.Tasks;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _db;

    public SearchController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("global")]
    public async Task<IActionResult> GlobalSearch([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
        {
            return BadRequest("Search query must be at least 2 characters long.");
        }

        var q = query.ToLower();

        // 1. Search Customers
        var customers = await _db.Customers
            .AsNoTracking()
            .Where(c => !c.IsDeleted && (
                c.FirstName.ToLower().Contains(q) || 
                c.LastName.ToLower().Contains(q) || 
                (c.Email != null && c.Email.ToLower().Contains(q))))
            .Take(5)
            .Select(c => new
            {
                Type = "customer",
                Id = c.CustomerId,
                Title = c.FirstName + " " + c.LastName,
                Subtitle = c.Email ?? c.Phone ?? ""
            })
            .ToListAsync();

        // 2. Search Companies
        var companies = await _db.Companies
            .AsNoTracking()
            .Where(c => !c.IsDeleted && c.Name.ToLower().Contains(q))
            .Take(5)
            .Select(c => new
            {
                Type = "company",
                Id = c.CompanyId,
                Title = c.Name,
                Subtitle = c.Industry ?? c.Website ?? ""
            })
            .ToListAsync();

        // 3. Search Opportunities
        var opportunities = await _db.Opportunities
            .AsNoTracking()
            .Where(o => o.Title.ToLower().Contains(q))
            .Take(5)
            .Select(o => new
            {
                Type = "opportunity",
                Id = o.OpportunityId,
                Title = o.Title,
                Subtitle = o.Customer != null ? o.Customer.FirstName + " " + o.Customer.LastName : ""
            })
            .ToListAsync();

        var results = customers.Concat(companies).Concat(opportunities).ToList();

        return Ok(results);
    }
}
