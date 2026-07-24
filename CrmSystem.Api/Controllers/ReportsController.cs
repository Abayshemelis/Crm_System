using System;
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
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db)
    {
        _db = db;
    }

    // ── 1. Pipeline by Stage ──────────────────────────────────────────────────
    [HttpGet("pipeline-by-stage")]
    public async Task<IActionResult> GetPipelineByStage(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var query = _db.Opportunities.Include(o => o.OpportunityStage).Where(o => true);
        if (startDate.HasValue) query = query.Where(o => o.CreatedAt >= startDate.Value);
        if (endDate.HasValue)   query = query.Where(o => o.CreatedAt <= endDate.Value);

        var results = await query
            .GroupBy(o => new { o.OpportunityStageId, StageName = o.OpportunityStage != null ? o.OpportunityStage.Name : "No Stage" })
            .Select(g => new { Stage = g.Key.StageName, Value = g.Sum(o => o.EstimatedValue), Count = g.Count() })
            .ToListAsync();

        return Ok(results);
    }

    // ── 2. Win Rate ───────────────────────────────────────────────────────────
    [HttpGet("win-rate")]
    public async Task<IActionResult> GetWinRate(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var query = _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => o.OpportunityStage != null && (o.OpportunityStage!.IsWon || o.OpportunityStage!.IsLost));

        if (startDate.HasValue) query = query.Where(o => (o.ActualCloseDate ?? o.CreatedAt) >= startDate.Value);
        if (endDate.HasValue)   query = query.Where(o => (o.ActualCloseDate ?? o.CreatedAt) <= endDate.Value);

        var closedOpps = await query
            .Select(o => new { Date = o.ActualCloseDate ?? o.CreatedAt, IsWon = o.OpportunityStage!.IsWon })
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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var query = _db.StageHistories
            .Include(sh => sh.OldStage)
            .Include(sh => sh.NewStage)
            .Include(sh => sh.Opportunity)
            .AsQueryable();

        if (startDate.HasValue) query = query.Where(sh => sh.ChangedAt >= startDate.Value);
        if (endDate.HasValue)   query = query.Where(sh => sh.ChangedAt <= endDate.Value);

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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var query = _db.Leads.Include(l => l.Source).Where(l => !l.IsDeleted);
        if (startDate.HasValue) query = query.Where(l => l.CreatedAt >= startDate.Value);
        if (endDate.HasValue)   query = query.Where(l => l.CreatedAt <= endDate.Value);

        var results = await query
            .GroupBy(l => new { l.SourceId, SourceName = l.Source != null ? l.Source.Name : "Unknown" })
            .Select(g => new { Source = g.Key.SourceName, Count = g.Count() })
            .ToListAsync();

        return Ok(results);
    }

    // ── 5. Overview (Dashboard KPIs for a date range) ─────────────────────────
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end   = endDate   ?? DateTime.UtcNow;

        // All-time totals
        var totalCustomers = await _db.Customers.Where(c => !c.IsDeleted).CountAsync();
        var totalLeads     = await _db.Leads.Where(l => !l.IsDeleted).CountAsync();

        // Period new additions
        var newCustomers = await _db.Customers
            .Where(c => !c.IsDeleted && c.CreatedAt >= start && c.CreatedAt <= end)
            .CountAsync();
        var newLeads = await _db.Leads
            .Where(l => !l.IsDeleted && l.CreatedAt >= start && l.CreatedAt <= end)
            .CountAsync();

        // Open deals (all-time)
        var openDeals = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost))
            .CountAsync();

        // Pipeline value (all open)
        var pipelineValue = (double)(await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost))
            .SumAsync(o => (decimal?)o.EstimatedValue) ?? 0m);

        // Revenue won in period
        var revenueInPeriod = (double)(await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => o.OpportunityStage != null && o.OpportunityStage.IsWon
                     && (o.ActualCloseDate ?? o.CreatedAt) >= start
                     && (o.ActualCloseDate ?? o.CreatedAt) <= end)
            .SumAsync(o => (decimal?)o.EstimatedValue) ?? 0m);

        // Conversion rate in period
        var leadsInPeriod = await _db.Leads
            .Where(l => !l.IsDeleted && l.CreatedAt >= start && l.CreatedAt <= end)
            .CountAsync();
        var convertedInPeriod = await _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => !l.IsDeleted
                     && l.CreatedAt >= start && l.CreatedAt <= end
                     && l.LeadStatus != null && l.LeadStatus.Name == "Converted")
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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end   = endDate   ?? DateTime.UtcNow;

        // Won opportunities per rep in period
        var wonOpps = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Include(o => o.Owner)
            .Where(o => o.OpportunityStage != null && o.OpportunityStage.IsWon
                     && (o.ActualCloseDate ?? o.CreatedAt) >= start
                     && (o.ActualCloseDate ?? o.CreatedAt) <= end)
            .Select(o => new { o.OwnerId, OwnerName = o.Owner.Name, o.EstimatedValue })
            .ToListAsync();

        // All opps (closed won+lost) per rep for win-rate
        var closedOpps = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Include(o => o.Owner)
            .Where(o => o.OpportunityStage != null && (o.OpportunityStage.IsWon || o.OpportunityStage.IsLost)
                     && (o.ActualCloseDate ?? o.CreatedAt) >= start
                     && (o.ActualCloseDate ?? o.CreatedAt) <= end)
            .Select(o => new { o.OwnerId, OwnerName = o.Owner.Name, IsWon = o.OpportunityStage!.IsWon })
            .ToListAsync();

        // Open pipeline per rep
        var openPipeline = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Include(o => o.Owner)
            .Where(o => o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost))
            .Select(o => new { o.OwnerId, OwnerName = o.Owner.Name, o.EstimatedValue })
            .ToListAsync();

        // Leads assigned per rep in period
        var leadsAssigned = await _db.Leads
            .Include(l => l.AssignedRep)
            .Where(l => !l.IsDeleted && l.AssignedRepId.HasValue
                     && l.CreatedAt >= start && l.CreatedAt <= end)
            .GroupBy(l => new { l.AssignedRepId, RepName = l.AssignedRep != null ? l.AssignedRep.Name : "Unknown" })
            .Select(g => new { RepId = g.Key.AssignedRepId, RepName = g.Key.RepName, Count = g.Count() })
            .ToListAsync();

        // Combine per-rep
        var allRepIds = wonOpps.Select(x => x.OwnerId)
            .Union(closedOpps.Select(x => x.OwnerId))
            .Union(openPipeline.Select(x => x.OwnerId))
            .Distinct();

        var results = allRepIds.Select(repId =>
        {
            var name        = wonOpps.FirstOrDefault(x => x.OwnerId == repId)?.OwnerName
                           ?? closedOpps.FirstOrDefault(x => x.OwnerId == repId)?.OwnerName
                           ?? openPipeline.FirstOrDefault(x => x.OwnerId == repId)?.OwnerName
                           ?? "Unknown";
            var won         = wonOpps.Where(x => x.OwnerId == repId).Sum(x => (double)x.EstimatedValue);
            var dealsWon    = wonOpps.Count(x => x.OwnerId == repId);
            var closed      = closedOpps.Where(x => x.OwnerId == repId).ToList();
            var winRate     = closed.Count > 0 ? (double)closed.Count(x => x.IsWon) / closed.Count * 100 : 0;
            var pipeline    = openPipeline.Where(x => x.OwnerId == repId).Sum(x => (double)x.EstimatedValue);
            var leads       = leadsAssigned.FirstOrDefault(x => x.RepId == repId)?.Count ?? 0;
            return new { RepId = repId, RepName = name, DealsWon = dealsWon, RevenueWon = won, WinRate = winRate, OpenPipeline = pipeline, LeadsAssigned = leads };
        })
        .OrderByDescending(x => x.RevenueWon)
        .ToList();

        return Ok(results);
    }

    // ── 7. Lead Funnel ────────────────────────────────────────────────────────
    [HttpGet("funnel")]
    public async Task<IActionResult> GetLeadFunnel(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end   = endDate   ?? DateTime.UtcNow;

        var leads = await _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => !l.IsDeleted && l.CreatedAt >= start && l.CreatedAt <= end)
            .Select(l => new { StatusName = l.LeadStatus != null ? l.LeadStatus.Name : "New", IsTerminal = l.LeadStatus != null && l.LeadStatus.IsTerminal })
            .ToListAsync();

        var total     = leads.Count;
        var converted = leads.Count(l => l.StatusName == "Converted");
        var lost      = leads.Count(l => l.IsTerminal && l.StatusName != "Converted");
        var active    = leads.Count(l => !l.IsTerminal);
        var qualified = leads.Count(l => !l.IsTerminal && l.StatusName != "New");

        return Ok(new
        {
            total,
            active,
            qualified,
            converted,
            lost,
        });
    }

    // ── 8. Activity Summary ───────────────────────────────────────────────────
    [HttpGet("activity-summary")]
    public async Task<IActionResult> GetActivitySummary(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end   = endDate   ?? DateTime.UtcNow;
        var now   = DateTime.UtcNow;

        // Activities logged in period
        var totalActivities = await _db.Activities
            .Where(a => a.ActivityDate >= start && a.ActivityDate <= end)
            .CountAsync();

        // Activities by type in period
        var byType = await _db.Activities
            .Include(a => a.ActivityType)
            .Where(a => a.ActivityDate >= start && a.ActivityDate <= end)
            .GroupBy(a => a.ActivityType != null ? a.ActivityType.Name : "Other")
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToListAsync();

        // Tasks
        var allTasks = await _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Where(t => t.CreatedAt >= start && t.CreatedAt <= end)
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
}
