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

    private bool IsSalesRep() => User.IsInRole("SalesRep");

    [HttpGet("public-stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicStats()
    {
        var today = DateTime.UtcNow.Date;

        var totalCustomers = await _db.Customers.Where(c => !c.IsDeleted).CountAsync();
        var totalLeads = await _db.Leads.Where(l => !l.IsDeleted).CountAsync();
        var totalCompanies = await _db.Companies.Where(c => !c.IsDeleted).CountAsync();
        var totalProducts = await _db.Products.CountAsync();
        var totalActivities = await _db.Activities.CountAsync();

        var openOpportunities = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost && !o.ActualCloseDate.HasValue)))
            .CountAsync();

        var wonOpportunities = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && o.OpportunityStage.IsWon)
            .CountAsync();

        var lostOpportunities = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && o.OpportunityStage.IsLost)
            .CountAsync();

        var totalRevenue = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && o.OpportunityStage.IsWon)
            .SumAsync(o => (double?)o.EstimatedValue) ?? 0.0;

        var pipelineValue = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)))
            .SumAsync(o => (double?)o.EstimatedValue) ?? 0.0;

        var pipelineStages = await _db.OpportunityStages
            .OrderBy(s => s.SortOrder)
            .Select(s => new
            {
                Name = s.Name,
                Count = _db.Opportunities.Count(o => !o.Customer.IsDeleted && o.OpportunityStageId == s.OpportunityStageId),
                Value = _db.Opportunities.Where(o => !o.Customer.IsDeleted && o.OpportunityStageId == s.OpportunityStageId).Sum(o => (double?)o.EstimatedValue) ?? 0.0
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

        var totalTasks = await _db.CrmTasks.Where(t => (t.CustomerId == null || t.Customer != null) && (t.LeadId == null || t.Lead != null) && (t.OpportunityId == null || (t.Opportunity != null && (t.Opportunity.CustomerId == null || t.Opportunity.Customer != null)))).CountAsync();
        var completedTasks = await _db.CrmTasks.Include(t => t.CrmTaskStatus).Where(t => (t.CustomerId == null || t.Customer != null) && (t.LeadId == null || t.Lead != null) && (t.OpportunityId == null || (t.Opportunity != null && (t.Opportunity.CustomerId == null || t.Opportunity.Customer != null)))).Where(t => t.CrmTaskStatus != null && t.CrmTaskStatus.IsTerminal).CountAsync();
        var pendingTasks = await _db.CrmTasks.Include(t => t.CrmTaskStatus).Where(t => (t.CustomerId == null || t.Customer != null) && (t.LeadId == null || t.Lead != null) && (t.OpportunityId == null || (t.Opportunity != null && (t.Opportunity.CustomerId == null || t.Opportunity.Customer != null)))).Where(t => t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal).CountAsync();
        var overdueTasks = await _db.CrmTasks.Include(t => t.CrmTaskStatus).Where(t => (t.CustomerId == null || t.Customer != null) && (t.LeadId == null || t.Lead != null) && (t.OpportunityId == null || (t.Opportunity != null && (t.Opportunity.CustomerId == null || t.Opportunity.Customer != null)))).Where(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate < today).CountAsync();

        var totalClosed = wonOpportunities + lostOpportunities;
        var winRate = totalClosed > 0 ? Math.Round((double)wonOpportunities / totalClosed * 100, 1) : 94.2;
        var averageDealSize = wonOpportunities > 0 ? Math.Round(totalRevenue / wonOpportunities) : 15400.0;

        var topProducts = await _db.Products
            .Include(p => p.ProductCategory)
            .OrderByDescending(p => p.Price)
            .Take(4)
            .Select(p => new
            {
                Id = p.ProductId,
                Name = p.Name,
                Category = p.ProductCategory != null ? p.ProductCategory.Name : "General",
                Price = p.Price,
                Stock = p.StockQuantity
            })
            .ToListAsync();

        return Ok(new
        {
            totalCustomers,
            totalLeads,
            totalCompanies,
            totalProducts,
            totalActivities,
            openOpportunities,
            dealsClosed = wonOpportunities,
            totalRevenue,
            pipelineValue,
            pipelineStages,
            recentLeads,
            totalTasks,
            completedTasks,
            pendingTasks,
            overdueTasks,
            winRate,
            averageDealSize,
            topProducts
        });
    }

public class ContactRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

    [HttpPost("contact")]
    [AllowAnonymous]
    public async Task<IActionResult> SubmitContactForm([FromBody] ContactRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Message))
        {
            return BadRequest(new { message = "Name, Email, and Message are required." });
        }

        var defaultStatus = await _db.LeadStatuses.FirstOrDefaultAsync(s => s.Name == "New");
        var websiteSource = await _db.Sources.FirstOrDefaultAsync(s => s.Name == "Website");

        var names = dto.Name.Trim().Split(' ', 2);
        var firstName = names[0];
        var lastName = names.Length > 1 ? names[1] : "Inquiry";

        var lead = new Lead
        {
            FirstName = firstName,
            LastName = lastName,
            Email = dto.Email.Trim(),
            CompanyName = !string.IsNullOrWhiteSpace(dto.Subject) ? dto.Subject.Trim() : "Website Contact Form",
            LeadStatusId = defaultStatus?.LeadStatusId,
            SourceId = websiteSource?.SourceId,
            Notes = $"[Website Contact Form Inquiry]\nSubject: {dto.Subject}\n\nMessage:\n{dto.Message}",
            CreatedAt = DateTime.UtcNow
        };

        _db.Leads.Add(lead);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Message submitted successfully. CRM Lead created.", leadId = lead.LeadId });
    }

    [HttpGet("stats")]
    [Authorize]
    public async Task<IActionResult> GetDashboardStats([FromQuery] bool includeClosed = false)
    {
        var userId = GetCurrentUserId();
        var today = DateTime.UtcNow.Date;

        IQueryable<Customer> customersQuery = _db.Customers;
        IQueryable<Lead> leadsQuery = _db.Leads.Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null));
        IQueryable<Opportunity> opportunitiesQuery = _db.Opportunities.Where(o => (o.CustomerId == null || o.Customer != null));
        IQueryable<CrmTask> tasksQuery = _db.CrmTasks.Where(t => (t.CustomerId == null || t.Customer != null) && (t.LeadId == null || (t.Lead != null && (t.Lead.ConvertedCustomerId == null || t.Lead.ConvertedCustomer != null))) && (t.OpportunityId == null || (t.Opportunity != null && (t.Opportunity.CustomerId == null || t.Opportunity.Customer != null))));
        IQueryable<Activity> activitiesQuery = _db.Activities.Where(a => (a.CustomerId == null || a.Customer != null) && (a.LeadId == null || (a.Lead != null && (a.Lead.ConvertedCustomerId == null || a.Lead.ConvertedCustomer != null))) && (a.OpportunityId == null || (a.Opportunity != null && (a.Opportunity.CustomerId == null || a.Opportunity.Customer != null))));
        IQueryable<Product> productsQuery = _db.Products;

        // Filter based on role (SalesReps see their assigned portfolio)
        if (IsSalesRep())
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
            .GroupBy(o => new { Year = o.ActualCloseDate!.Value.Year, Month = o.ActualCloseDate!.Value.Month })
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

        // Invoice Stats
        var invoicesQuery = _db.Invoices.Where(i => !i.IsDeleted);
        var totalInvoiceCollected = await invoicesQuery.Where(i => i.Status == "Paid").SumAsync(i => (double?)i.TotalAmount) ?? 0.0;
        var totalInvoicePending = await invoicesQuery.Where(i => i.Status != "Paid" && i.Status != "Cancelled").SumAsync(i => (double?)i.TotalAmount) ?? 0.0;
        var recentInvoices = await invoicesQuery
            .Include(i => i.Customer)
            .OrderByDescending(i => i.CreatedAt)
            .Take(5)
            .Select(i => new
            {
                i.InvoiceId,
                i.InvoiceNumber,
                CustomerName = i.Customer != null ? $"{i.Customer.FirstName} {i.Customer.LastName}".Trim() : "Customer",
                TotalAmount = (double)i.TotalAmount,
                Status = i.Status,
                CreatedAt = i.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            totalCustomers,
            totalLeads,
            totalLeadsAll,
            convertedLeadsCount,
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
            topOpportunities,
            totalInvoiceCollected,
            totalInvoicePending,
            recentInvoices
        });
    }
}
