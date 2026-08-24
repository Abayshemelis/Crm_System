using System;
using System.Linq;
using System.Threading.Tasks;
using CrmSystem.Api.Services;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public ReportsController(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    // ── 1. Pipeline by Stage ──────────────────────────────────────────────────
    [HttpGet("pipeline-by-stage")]
    public async Task<IActionResult> GetPipelineByStage(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var isAdmin = _currentUser.IsAdmin && scope != "personal";
        var isManager = _currentUser.IsManagerOrAbove && scope != "personal";
        var userId = _currentUser.UserId;
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : (DateTime?)null;
        var query = _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)) && (isAdmin || o.OwnerId == userId || (isManager && o.Owner.ManagerId == userId)));
        if (startDate.HasValue) query = query.Where(o => o.CreatedAt >= startDate.Value);
        if (end.HasValue)       query = query.Where(o => o.CreatedAt <= end.Value);

        var results = await query
            .GroupBy(o => new { o.OpportunityStageId, StageName = o.OpportunityStage != null ? o.OpportunityStage.Name : "No Stage" })
            .Select(g => new { Stage = g.Key.StageName, Value = g.Sum(o => o.EstimatedValue), Count = g.Count() })
            .ToListAsync();

        return Ok(results);
    }

    // ── 2. Win Rate ───────────────────────────────────────────────────────────
    [HttpGet("win-rate")]
    public async Task<IActionResult> GetWinRate(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var isAdmin = _currentUser.IsAdmin && scope != "personal";
        var isManager = _currentUser.IsManagerOrAbove && scope != "personal";
        var userId = _currentUser.UserId;
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : (DateTime?)null;
        var query = _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && (o.OpportunityStage!.IsWon || o.OpportunityStage!.IsLost) && (isAdmin || o.OwnerId == userId || (isManager && o.Owner.ManagerId == userId)));

        if (startDate.HasValue) query = query.Where(o => (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) >= startDate.Value);
        if (end.HasValue)       query = query.Where(o => (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) <= end.Value);

        var closedOpps = await query
            .Select(o => new { Date = o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt, IsWon = o.OpportunityStage!.IsWon })
            .ToListAsync();

        var groupedByMonth = closedOpps
            .GroupBy(o => o.Date.ToString("yyyy-MM"))
            .Select(g => new
            {
                Month    = g.Key,
                Won      = g.Count(x => x.IsWon),
                Total    = g.Count(),
                WinRate  = g.Count() > 0 ? (double)g.Count(x => x.IsWon) / g.Count() * 100 : 0
            })
            .OrderBy(x => x.Month)
            .ToList();

        var overallWon   = closedOpps.Count(x => x.IsWon);
        var overallTotal = closedOpps.Count;
        var overallWinRate = overallTotal > 0 ? (double)overallWon / overallTotal * 100 : 0;

        return Ok(new { OverallWinRate = overallWinRate, ByMonth = groupedByMonth });
    }

    // ── 3. Time per Stage ─────────────────────────────────────────────────────
    [HttpGet("time-per-stage")]
    public async Task<IActionResult> GetTimePerStage(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var isAdmin = _currentUser.IsAdmin && scope != "personal";
        var isManager = _currentUser.IsManagerOrAbove && scope != "personal";
        var userId = _currentUser.UserId;
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : (DateTime?)null;
        var query = _db.StageHistories
            .Include(sh => sh.OldStage)
            .Include(sh => sh.NewStage)
            .Include(sh => sh.Opportunity)
            .Where(sh => !sh.Opportunity.Customer.IsDeleted && (isAdmin || sh.Opportunity.OwnerId == userId || (isManager && sh.Opportunity.Owner.ManagerId == userId)))
            .AsQueryable();

        if (startDate.HasValue) query = query.Where(sh => sh.ChangedAt >= startDate.Value);
        if (end.HasValue)       query = query.Where(sh => sh.ChangedAt <= end.Value);

        var allHistories = await query
            .OrderBy(sh => sh.OpportunityId)
            .ThenBy(sh => sh.ChangedAt)
            .ToListAsync();

        var stageDurations = new System.Collections.Generic.Dictionary<string, System.Collections.Generic.List<double>>();
        foreach (var group in allHistories.GroupBy(sh => sh.OpportunityId))
        {
            var oppHistories = group.ToList();
            for (int i = 0; i < oppHistories.Count; i++)
            {
                var current      = oppHistories[i];
                var oldStageName = current.OldStage?.Name;
                if (oldStageName == null) continue;
                var previous  = i > 0 ? oppHistories[i - 1] : null;
                var startTime = previous?.ChangedAt ?? current.Opportunity?.CreatedAt ?? current.ChangedAt;
                var duration  = (current.ChangedAt - startTime).TotalDays;
                if (!stageDurations.ContainsKey(oldStageName))
                    stageDurations[oldStageName] = new System.Collections.Generic.List<double>();
                stageDurations[oldStageName].Add(duration);
            }
        }

        var results = stageDurations.Select(kvp => new
        {
            Stage       = kvp.Key,
            AverageDays = kvp.Value.Any() ? kvp.Value.Average() : 0,
            Transitions = kvp.Value.Count
        }).ToList();

        return Ok(results);
    }

    // ── 4. Lead Source ────────────────────────────────────────────────────────
    [HttpGet("lead-source")]
    public async Task<IActionResult> GetLeadSourceBreakdown(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var isAdmin = _currentUser.IsAdmin && scope != "personal";
        var isManager = _currentUser.IsManagerOrAbove && scope != "personal";
        var userId = _currentUser.UserId;
        var query = _db.Leads
            .Include(l => l.Source)
            .Include(l => l.ConvertedCustomer)
            .ThenInclude(c => c!.Source)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep.ManagerId == userId)));

        if (startDate.HasValue)
        {
            var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : DateTime.UtcNow;
            query = query.Where(l => (l.CreatedAt >= startDate.Value && l.CreatedAt <= end) || (l.ConvertedAt.HasValue && l.ConvertedAt.Value >= startDate.Value && l.ConvertedAt.Value <= end));
        }

        var leadList = await query
            .Select(l => new
            {
                SourceName = l.Source != null ? l.Source.Name : (l.ConvertedCustomer != null && l.ConvertedCustomer.Source != null ? l.ConvertedCustomer.Source.Name : "Unknown")
            })
            .ToListAsync();

        var results = leadList
            .GroupBy(l => l.SourceName)
            .Select(g => new { Source = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToList();

        return Ok(results);
    }

    // ── 5. Overview (Dashboard KPIs for a date range) ─────────────────────────
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var isAdmin = _currentUser.IsAdmin && scope != "personal";
        var isManager = _currentUser.IsManagerOrAbove && scope != "personal";
        var userId = _currentUser.UserId;
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end   = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : DateTime.UtcNow;

        // All-time totals
        var totalCustomers = await _db.Customers.Where(c => !c.IsDeleted && (isAdmin || c.AssignedRepId == userId || (isManager && c.AssignedRep.ManagerId == userId))).CountAsync();
        var totalLeads     = await _db.Leads.Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep.ManagerId == userId))).CountAsync();

        // Period new additions
        var newCustomers = await _db.Customers
            .Where(c => !c.IsDeleted && c.CreatedAt >= start && c.CreatedAt <= end && (isAdmin || c.AssignedRepId == userId || (isManager && c.AssignedRep.ManagerId == userId)))
            .CountAsync();
        var newLeads = await _db.Leads
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && l.CreatedAt >= start && l.CreatedAt <= end && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep.ManagerId == userId)))
            .CountAsync();

        // Open deals (all-time)
        var openDeals = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)) && (isAdmin || o.OwnerId == userId || (isManager && o.Owner.ManagerId == userId)))
            .CountAsync();

        // Pipeline value (all open)
        var pipelineValue = (double)(await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)) && (isAdmin || o.OwnerId == userId || (isManager && o.Owner.ManagerId == userId)))
            .SumAsync(o => (decimal?)o.EstimatedValue) ?? 0m);

        // Revenue won in period
        var revenueInPeriod = (double)(await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && o.OpportunityStage.IsWon
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) >= start
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) <= end
                     && (isAdmin || o.OwnerId == userId || (isManager && o.Owner.ManagerId == userId)))
            .SumAsync(o => (decimal?)o.EstimatedValue) ?? 0m);

        // Conversion rate in period
        var leadsInPeriod = await _db.Leads
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && l.CreatedAt >= start && l.CreatedAt <= end && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep.ManagerId == userId)))
            .CountAsync();
        var convertedInPeriod = await _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null)
                     && l.CreatedAt >= start && l.CreatedAt <= end
                     && l.LeadStatus != null && l.LeadStatus.Name == "Converted"
                     && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep.ManagerId == userId)))
            .CountAsync();
        var conversionRate = leadsInPeriod > 0
            ? (double)convertedInPeriod / leadsInPeriod * 100
            : 0.0;

        return Ok(new
        {
            totalCustomers,
            newCustomers,
            totalLeads,
            newLeads,
            openDeals,
            pipelineValue,
            revenueInPeriod,
            conversionRate,
        });
    }

    // ── 6. Rep Performance ────────────────────────────────────────────────────
    [HttpGet("rep-performance")]
    public async Task<IActionResult> GetRepPerformance(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var isAdmin = _currentUser.IsAdmin && scope != "personal";
        var isManager = _currentUser.IsManagerOrAbove && scope != "personal";
        var userId = _currentUser.UserId;
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end   = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : DateTime.UtcNow;

        // Won opportunities per rep in period
        var wonOpps = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Include(o => o.Owner)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && o.OpportunityStage.IsWon
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) >= start
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) <= end
                     && (isAdmin || o.OwnerId == userId || (isManager && o.Owner.ManagerId == userId)))
            .Select(o => new { o.OwnerId, OwnerName = o.Owner.Name, o.EstimatedValue })
            .ToListAsync();

        // All opps (closed won+lost) per rep for win-rate
        var closedOpps = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Include(o => o.Owner)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && (o.OpportunityStage.IsWon || o.OpportunityStage.IsLost)
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) >= start
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) <= end
                     && (isAdmin || o.OwnerId == userId || (isManager && o.Owner.ManagerId == userId)))
            .Select(o => new { o.OwnerId, OwnerName = o.Owner.Name, IsWon = o.OpportunityStage!.IsWon })
            .ToListAsync();

        // Open pipeline per rep
        var openPipeline = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Include(o => o.Owner)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost))
                     && (isAdmin || o.OwnerId == userId || (isManager && o.Owner.ManagerId == userId)))
            .Select(o => new { o.OwnerId, OwnerName = o.Owner.Name, o.EstimatedValue })
            .ToListAsync();

        // Leads assigned per rep in period
        var leadsAssigned = await _db.Leads
            .Include(l => l.AssignedRep)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && l.AssignedRepId.HasValue
                     && l.CreatedAt >= start && l.CreatedAt <= end
                     && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep.ManagerId == userId)))
            .GroupBy(l => new { l.AssignedRepId, RepName = l.AssignedRep != null ? l.AssignedRep.Name : "Unknown" })
            .Select(g => new { RepId = g.Key.AssignedRepId, RepName = g.Key.RepName, Count = g.Count() })
            .ToListAsync();

        // Activities (calls, meetings, emails) logged per rep in period
        var activitiesLogged = await _db.Activities
            .Where(a => a.ActivityDate >= start && a.ActivityDate <= end
                     && (a.CustomerId == null || a.Customer != null)
                     && (a.LeadId == null || a.Lead != null)
                     && (a.OpportunityId == null || (a.Opportunity != null && (a.Opportunity.CustomerId == null || a.Opportunity.Customer != null)))
                     && (isAdmin || a.CreatedById == userId || (isManager && a.CreatedBy.ManagerId == userId)))
            .GroupBy(a => a.CreatedById)
            .Select(g => new { RepId = g.Key, Count = g.Count() })
            .ToListAsync();

        // Combine per-rep
        var allRepIds = wonOpps.Select(x => x.OwnerId)
            .Union(closedOpps.Select(x => x.OwnerId))
            .Union(openPipeline.Select(x => x.OwnerId))
            .Union(leadsAssigned.Where(x => x.RepId.HasValue).Select(x => x.RepId!.Value))
            .Union(activitiesLogged.Select(x => x.RepId))
            .Distinct();

        var results = allRepIds.Select(repId =>
        {
            var name        = wonOpps.FirstOrDefault(x => x.OwnerId == repId)?.OwnerName
                           ?? closedOpps.FirstOrDefault(x => x.OwnerId == repId)?.OwnerName
                           ?? openPipeline.FirstOrDefault(x => x.OwnerId == repId)?.OwnerName
                           ?? leadsAssigned.FirstOrDefault(x => x.RepId == repId)?.RepName
                           ?? "Unknown";
            var won         = wonOpps.Where(x => x.OwnerId == repId).Sum(x => (double)x.EstimatedValue);
            var dealsWon    = wonOpps.Count(x => x.OwnerId == repId);
            var closed      = closedOpps.Where(x => x.OwnerId == repId).ToList();
            var winRate     = closed.Count > 0 ? (double)closed.Count(x => x.IsWon) / closed.Count * 100 : 0;
            var pipeline    = openPipeline.Where(x => x.OwnerId == repId).Sum(x => (double)x.EstimatedValue);
            var leads       = leadsAssigned.FirstOrDefault(x => x.RepId == repId)?.Count ?? 0;
            var activities  = activitiesLogged.FirstOrDefault(x => x.RepId == repId)?.Count ?? 0;
            var avgTouch    = leads > 0 ? Math.Round((double)activities / leads, 1) : activities;
            return new { RepId = repId, RepName = name, DealsWon = dealsWon, RevenueWon = won, WinRate = winRate, OpenPipeline = pipeline, LeadsAssigned = leads, ActivitiesLogged = activities, AvgTouchpointsPerLead = avgTouch };
        })
        .OrderByDescending(x => x.ActivitiesLogged)
        .ToList();

        return Ok(results);
    }

    // ── 7. Lead Funnel ────────────────────────────────────────────────────────
    [HttpGet("funnel")]
    public async Task<IActionResult> GetLeadFunnel(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var isAdmin = _currentUser.IsAdmin && scope != "personal";
        var isManager = _currentUser.IsManagerOrAbove && scope != "personal";
        var userId = _currentUser.UserId;
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end   = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : DateTime.UtcNow;

        var leads = await _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && (l.CreatedAt >= start && l.CreatedAt <= end || (l.ConvertedAt.HasValue && l.ConvertedAt.Value >= start && l.ConvertedAt.Value <= end)) && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep.ManagerId == userId)))
            .Select(l => new { StatusName = l.LeadStatus != null ? l.LeadStatus.Name : "New", IsTerminal = l.LeadStatus != null && l.LeadStatus.IsTerminal })
            .ToListAsync();

        var pipelineLostCount = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && o.OpportunityStage.IsLost
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) >= start
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) <= end
                     && (isAdmin || o.OwnerId == userId || (isManager && o.Owner.ManagerId == userId)))
            .CountAsync();

        var total     = leads.Count;
        var converted = leads.Count(l => l.StatusName == "Converted");
        var leadLost  = leads.Count(l => l.IsTerminal && l.StatusName != "Converted");
        var lost      = leadLost + pipelineLostCount;
        var active    = leads.Count(l => !l.IsTerminal);
        var qualified = leads.Count(l => !l.IsTerminal && l.StatusName != "New");

        return Ok(new
        {
            total,
            active,
            qualified,
            converted,
            lost,
            leadLost,
            pipelineLost = pipelineLostCount
        });
    }

    // ── 8. Activity Summary ───────────────────────────────────────────────────
    [HttpGet("activity-summary")]
    public async Task<IActionResult> GetActivitySummary(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var isAdmin = _currentUser.IsAdmin && scope != "personal";
        var isManager = _currentUser.IsManagerOrAbove && scope != "personal";
        var userId = _currentUser.UserId;
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end   = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : DateTime.UtcNow;
        var now   = DateTime.UtcNow;

        // Activities logged in period
        var totalActivities = await _db.Activities
            .Where(a => a.ActivityDate >= start && a.ActivityDate <= end
                     && (a.CustomerId == null || a.Customer != null)
                     && (a.LeadId == null || (a.Lead != null && (a.Lead.ConvertedCustomerId == null || a.Lead.ConvertedCustomer != null)))
                     && (a.OpportunityId == null || (a.Opportunity != null && (a.Opportunity.CustomerId == null || a.Opportunity.Customer != null)))
                     && (isAdmin || a.CreatedById == userId || (isManager && a.CreatedBy.ManagerId == userId)))
            .CountAsync();

        // Activities by type in period
        var byType = await _db.Activities
            .Include(a => a.ActivityType)
            .Where(a => a.ActivityDate >= start && a.ActivityDate <= end
                     && (a.CustomerId == null || a.Customer != null)
                     && (a.LeadId == null || (a.Lead != null && (a.Lead.ConvertedCustomerId == null || a.Lead.ConvertedCustomer != null)))
                     && (a.OpportunityId == null || (a.Opportunity != null && (a.Opportunity.CustomerId == null || a.Opportunity.Customer != null)))
                     && (isAdmin || a.CreatedById == userId || (isManager && a.CreatedBy.ManagerId == userId)))
            .GroupBy(a => a.ActivityType != null ? a.ActivityType.Name : "Other")
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToListAsync();

        // Tasks (created or due in period)
        var allTasks = await _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Where(t => ((t.CreatedAt >= start && t.CreatedAt <= end) || (t.DueDate.HasValue && t.DueDate.Value >= start && t.DueDate.Value <= end))
                     && (t.CustomerId == null || t.Customer != null)
                     && (t.LeadId == null || (t.Lead != null && (t.Lead.ConvertedCustomerId == null || t.Lead.ConvertedCustomer != null)))
                     && (t.OpportunityId == null || (t.Opportunity != null && (t.Opportunity.CustomerId == null || t.Opportunity.Customer != null)))
                     && (isManager || t.AssignedToId == userId))
            .Select(t => new
            {
                IsComplete = t.CrmTaskStatus != null && t.CrmTaskStatus.IsTerminal,
                IsOverdue  = (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal)
                          && t.DueDate.HasValue && t.DueDate.Value < now,
            })
            .ToListAsync();

        var completedTasks = allTasks.Count(t => t.IsComplete);
        var pendingTasks   = allTasks.Count(t => !t.IsComplete);
        var overdueTasks   = allTasks.Count(t => t.IsOverdue);

        return Ok(new
        {
            totalActivities,
            byType,
            completedTasks,
            pendingTasks,
            overdueTasks,
        });
    }

    // ── 9. Lead Priority Breakdown ────────────────────────────────────────────
    [HttpGet("lead-priority")]
    public async Task<IActionResult> GetLeadPriorityBreakdown(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var isAdmin = _currentUser.IsAdmin && scope != "personal";
        var isManager = _currentUser.IsManagerOrAbove && scope != "personal";
        var userId = _currentUser.UserId;
        var query = _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep.ManagerId == userId)));

        if (startDate.HasValue)
        {
            var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : DateTime.UtcNow;
            query = query.Where(l => l.CreatedAt >= startDate.Value && l.CreatedAt <= end);
        }

        var leads = await query
            .Select(l => new
            {
                Priority = string.IsNullOrWhiteSpace(l.Priority) ? "Medium" : l.Priority,
                StatusName = l.LeadStatus != null ? l.LeadStatus.Name : "New",
                Score = l.LeadScore
            })
            .ToListAsync();

        var priorities = new[] { "Urgent", "High", "Medium", "Low" };
        var results = priorities.Select(p =>
        {
            var pLeads = leads.Where(l => l.Priority.Equals(p, StringComparison.OrdinalIgnoreCase)).ToList();
            var total = pLeads.Count;
            var converted = pLeads.Count(l => l.StatusName == "Converted");
            var lost = pLeads.Count(l => l.StatusName == "Lost");
            var active = total - converted - lost;
            var avgScore = total > 0 ? Math.Round(pLeads.Average(l => l.Score), 1) : 0;
            return new { Priority = p, Total = total, Active = active, Converted = converted, Lost = lost, AvgScore = avgScore };
        }).ToList();

        return Ok(results);
    }

    // ── 10. Follow-Up SLA & Health ────────────────────────────────────────────
    [HttpGet("followup-sla")]
    public async Task<IActionResult> GetFollowUpSlaHealth(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var isAdmin = _currentUser.IsAdmin && scope != "personal";
        var isManager = _currentUser.IsManagerOrAbove && scope != "personal";
        var userId = _currentUser.UserId;
        var now = DateTime.UtcNow;
        var today = now.Date;

        var query = _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && (l.LeadStatus == null || !l.LeadStatus.IsTerminal) && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep.ManagerId == userId)));

        if (startDate.HasValue)
        {
            var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : DateTime.UtcNow;
            query = query.Where(l => l.CreatedAt >= startDate.Value && l.CreatedAt <= end);
        }

        var activeLeads = await query
            .Select(l => new
            {
                l.LeadId,
                NextFollowUpDate = l.Tasks.Where(t => t.DueDate.HasValue && t.CrmTaskStatus != null && !t.CrmTaskStatus.IsTerminal && t.Title.StartsWith("Follow-up")).Min(t => t.DueDate),
                l.CreatedAt
            })
            .ToListAsync();

        var totalActive = activeLeads.Count;
        var scheduledCount = activeLeads.Count(l => l.NextFollowUpDate.HasValue && l.NextFollowUpDate.Value >= now);
        var dueTodayCount = activeLeads.Count(l => l.NextFollowUpDate.HasValue && l.NextFollowUpDate.Value.Date == today);
        var overdueCount = activeLeads.Count(l => l.NextFollowUpDate.HasValue && l.NextFollowUpDate.Value < now);
        var unscheduledCount = activeLeads.Count(l => !l.NextFollowUpDate.HasValue);

        double scheduledPercentage = totalActive > 0 ? Math.Round((double)(scheduledCount + dueTodayCount) / totalActive * 100, 1) : 0;

        return Ok(new
        {
            totalActive,
            scheduledCount,
            dueTodayCount,
            overdueCount,
            unscheduledCount,
            scheduledPercentage
        });
    }

    // ── 11. Invoice Revenue & Financial Report ─────────────────────────────────
    [HttpGet("invoices")]
    [HttpGet("invoice-revenue")]
    public async Task<IActionResult> GetInvoiceRevenueReport(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var now = DateTime.UtcNow;
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : (DateTime?)null;
        
        var query = _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.CreatedBy)
            .Where(i => !i.IsDeleted)
            .AsQueryable();

        if (startDate.HasValue) query = query.Where(i => i.CreatedAt >= startDate.Value || i.DueDate >= startDate.Value);
        if (end.HasValue)       query = query.Where(i => i.CreatedAt <= end.Value || i.DueDate <= end.Value);

        var invoices = await query.OrderByDescending(i => i.CreatedAt).ToListAsync();

        var totalCollected = invoices.Where(i => i.Status == "Paid").Sum(i => (double)i.TotalAmount);
        var totalPending = invoices.Where(i => i.Status != "Paid" && i.Status != "Cancelled").Sum(i => (double)i.TotalAmount);
        var totalCancelled = invoices.Where(i => i.Status == "Cancelled").Sum(i => (double)i.TotalAmount);
        var totalInvoiced = invoices.Sum(i => (double)i.TotalAmount);

        var paidCount = invoices.Count(i => i.Status == "Paid");
        var pendingCount = invoices.Count(i => i.Status != "Paid" && i.Status != "Cancelled");
        var overdueCount = invoices.Count(i => i.Status != "Paid" && i.Status != "Cancelled" && i.DueDate < now);

        var byMonth = invoices
            .GroupBy(i => i.CreatedAt.ToString("yyyy-MM"))
            .Select(g => new
            {
                month = g.Key,
                collected = g.Where(i => i.Status == "Paid").Sum(i => (double)i.TotalAmount),
                pending = g.Where(i => i.Status != "Paid" && i.Status != "Cancelled").Sum(i => (double)i.TotalAmount),
                count = g.Count()
            })
            .OrderBy(x => x.month)
            .ToList();

        var monthlyInflow = byMonth.Select(m => new
        {
            month = m.month,
            inflow = m.collected,
            pending = m.pending,
            total = m.collected + m.pending
        }).ToList();

        var byStatus = invoices
            .GroupBy(i => string.IsNullOrWhiteSpace(i.Status) ? "Draft" : i.Status)
            .Select(g => new { status = g.Key, count = g.Count(), value = g.Sum(i => (double)i.TotalAmount) })
            .ToList();

        var items = invoices.Select(i => new
        {
            invoiceId = i.InvoiceId,
            invoiceNumber = i.InvoiceNumber ?? $"INV-{i.InvoiceId:D5}",
            customerName = i.Customer != null ? $"{i.Customer.FirstName} {i.Customer.LastName}" : "Unknown Customer",
            customerId = i.CustomerId,
            totalAmount = (double)i.TotalAmount,
            status = i.Status ?? "Draft",
            dueDate = i.DueDate,
            createdAt = i.CreatedAt,
            isOverdue = i.Status != "Paid" && i.Status != "Cancelled" && i.DueDate < now
        }).ToList();

        return Ok(new
        {
            totalInvoiced,
            totalCollected,
            totalPending,
            totalCancelled,
            paidCount,
            pendingCount,
            overdueCount,
            byMonth,
            monthlyInflow,
            byStatus,
            items
        });
    }

    // ── 12. Contract Analytics Report ──────────────────────────────────────────
    [HttpGet("contracts")]
    public async Task<IActionResult> GetContractsReport(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] int? repId = null)
    {
        var now = DateTime.UtcNow;
        var in30Days = now.AddDays(30);
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : (DateTime?)null;

        var query = _db.Contracts
            .Include(c => c.Customer)
                .ThenInclude(cust => cust.AssignedRep)
            .Include(c => c.Opportunity)
                .ThenInclude(opp => opp.Owner)
            .Include(c => c.CreatedBy)
            .Where(c => !c.IsDeleted)
            .AsQueryable();

        if (_currentUser.UserId == null)
        {
            return Unauthorized();
        }

        var userId = _currentUser.UserId.Value;

        // Role-based visibility for reports:
        if (!_currentUser.IsAdmin)
        {
            if (_currentUser.IsManagerOrAbove)
            {
                if (scope == "personal")
                {
                    query = query.Where(c =>
                        c.CreatedById == userId ||
                        (c.Customer != null && c.Customer.AssignedRepId == userId) ||
                        (c.Opportunity != null && c.Opportunity.OwnerId == userId)
                    );
                }
                else if (repId.HasValue && repId.Value > 0)
                {
                    // Manager filtering by a specific managed rep
                    query = query.Where(c =>
                        ((c.Customer != null && c.Customer.AssignedRepId == repId.Value) ||
                         (c.Opportunity != null && c.Opportunity.OwnerId == repId.Value) ||
                         (c.CreatedById == repId.Value)) &&
                        ((c.Customer != null && (c.Customer.AssignedRepId == userId || (c.Customer.AssignedRep != null && c.Customer.AssignedRep.ManagerId == userId))) ||
                         (c.Opportunity != null && (c.Opportunity.OwnerId == userId || (c.Opportunity.Owner != null && c.Opportunity.Owner.ManagerId == userId))) ||
                         (c.CreatedById == userId))
                    );
                }
                else
                {
                    // Manager team view: their own records + their managed reps' records
                    query = query.Where(c =>
                        c.CreatedById == userId ||
                        (c.Customer != null && (c.Customer.AssignedRepId == userId || (c.Customer.AssignedRep != null && c.Customer.AssignedRep.ManagerId == userId))) ||
                        (c.Opportunity != null && (c.Opportunity.OwnerId == userId || (c.Opportunity.Owner != null && c.Opportunity.Owner.ManagerId == userId)))
                    );
                }
            }
            else
            {
                // SalesRep / Regular user: ONLY see their own contracts in report metrics
                query = query.Where(c =>
                    c.CreatedById == userId ||
                    (c.Customer != null && c.Customer.AssignedRepId == userId) ||
                    (c.Opportunity != null && c.Opportunity.OwnerId == userId)
                );
            }
        }
        else
        {
            // Admin: can toggle scope == "personal" or filter by repId or view all company
            if (scope == "personal")
            {
                query = query.Where(c =>
                    c.CreatedById == userId ||
                    (c.Customer != null && c.Customer.AssignedRepId == userId) ||
                    (c.Opportunity != null && c.Opportunity.OwnerId == userId)
                );
            }
            else if (repId.HasValue && repId.Value > 0)
            {
                query = query.Where(c =>
                    (c.Customer != null && c.Customer.AssignedRepId == repId.Value) ||
                    (c.Opportunity != null && c.Opportunity.OwnerId == repId.Value) ||
                    (c.CreatedById == repId.Value)
                );
            }
        }

        if (startDate.HasValue) query = query.Where(c => c.CreatedAt >= startDate.Value || c.StartDate >= startDate.Value);
        if (end.HasValue)       query = query.Where(c => c.CreatedAt <= end.Value || c.EndDate <= end.Value);

        var contracts = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();

        var enriched = contracts.Select(c =>
        {
            bool hasCompany = !string.IsNullOrEmpty(c.CompanySignatureDataUrl) || c.CompanySignedAt != null;
            bool hasCustomer = !string.IsNullOrEmpty(c.CustomerSignatureDataUrl) || !string.IsNullOrEmpty(c.SignatureDataUrl) || c.CustomerSignedAt != null || c.SignedAt != null;
            bool isSigned = c.Status == "Signed" || c.Status == "Active" || (hasCompany && hasCustomer);

            string displayStatus;
            string category;

            if (c.Status == "Cancelled" || c.Status == "Terminated")
            {
                displayStatus = "Cancelled";
                category = "Cancelled";
            }
            else if (c.Status == "Expired" || (c.EndDate < now && !isSigned))
            {
                displayStatus = "Expired";
                category = "Expired";
            }
            else if (isSigned)
            {
                displayStatus = c.Status == "Active" ? "Active" : "Signed & Executed";
                category = "Signed";
            }
            else if (c.Status == "PendingCustomer" || (hasCompany && !hasCustomer))
            {
                displayStatus = "Partially Signed (Pending Client)";
                category = "PartiallySigned";
            }
            else if (c.Status == "PendingSeller" || (!hasCompany && hasCustomer))
            {
                displayStatus = "Partially Signed (Pending Company)";
                category = "PartiallySigned";
            }
            else if (c.Status == "SentForSignature" || c.Status == "Pending" || c.Status == "Awaiting" || c.Status == "Pending Signature")
            {
                displayStatus = "Pending Signature";
                category = "PendingSignature";
            }
            else
            {
                displayStatus = "Draft";
                category = "Draft";
            }

            string signatureProgress = (hasCompany && hasCustomer) ? "2/2 Signed" : (hasCompany || hasCustomer) ? "1/2 Partially Signed" : "0/2 Awaiting Signatures";
            string ownerName = c.Customer?.AssignedRep?.Name ?? c.CreatedBy?.Name ?? "Unassigned";

            return new
            {
                contract = c,
                hasCompany,
                hasCustomer,
                isSigned,
                displayStatus,
                category,
                signatureProgress,
                ownerName
            };
        }).ToList();

        var totalCount = enriched.Count;
        var signedCount = enriched.Count(x => x.category == "Signed");
        var partiallySignedCount = enriched.Count(x => x.category == "PartiallySigned");
        var pendingSignatureCount = enriched.Count(x => x.category == "PendingSignature");
        var pendingExecutionCount = partiallySignedCount + pendingSignatureCount;
        var draftCount = enriched.Count(x => x.category == "Draft");
        var expiringCount = enriched.Count(x => x.contract.EndDate >= now && x.contract.EndDate <= in30Days && x.category != "Cancelled");

        var totalContractValue = enriched.Sum(x => (double)x.contract.ContractValue);
        var activeValue = enriched.Where(x => x.category == "Signed").Sum(x => (double)x.contract.ContractValue);
        var partiallySignedValue = enriched.Where(x => x.category == "PartiallySigned").Sum(x => (double)x.contract.ContractValue);
        var pendingSignatureValue = enriched.Where(x => x.category == "PendingSignature").Sum(x => (double)x.contract.ContractValue);
        var pendingExecutionValue = partiallySignedValue + pendingSignatureValue;
        var draftValue = enriched.Where(x => x.category == "Draft").Sum(x => (double)x.contract.ContractValue);

        var signingRate = totalCount > 0 ? Math.Round((double)signedCount / totalCount * 100, 1) : 0.0;

        var byStatus = enriched
            .GroupBy(x => x.displayStatus)
            .Select(g => new { status = g.Key, count = g.Count(), value = g.Sum(x => (double)x.contract.ContractValue) })
            .OrderByDescending(g => g.value)
            .ToList();

        var byMonth = enriched
            .GroupBy(x => x.contract.CreatedAt.ToString("yyyy-MM"))
            .Select(g => new
            {
                month = g.Key,
                count = g.Count(),
                value = g.Sum(x => (double)x.contract.ContractValue)
            })
            .OrderBy(x => x.month)
            .ToList();

        var byRep = enriched
            .GroupBy(x => x.ownerName)
            .Select(g => new
            {
                repName = g.Key,
                totalContracts = g.Count(),
                totalValue = g.Sum(x => (double)x.contract.ContractValue),
                signedContracts = g.Count(x => x.category == "Signed"),
                activeValue = g.Where(x => x.category == "Signed").Sum(x => (double)x.contract.ContractValue),
                pendingContracts = g.Count(x => x.category == "PartiallySigned" || x.category == "PendingSignature"),
                pendingValue = g.Where(x => x.category == "PartiallySigned" || x.category == "PendingSignature").Sum(x => (double)x.contract.ContractValue)
            })
            .OrderByDescending(g => g.totalValue)
            .ToList();

        var items = enriched.Select(x => new
        {
            contractId = x.contract.ContractId,
            title = x.contract.Title,
            contractNumber = x.contract.ContractNumber ?? $"CTR-{x.contract.ContractId:D5}",
            customerName = x.contract.Customer != null ? $"{x.contract.Customer.FirstName} {x.contract.Customer.LastName}" : "Unknown Customer",
            customerId = x.contract.CustomerId,
            ownerName = x.ownerName,
            createdByName = x.contract.CreatedBy?.Name ?? "Admin",
            contractValue = (double)x.contract.ContractValue,
            status = x.displayStatus,
            rawStatus = x.contract.Status,
            category = x.category,
            hasCompanySignature = x.hasCompany,
            hasCustomerSignature = x.hasCustomer,
            signatureProgress = x.signatureProgress,
            startDate = x.contract.StartDate,
            endDate = x.contract.EndDate,
            createdAt = x.contract.CreatedAt
        }).ToList();

        return Ok(new
        {
            totalCount,
            signedContracts = signedCount,
            activeCount = signedCount,
            partiallySignedCount,
            pendingSignatureCount,
            pendingContracts = pendingExecutionCount,
            draftCount,
            expiringCount,
            totalContractValue,
            totalValue = totalContractValue,
            activeValue,
            partiallySignedValue,
            pendingSignatureValue,
            pendingValue = pendingExecutionValue,
            draftValue,
            signingRate,
            byStatus,
            byMonth,
            byRep,
            items
        });
    }

    // ── 14. Tasks & Execution Activity Report ───────────────────────────────────
    [HttpGet("tasks")]
    public async Task<IActionResult> GetTaskReports(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] int? assigneeId = null)
    {
        var now = DateTime.UtcNow;
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : (DateTime?)null;

        var query = _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Include(t => t.Customer)
            .Include(t => t.Opportunity)
            .Include(t => t.Lead)
            .Include(t => t.Activity)
                .ThenInclude(a => a.ActivityType)
            .Include(t => t.AssignedTo)
            .Include(t => t.CreatedBy)
            .AsQueryable();

        if (assigneeId.HasValue && assigneeId.Value > 0)
        {
            query = query.Where(t => t.AssignedToId == assigneeId.Value || (t.CreatedById == assigneeId.Value && t.AssignedToId == null));
        }

        // Date filter
        if (startDate.HasValue)
        {
            query = query.Where(t => t.CreatedAt >= startDate.Value || (t.DueDate.HasValue && t.DueDate.Value >= startDate.Value));
        }
        if (end.HasValue)
        {
            query = query.Where(t => t.CreatedAt <= end.Value || (t.DueDate.HasValue && t.DueDate.Value <= end.Value));
        }

        var allTasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

        var total = allTasks.Count;
        var completed = allTasks.Count(t => t.CrmTaskStatus != null && t.CrmTaskStatus.IsTerminal);
        var overdue = allTasks.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate.HasValue && t.DueDate.Value < now);
        var pending = allTasks.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && (!t.DueDate.HasValue || t.DueDate.Value >= now));
        var dueToday = allTasks.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate.HasValue && t.DueDate.Value.Date == now.Date);

        var completionRate = total > 0 ? Math.Round((double)completed / total * 100, 1) : 0;

        // Group by Status
        var byStatus = allTasks
            .GroupBy(t => t.CrmTaskStatus?.Name ?? "Pending")
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToList();

        // Group by Activity Channel / Type
        var byType = allTasks
            .GroupBy(t => t.Activity?.ActivityType?.Name ?? (t.Title.ToLower().Contains("call") ? "Call" : t.Title.ToLower().Contains("email") ? "Email" : t.Title.ToLower().Contains("meeting") ? "Meeting" : "General"))
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToList();

        // Group by Assignee
        var byAssignee = allTasks
            .GroupBy(t => t.AssignedTo?.Name ?? "Unassigned")
            .Select(g => new
            {
                Assignee = g.Key,
                Total = g.Count(),
                Completed = g.Count(t => t.CrmTaskStatus != null && t.CrmTaskStatus.IsTerminal),
                Overdue = g.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate.HasValue && t.DueDate.Value < now)
            })
            .OrderByDescending(g => g.Total)
            .ToList();

        // Mapped Task Ledger Items
        var items = allTasks.Select(t => new
        {
            crmTaskId = t.CrmTaskId,
            title = t.Title,
            description = t.Description,
            dueDate = t.DueDate,
            createdAt = t.CreatedAt,
            statusName = t.CrmTaskStatus?.Name ?? (t.DueDate.HasValue && t.DueDate.Value < now ? "Overdue" : "Pending"),
            isTerminal = t.CrmTaskStatus?.IsTerminal ?? false,
            isOverdue = (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate.HasValue && t.DueDate.Value < now,
            activityTypeName = t.Activity?.ActivityType?.Name ?? "Task",
            activitySubject = t.Activity?.Subject,
            assignedToName = t.AssignedTo?.Name ?? "Unassigned",
            customerName = t.Customer != null ? $"{t.Customer.FirstName} {t.Customer.LastName}" : null,
            customerId = t.CustomerId,
            opportunityTitle = t.Opportunity?.Title,
            opportunityId = t.OpportunityId,
            leadName = t.Lead != null ? $"{t.Lead.FirstName} {t.Lead.LastName}" : null,
            leadId = t.LeadId
        }).ToList();

        return Ok(new
        {
            total,
            completed,
            pending,
            overdue,
            dueToday,
            completionRate,
            byStatus,
            byType,
            byAssignee,
            items
        });
    }
}
