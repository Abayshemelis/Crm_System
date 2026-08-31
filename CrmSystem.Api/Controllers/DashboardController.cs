// ==============================================================================
// CRM SYSTEM DASHBOARD CONTROLLER (DashboardController.cs)
// ==============================================================================
// Provides real-time CRM analytics, KPI summary cards, pipeline metrics,
// conversion rates, monthly revenue graphs, and recent activity streams.
//
// Key Features:
// 1. Role-Based Scoping: Admins/Managers view global metrics; SalesReps see their assigned portfolio.
// 2. Financial Metrics: Pipeline Value, Won Revenue, Average Deal Size, Win Rate.
// 3. Public Stats: Anonymous endpoint for landing page showcases and public website widgets.
// 4. Contact Form Ingestion: Converts website inquiries directly into CRM Leads.
// ==============================================================================

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

    // Helper to retrieve the authenticated user's database IdentityId from JWT claims
    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return int.Parse(claim!.Value);
    }

    // Helper to check if current user has the restricted SalesRep role
    private bool IsRestrictedUser() => !User.IsInRole("Admin") && !User.IsInRole("Manager");

    // ── 1. PUBLIC STATS (ANONYMOUS LANDING PAGE METRICS) ──────────────────────
    // Aggregates high-level metrics for unauthenticated visitors and landing page counters.
    [HttpGet("public-stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicStats()
    {
        var today = DateTime.UtcNow.Date;

        var totalCustomers = await _db.Customers.AsNoTracking().Where(c => !c.IsDeleted).CountAsync();
        var totalLeads = await _db.Leads.AsNoTracking().Where(l => !l.IsDeleted).CountAsync();
        var totalCompanies = await _db.Companies.AsNoTracking().Where(c => !c.IsDeleted).CountAsync();
        var totalProducts = await _db.Products.AsNoTracking().CountAsync();
        var totalActivities = await _db.Activities.AsNoTracking().CountAsync();

        var openOpportunities = await _db.Opportunities
            .AsNoTracking()
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost && !o.ActualCloseDate.HasValue)))
            .CountAsync();

        var wonOpportunities = await _db.Opportunities
            .AsNoTracking()
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && o.OpportunityStage.IsWon)
            .CountAsync();

        var lostOpportunities = await _db.Opportunities
            .AsNoTracking()
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && o.OpportunityStage.IsLost)
            .CountAsync();

        var totalRevenue = await _db.Opportunities
            .AsNoTracking()
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && o.OpportunityStage.IsWon)
            .SumAsync(o => (double?)o.EstimatedValue) ?? 0.0;

        var pipelineValue = await _db.Opportunities
            .AsNoTracking()
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)))
            .SumAsync(o => (double?)o.EstimatedValue) ?? 0.0;

        var pipelineStages = await _db.OpportunityStages
            .AsNoTracking()
            .OrderBy(s => s.SortOrder)
            .Select(s => new
            {
                Name = s.Name,
                Count = _db.Opportunities.AsNoTracking().Count(o => !o.Customer.IsDeleted && o.OpportunityStageId == s.OpportunityStageId),
                Value = _db.Opportunities.AsNoTracking().Where(o => !o.Customer.IsDeleted && o.OpportunityStageId == s.OpportunityStageId).Sum(o => (double?)o.EstimatedValue) ?? 0.0
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
        var winRate = totalClosed > 0 ? Math.Round((double)wonOpportunities / totalClosed * 100, 1) : 0.0;
        var averageDealSize = wonOpportunities > 0 ? Math.Round(totalRevenue / wonOpportunities) : 0.0;

        return Ok(new
        {
            totalCustomers,
            totalLeads,
            totalCompanies,
            totalProducts,
            totalActivities,
            openOpportunities,
            wonOpportunities,
            lostOpportunities,
            totalRevenue,
            pipelineValue,
            pipelineStages,
            recentLeads,
            totalTasks,
            completedTasks,
            pendingTasks,
            overdueTasks,
            winRate,
            averageDealSize
        });
    }

    // ── 2. WEBSITE CONTACT FORM INTAKE (LEAD CAPTURE) ─────────────────────────
    // Receives external website inquiries and automatically creates a new Lead with 'New' status.
    public class ContactRequestDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Source { get; set; }
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
        
        Source? matchedSource = null;
        if (!string.IsNullOrWhiteSpace(dto.Source))
        {
            matchedSource = await _db.Sources.FirstOrDefaultAsync(s => s.Name.ToLower() == dto.Source.Trim().ToLower());
        }
        matchedSource ??= await _db.Sources.FirstOrDefaultAsync(s => s.Name == "Website");

        var names = dto.Name.Trim().Split(' ', 2);
        var firstName = names[0];
        var lastName = names.Length > 1 ? names[1] : "Inquiry";

        var lead = new Lead
        {
            FirstName = firstName,
            LastName = lastName,
            Email = dto.Email.Trim(),
            Phone = !string.IsNullOrWhiteSpace(dto.Phone) ? dto.Phone.Trim() : null,
            CompanyName = !string.IsNullOrWhiteSpace(dto.Subject) ? dto.Subject.Trim() : "Website Contact Form",
            LeadStatusId = defaultStatus?.LeadStatusId,
            SourceId = matchedSource?.SourceId,
            Notes = $"[Website Contact Form Inquiry]\nSubject: {dto.Subject}\nPhone: {dto.Phone ?? "N/A"}\nSource: {dto.Source ?? "Website"}\n\nMessage:\n{dto.Message}",
            CreatedAt = DateTime.UtcNow
        };

        _db.Leads.Add(lead);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Message submitted successfully. CRM Lead created.", leadId = lead.LeadId });
    }

    // ── 3. AUTHENTICATED EXECUTIVE DASHBOARD STATS ───────────────────────────
    // Main statistics engine used by DashboardScreen.tsx in the React frontend.
    // Calculates financial totals, 6-month monthly revenue trends, lead conversion rates,
    // SLA task counts, recent activities, and top deals.
    [HttpGet("stats")]
    [Authorize]
    public async Task<IActionResult> GetDashboardStats([FromQuery] bool includeClosed = false)
    {
        var userId = GetCurrentUserId();
        var today = DateTime.UtcNow.Date;

        IQueryable<Customer> customersQuery = _db.Customers.AsNoTracking();
        IQueryable<Lead> leadsQuery = _db.Leads.AsNoTracking().Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null));
        IQueryable<Opportunity> opportunitiesQuery = _db.Opportunities.AsNoTracking().Where(o => (o.CustomerId == null || o.Customer != null));
        IQueryable<CrmTask> tasksQuery = _db.CrmTasks.AsNoTracking().Where(t => (t.CustomerId == null || t.Customer != null) && (t.LeadId == null || (t.Lead != null && (t.Lead.ConvertedCustomerId == null || t.Lead.ConvertedCustomer != null))) && (t.OpportunityId == null || (t.Opportunity != null && (t.Opportunity.CustomerId == null || t.Opportunity.Customer != null))));
        IQueryable<Activity> activitiesQuery = _db.Activities.AsNoTracking().Where(a => (a.CustomerId == null || a.Customer != null) && (a.LeadId == null || (a.Lead != null && (a.Lead.ConvertedCustomerId == null || a.Lead.ConvertedCustomer != null))) && (a.OpportunityId == null || (a.Opportunity != null && (a.Opportunity.CustomerId == null || a.Opportunity.Customer != null))));
        IQueryable<Product> productsQuery = _db.Products.AsNoTracking();

        // Apply Role-Based Data Isolation: SalesReps only see records assigned to their user ID
        if (IsRestrictedUser())
        {
            customersQuery = customersQuery.Where(c => c.AssignedRepId == userId);
            leadsQuery = leadsQuery.Where(l => l.AssignedRepId == userId);
            opportunitiesQuery = opportunitiesQuery.Where(o => o.OwnerId == userId);
            tasksQuery = tasksQuery.Where(t => t.AssignedToId == userId);
            activitiesQuery = activitiesQuery.Where(a => a.CreatedById == userId);
        }

        var totalCustomers = await customersQuery.CountAsync();
        var totalLeadsAll = await leadsQuery.CountAsync();
        var totalLeads = await leadsQuery.Where(l => l.LeadStatus == null || l.LeadStatus.Name != "Converted").CountAsync();

        // ── Pipeline & Deal Calculations ──────────────────────────────────────
        var baseOpportunitiesQuery = opportunitiesQuery
            .Include(o => o.OpportunityStage)
            .Include(o => o.Customer)
            .ThenInclude(c => c.Company);

        IQueryable<Opportunity> openOpportunitiesQuery;
        if (includeClosed)
        {
            openOpportunitiesQuery = baseOpportunitiesQuery;
        }
        else
        {
            // Open pipeline excludes won/lost deals and deals with an actual close date
            openOpportunitiesQuery = baseOpportunitiesQuery
                .Where(o => o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost && !o.ActualCloseDate.HasValue));
        }

        var openDeals = await openOpportunitiesQuery.CountAsync();
        var pipelineValue = await openOpportunitiesQuery.SumAsync(o => (double?)o.EstimatedValue) ?? 0.0;
        var averageDealSize = openDeals > 0 ? pipelineValue / openDeals : 0.0;

        // ── Won Revenue Calculation ───────────────────────────────────────────
        var wonOpportunitiesQuery = opportunitiesQuery
            .Include(o => o.OpportunityStage)
            .Where(o => o.OpportunityStage != null && o.OpportunityStage.IsWon);
        var totalWonRevenue = await wonOpportunitiesQuery.SumAsync(o => (double?)o.EstimatedValue) ?? 0.0;

        // Also check completed payments from database
        var totalCollectedPayments = await _db.Payments
            .Where(p => !p.IsDeleted && p.Status == "Completed")
            .SumAsync(p => (double?)p.Amount) ?? 0.0;

        var totalRevenue = Math.Max(totalWonRevenue, totalCollectedPayments);

        // ── 6-Month Monthly Revenue Grouping ───────────────────────────────────
        var sixMonthsAgo = today.AddMonths(-5);
        var firstDayOfWindow = new DateTime(sixMonthsAgo.Year, sixMonthsAgo.Month, 1);

        var wonOppsInWindow = await wonOpportunitiesQuery
            .Where(o => (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) >= firstDayOfWindow)
            .Select(o => new
            {
                Date = o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt,
                Value = (double)o.EstimatedValue
            })
            .ToListAsync();

        var paymentsInWindow = await _db.Payments
            .Where(p => !p.IsDeleted && p.Status == "Completed" && p.PaymentDate >= firstDayOfWindow)
            .Select(p => new
            {
                Date = p.PaymentDate,
                Value = (double)p.Amount
            })
            .ToListAsync();

        var sixMonthsList = Enumerable.Range(0, 6)
            .Select(i => firstDayOfWindow.AddMonths(i))
            .Select(d => new
            {
                Year = d.Year,
                Month = d.Month,
                MonthKey = $"{d.Year}-{d.Month:D2}"
            })
            .ToList();

        var revenueByMonth = sixMonthsList.Select(m =>
        {
            var oppSum = wonOppsInWindow.Where(o => o.Date.Year == m.Year && o.Date.Month == m.Month).Sum(o => o.Value);
            var paySum = paymentsInWindow.Where(p => p.Date.Year == m.Year && p.Date.Month == m.Month).Sum(p => p.Value);
            return new
            {
                Month = m.MonthKey,
                Revenue = Math.Max(oppSum, paySum)
            };
        }).ToList();

        // ── Lead Conversion Rate ──────────────────────────────────────────────
        var convertedLeadsCount = await leadsQuery.Where(l => l.LeadStatus != null && l.LeadStatus.IsTerminal && l.LeadStatus.Name == "Converted").CountAsync();
        var conversionRate = totalLeadsAll > 0 ? (double)convertedLeadsCount / totalLeadsAll * 100 : 0.0;

        // ── Task & SLA Counts ─────────────────────────────────────────────────
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

        // ── Product Inventory Metrics ─────────────────────────────────────────
        var productsInStock = await productsQuery
            .Include(p => p.ProductStatus)
            .Where(p => p.ProductStatus != null && p.ProductStatus.IsSelectable && p.StockQuantity > 0)
            .CountAsync();
        var totalProducts = await productsQuery.CountAsync();

        // ── Recent Activity Stream (Never blank, complete metadata) ───────────
        var recentActivities = await activitiesQuery
            .Include(a => a.ActivityType)
            .Include(a => a.Customer)
            .ThenInclude(c => c!.Company)
            .Include(a => a.Opportunity)
            .Include(a => a.Lead)
            .OrderByDescending(a => a.ActivityDate)
            .Take(10)
            .Select(a => new
            {
                a.ActivityId,
                Subject = !string.IsNullOrWhiteSpace(a.Subject) ? a.Subject : (a.ActivityType != null ? a.ActivityType.Name : "Activity"),
                a.ActivityDate,
                a.CustomerId,
                a.OpportunityId,
                a.LeadId,
                CustomerName = a.Customer != null ? $"{a.Customer.FirstName} {a.Customer.LastName}".Trim() : null,
                CompanyName = a.Customer != null && a.Customer.Company != null ? a.Customer.Company.Name : null,
                OpportunityTitle = a.Opportunity != null ? a.Opportunity.Title : null,
                LeadName = a.Lead != null ? $"{a.Lead.FirstName} {a.Lead.LastName}".Trim() : null,
                TypeName = a.ActivityType != null ? a.ActivityType.Name : "Activity",
                a.Description
            })
            .ToListAsync();

        // ── Top 5 Open Opportunities ──────────────────────────────────────────
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

        // ── Financial & Invoicing Aggregate Metrics ──────────────────────────
        var allInvoices = await _db.Invoices
            .AsNoTracking()
            .Where(i => !i.IsDeleted)
            .Include(i => i.Payments)
            .ToListAsync();

        var totalInvoiced = allInvoices.Sum(i => (double)i.TotalAmount);

        var totalCollected = totalCollectedPayments > 0 
            ? totalCollectedPayments 
            : allInvoices.Sum(i => {
                var pSum = (double)(i.Payments?.Where(p => !p.IsDeleted && p.Status == "Completed").Sum(p => p.Amount) ?? 0m);
                return pSum > 0 ? pSum : (i.Status == "Paid" ? (double)i.TotalAmount : 0.0);
            });

        var totalReceivable = allInvoices
            .Where(i => i.Status != "Cancelled")
            .Sum(i => {
                var pSum = (double)(i.Payments?.Where(p => !p.IsDeleted && p.Status == "Completed").Sum(p => p.Amount) ?? 0m);
                var paid = pSum > 0 ? pSum : (i.Status == "Paid" ? (double)i.TotalAmount : 0.0);
                return Math.Max(0.0, (double)i.TotalAmount - paid);
            });

        var overdueInvoicesCount = allInvoices
            .Count(i => i.Status != "Paid" && i.Status != "Cancelled" && i.DueDate.Date < today && ((double)i.TotalAmount - (double)(i.Payments?.Where(p => !p.IsDeleted && p.Status == "Completed").Sum(p => p.Amount) ?? 0m) > 0.01));

        var pendingWireCount = await _db.Payments
            .AsNoTracking()
            .Where(p => !p.IsDeleted && (p.Status == "PendingVerification" || p.Status == "Pending"))
            .CountAsync();

        var activeContractsCount = await _db.Contracts
            .AsNoTracking()
            .Where(c => !c.IsDeleted && c.Status == "Active")
            .CountAsync();

        var totalContractValue = await _db.Contracts
            .AsNoTracking()
            .Where(c => !c.IsDeleted && c.Status == "Active")
            .SumAsync(c => (double?)c.ContractValue) ?? 0.0;

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
            conversionRate = Math.Round(conversionRate, 1),
            completedTasksCount,
            pendingTasksCount,
            overdueTasksCount,
            dueTodayTasksCount,
            productsInStock,
            totalProducts,
            recentActivities,
            topOpportunities,
            totalInvoiced,
            totalCollected,
            totalReceivable,
            overdueInvoicesCount,
            pendingWireCount,
            activeContractsCount,
            totalContractValue
        });
    }
}
