using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CompaniesController : ControllerBase
{
    private readonly AppDbContext _context;

    public CompaniesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCompanies()
    {
        var companies = await _context.Companies
            .OrderByDescending(c => c.CompanyId)
            .Select(c => new
            {
                Id = c.CompanyId,
                c.Name,
                c.Industry,
                c.Website,
                c.Address,
                c.AssignedRepId
            })
            .ToListAsync();

        return Ok(new { items = companies, totalCount = companies.Count });
    }
}
