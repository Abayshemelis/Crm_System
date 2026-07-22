using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
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

    [HttpGet("public-stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicStats()
    {
        var today = DateTime.UtcNow.Date;

        var totalCustomers = await _db.Customers.Where(c => !c.IsDeleted).CountAsync();
        var totalLeads = await _db.Leads.Where(l => !l.IsDeleted).CountAsync();

        var openOpportunities = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost && !o.ActualCloseDate.HasValue))
            .CountAsync();

        var wonOpportunities = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => o.OpportunityStage != null && o.OpportunityStage.IsWon)
            .CountAsync();

        var totalRevenue = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => o.OpportunityStage != null && o.OpportunityStage.IsWon)
            .SumAsync(o => (double?)o.EstimatedValue) ?? 0.0;

        var pipelineStages = await _db.OpportunityStages
            .OrderBy(s => s.SortOrder)
            .Select(s => new
            {
                Name = s.Name,
                Count = _db.Opportunities.Count(o => o.OpportunityStageId == s.OpportunityStageId)
            })
            .ToListAsync();

        var recentLeads = await _db.Leads
            .Where(l => !l.IsDeleted)
            .Include(l => l.LeadStatus)
            .OrderByDescending(l => l.CreatedAt)
            .Take(5)
            .Select(l => new
            {
                Name = l.CompanyName ?? $"{l.FirstName} {l.LastName}",
                Status = l.LeadStatus != null ? l.LeadStatus.Name : "New",
                Date = l.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            totalCustomers,
            totalLeads,
            dealsClosed = wonOpportunities,
            totalRevenue,
            pipelineStages,
            recentLeads
        });
    }

    [HttpGet("stats")]
    [Authorize]
    public async Task<IActionResult> GetDashboardStats([FromQuery] bool includeClosed = false)
    {
        var userId = GetCurrentUserId();
        var role = GetCurrentUserRole();
        var today = DateTime.UtcNow.Date;

        IQueryable<Customer> customersQuery = _db.Customers.Where(c => !c.IsDeleted);
        IQueryable<Lead> leadsQuery = _db.Leads.Where(l => !l.IsDeleted);
        IQueryable<Opportunity> opportunitiesQuery = _db.Opportunities;
        IQueryable<CrmTask> tasksQuery = _db.CrmTasks;
        IQueryable<Activity> activitiesQuery = _db.Activities;
        IQueryable<Product> productsQuery = _db.Products;

        // Filter based on role
        if (role == "SalesRep")
        {
            customersQuery = customersQuery.Where(c => c.AssignedRepId == userId);
            leadsQuery = leadsQuery.Where(l => l.AssignedRepId == userId);
            opportunitiesQuery = opportunitiesQuery.Where(o => o.OwnerId == userId);
            tasksQuery = tasksQuery.Where(t => t.AssignedToId == userId);
            activitiesQuery = activitiesQuery.Where(a => a.CreatedById == userId);
        }

        var totalCustomers = await customersQuery.CountAsync();
        // Count all leads and also count non-converted leads for display
        var totalLeadsAll = await leadsQuery.CountAsync();
        var totalLeads = await leadsQuery.Where(l => l.LeadStatus == null || l.LeadStatus.Name != "Converted").CountAsync();

        // Opportunities: optionally include closed/won deals when requested
        var baseOpportunitiesQuery = opportunitiesQuery
            .Include(o => o.OpportunityStage)
            .Include(o => o.Customer)
            .ThenInclude(c => c.Company);

        IQueryable<Opportunity> openOpportunitiesQuery;
        if (includeClosed)
        {
            // include all opportunities (open and closed)
            openOpportunitiesQuery = baseOpportunitiesQuery;
        }
        else
        {
            // only open opportunities (exclude Won/Lost and those with an ActualCloseDate)
            openOpportunitiesQuery = baseOpportunitiesQuery
                .Where(o => o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost && !o.ActualCloseDate.HasValue));
        }

        var openDeals = await openOpportunitiesQuery.CountAsync();
        var pipelineValue = await openOpportunitiesQuery.SumAsync(o => (double?)o.EstimatedValue) ?? 0.0;
        var averageDealSize = openDeals > 0 ? pipelineValue / openDeals : 0.0;

        // Won Opportunities (Revenue)
        var wonOpportunitiesQuery = opportunitiesQuery
            .Include(o => o.OpportunityStage)
            .Where(o => o.OpportunityStage != null && o.OpportunityStage.IsWon);
        var totalRevenue = await wonOpportunitiesQuery.SumAsync(o => (double?)o.EstimatedValue) ?? 0.0;

        // Revenue by month (last 6 months)
        var sixMonthsAgo = today.AddMonths(-6);
        var revenueByMonth = await wonOpportunitiesQuery
            .Where(o => o.ActualCloseDate.HasValue && o.ActualCloseDate.Value >= sixMonthsAgo)
            .GroupBy(o => new { Year = o.ActualCloseDate.Value.Year, Month = o.ActualCloseDate.Value.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                Month = $"{g.Key.Year}-{g.Key.Month:D2}",
                Revenue = g.Sum(o => (double?)o.EstimatedValue) ?? 0.0
            })
            .ToListAsync();

        // Conversion Rate (Leads converted to Customers)
        var convertedLeadsCount = await leadsQuery.Where(l => l.LeadStatus != null && l.LeadStatus.IsTerminal && l.LeadStatus.Name == "Converted").CountAsync();
        // Use all leads as the denominator for conversion rate to preserve previous semantics
        var conversionRate = totalLeadsAll > 0 ? (double)convertedLeadsCount / totalLeadsAll * 100 : 0.0;

        // Task Counts
        var now = DateTime.UtcNow;
        var completedTasksCount = await tasksQuery
            .Include(t => t.CrmTaskStatus)
            .Where(t => t.CrmTaskStatus != null && t.CrmTaskStatus.IsTerminal)
            .CountAsync();
        var pendingTasksCount = await tasksQuery
            .Include(t => t.CrmTaskStatus)
            .Where(t => t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal)
            .CountAsync();
        var overdueTasksCount = await tasksQuery
            .Include(t => t.CrmTaskStatus)
            .Where(t => t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal)
            .Where(t => t.DueDate.HasValue && t.DueDate.Value < now)
            .CountAsync();
        var dueTodayTasksCount = await tasksQuery
            .Include(t => t.CrmTaskStatus)
            .Where(t => t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal)
            .Where(t => t.DueDate.HasValue && t.DueDate.Value.Date == today && t.DueDate.Value >= now)
            .CountAsync();

        // Products in Stock
        var productsInStock = await productsQuery
            .Include(p => p.ProductStatus)
            .Where(p => p.ProductStatus != null && p.ProductStatus.IsSelectable && p.StockQuantity > 0)
            .CountAsync();
        var totalProducts = await productsQuery.CountAsync();

        // Recent activities
        var recentActivities = await activitiesQuery
            .Include(a => a.Customer)
            .ThenInclude(c => c!.Company)
            .Include(a => a.Opportunity)
            .OrderByDescending(a => a.ActivityDate)
            .Take(5)
            .Select(a => new
            {
                a.ActivityId,
                a.Subject,
                a.ActivityDate,
                CustomerName = a.Customer != null ? $"{a.Customer.FirstName} {a.Customer.LastName}" : null,
                CompanyName = a.Customer != null && a.Customer.Company != null ? a.Customer.Company.Name : null,
                OpportunityTitle = a.Opportunity != null ? a.Opportunity.Title : null
            })
            .ToListAsync();

        // Top opportunities
        var topOpportunities = await openOpportunitiesQuery
            .OrderByDescending(o => o.EstimatedValue)
            .Take(5)
            .Select(o => new
            {
                o.OpportunityId,
                o.Title,
                CustomerName = o.Customer != null ? $"{o.Customer.FirstName} {o.Customer.LastName}" : null,
                CompanyName = o.Customer != null && o.Customer.Company != null ? o.Customer.Company.Name : null,
                StageName = o.OpportunityStage != null ? o.OpportunityStage.Name : "Open",
                EstimatedValue = (double)o.EstimatedValue
            })
            .ToListAsync();

        return Ok(new
        {
            totalCustomers,
            totalLeads,
            openDeals,
            pipelineValue,
            averageDealSize,
            totalRevenue,
            revenueByMonth,
            conversionRate,
            completedTasksCount,
            pendingTasksCount,
            overdueTasksCount,
            dueTodayTasksCount,
            productsInStock,
            totalProducts,
            recentActivities,
            topOpportunities
        });
    }
}
