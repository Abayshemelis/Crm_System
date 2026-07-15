using System.Security.Claims;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db)
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

    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var userId = GetCurrentUserId();
        var role = GetCurrentUserRole();

        IQueryable<CrmSystem.Domain.Entities.Customer> customersQuery = _db.Customers.Where(c => !c.IsDeleted);
        IQueryable<CrmSystem.Domain.Entities.Lead> leadsQuery = _db.Leads.Where(l => !l.IsDeleted);
        IQueryable<CrmSystem.Domain.Entities.Opportunity> opportunitiesQuery = _db.Opportunities;

        // Filter based on role
        if (role == "SalesRep")
        {
            // SalesRep sees only their own data
            customersQuery = customersQuery.Where(c => c.AssignedRepId == userId);
            leadsQuery = leadsQuery.Where(l => l.AssignedRepId == userId);
            opportunitiesQuery = opportunitiesQuery.Where(o => o.OwnerId == userId);
        }
        // Manager and Admin see all data (for now - could add team filtering later)

        var totalCustomers = await customersQuery.CountAsync();
        var totalLeads = await leadsQuery.CountAsync();
        
        var opportunities = await opportunitiesQuery.Include(o => o.OpportunityStage).ToListAsync();
        var openDeals = opportunities.Count(o => 
        {
            var stageName = o.OpportunityStage?.Name?.ToLower() ?? "";
            var isClosed = stageName == "won" || stageName == "lost" || o.ActualCloseDate.HasValue;
            return !isClosed;
        });

        return Ok(new
        {
            totalCustomers,
            totalLeads,
            openDeals
        });
    }
}
