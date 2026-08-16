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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : (DateTime?)null;
        var query = _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)) && (isManager || o.OwnerId == userId));
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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : (DateTime?)null;
        var query = _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && (o.OpportunityStage!.IsWon || o.OpportunityStage!.IsLost) && (isManager || o.OwnerId == userId));

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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : (DateTime?)null;
        var query = _db.StageHistories
            .Include(sh => sh.OldStage)
            .Include(sh => sh.NewStage)
            .Include(sh => sh.Opportunity)
            .Where(sh => !sh.Opportunity.Customer.IsDeleted && (isManager || sh.Opportunity.OwnerId == userId))
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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;
        var query = _db.Leads
            .Include(l => l.Source)
            .Include(l => l.ConvertedCustomer)
            .ThenInclude(c => c!.Source)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && (isManager || l.AssignedRepId == userId));

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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end   = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : DateTime.UtcNow;

        // All-time totals
        var totalCustomers = await _db.Customers.Where(c => !c.IsDeleted && (isManager || c.AssignedRepId == userId)).CountAsync();
        var totalLeads     = await _db.Leads.Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && (isManager || l.AssignedRepId == userId)).CountAsync();

        // Period new additions
        var newCustomers = await _db.Customers
            .Where(c => !c.IsDeleted && c.CreatedAt >= start && c.CreatedAt <= end && (isManager || c.AssignedRepId == userId))
            .CountAsync();
        var newLeads = await _db.Leads
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && l.CreatedAt >= start && l.CreatedAt <= end && (isManager || l.AssignedRepId == userId))
            .CountAsync();

        // Open deals (all-time)
        var openDeals = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)) && (isManager || o.OwnerId == userId))
            .CountAsync();

        // Pipeline value (all open)
        var pipelineValue = (double)(await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)) && (isManager || o.OwnerId == userId))
            .SumAsync(o => (decimal?)o.EstimatedValue) ?? 0m);

        // Revenue won in period
        var revenueInPeriod = (double)(await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && o.OpportunityStage.IsWon
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) >= start
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) <= end
                     && (isManager || o.OwnerId == userId))
            .SumAsync(o => (decimal?)o.EstimatedValue) ?? 0m);

        // Conversion rate in period
        var leadsInPeriod = await _db.Leads
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && l.CreatedAt >= start && l.CreatedAt <= end && (isManager || l.AssignedRepId == userId))
            .CountAsync();
        var convertedInPeriod = await _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null)
                     && l.CreatedAt >= start && l.CreatedAt <= end
                     && l.LeadStatus != null && l.LeadStatus.Name == "Converted"
                     && (isManager || l.AssignedRepId == userId))
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
        var isManager = _currentUser.IsManagerOrAbove;
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
                     && (isManager || o.OwnerId == userId))
            .Select(o => new { o.OwnerId, OwnerName = o.Owner.Name, o.EstimatedValue })
            .ToListAsync();

        // All opps (closed won+lost) per rep for win-rate
        var closedOpps = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Include(o => o.Owner)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && (o.OpportunityStage.IsWon || o.OpportunityStage.IsLost)
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) >= start
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) <= end
                     && (isManager || o.OwnerId == userId))
            .Select(o => new { o.OwnerId, OwnerName = o.Owner.Name, IsWon = o.OpportunityStage!.IsWon })
            .ToListAsync();

        // Open pipeline per rep
        var openPipeline = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Include(o => o.Owner)
            .Where(o => !o.Customer.IsDeleted && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost))
                     && (isManager || o.OwnerId == userId))
            .Select(o => new { o.OwnerId, OwnerName = o.Owner.Name, o.EstimatedValue })
            .ToListAsync();

        // Leads assigned per rep in period
        var leadsAssigned = await _db.Leads
            .Include(l => l.AssignedRep)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && l.AssignedRepId.HasValue
                     && l.CreatedAt >= start && l.CreatedAt <= end
                     && (isManager || l.AssignedRepId == userId))
            .GroupBy(l => new { l.AssignedRepId, RepName = l.AssignedRep != null ? l.AssignedRep.Name : "Unknown" })
            .Select(g => new { RepId = g.Key.AssignedRepId, RepName = g.Key.RepName, Count = g.Count() })
            .ToListAsync();

        // Activities (calls, meetings, emails) logged per rep in period
        var activitiesLogged = await _db.Activities
            .Where(a => a.ActivityDate >= start && a.ActivityDate <= end
                     && (a.CustomerId == null || a.Customer != null)
                     && (a.LeadId == null || a.Lead != null)
                     && (a.OpportunityId == null || (a.Opportunity != null && (a.Opportunity.CustomerId == null || a.Opportunity.Customer != null)))
                     && (isManager || a.CreatedById == userId))
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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end   = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : DateTime.UtcNow;

        var leads = await _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && (l.CreatedAt >= start && l.CreatedAt <= end || (l.ConvertedAt.HasValue && l.ConvertedAt.Value >= start && l.ConvertedAt.Value <= end)) && (isManager || l.AssignedRepId == userId))
            .Select(l => new { StatusName = l.LeadStatus != null ? l.LeadStatus.Name : "New", IsTerminal = l.LeadStatus != null && l.LeadStatus.IsTerminal })
            .ToListAsync();

        var pipelineLostCount = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => !o.Customer.IsDeleted && o.OpportunityStage != null && o.OpportunityStage.IsLost
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) >= start
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) <= end
                     && (isManager || o.OwnerId == userId))
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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
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
                     && (isManager || a.CreatedById == userId))
            .CountAsync();

        // Activities by type in period
        var byType = await _db.Activities
            .Include(a => a.ActivityType)
            .Where(a => a.ActivityDate >= start && a.ActivityDate <= end
                     && (a.CustomerId == null || a.Customer != null)
                     && (a.LeadId == null || (a.Lead != null && (a.Lead.ConvertedCustomerId == null || a.Lead.ConvertedCustomer != null)))
                     && (a.OpportunityId == null || (a.Opportunity != null && (a.Opportunity.CustomerId == null || a.Opportunity.Customer != null)))
                     && (isManager || a.CreatedById == userId))
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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;
        var query = _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && (isManager || l.AssignedRepId == userId));

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
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;
        var now = DateTime.UtcNow;
        var today = now.Date;

        var query = _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && (l.LeadStatus == null || !l.LeadStatus.IsTerminal) && (isManager || l.AssignedRepId == userId));

        if (startDate.HasValue)
        {
            var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : DateTime.UtcNow;
            query = query.Where(l => l.CreatedAt >= startDate.Value && l.CreatedAt <= end);
        }

        var activeLeads = await query
            .Select(l => new
            {
                l.LeadId,
                l.NextFollowUpDate,
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
    [HttpGet("invoice-revenue")]
    public async Task<IActionResult> GetInvoiceRevenueReport(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : (DateTime?)null;
        var query = _db.Invoices
            .Include(i => i.Customer)
            .Where(i => !i.IsDeleted && !i.Customer.IsDeleted && (isManager || i.CreatedById == userId || i.Customer.AssignedRepId == userId));

        if (startDate.HasValue) query = query.Where(i => i.CreatedAt >= startDate.Value);
        if (end.HasValue)       query = query.Where(i => i.CreatedAt <= end.Value);

        var invoices = await query.ToListAsync();

        var totalCollected = invoices.Where(i => i.Status == "Paid").Sum(i => (double)i.TotalAmount);
        var totalPending = invoices.Where(i => i.Status != "Paid" && i.Status != "Cancelled").Sum(i => (double)i.TotalAmount);
        var totalCancelled = invoices.Where(i => i.Status == "Cancelled").Sum(i => (double)i.TotalAmount);
        var totalInvoiced = invoices.Sum(i => (double)i.TotalAmount);

        var paidCount = invoices.Count(i => i.Status == "Paid");
        var pendingCount = invoices.Count(i => i.Status != "Paid" && i.Status != "Cancelled");

        var byMonth = invoices
            .GroupBy(i => i.CreatedAt.ToString("yyyy-MM"))
            .Select(g => new
            {
                Month = g.Key,
                Collected = g.Where(i => i.Status == "Paid").Sum(i => (double)i.TotalAmount),
                Pending = g.Where(i => i.Status != "Paid" && i.Status != "Cancelled").Sum(i => (double)i.TotalAmount),
                Count = g.Count()
            })
            .OrderBy(x => x.Month)
            .ToList();

        return Ok(new
        {
            totalCollected,
            totalPending,
            totalCancelled,
            totalInvoiced,
            paidCount,
            pendingCount,
            byMonth
        });
    }

    // ── 12. Contract Analytics Report ──────────────────────────────────────────
    [HttpGet("contracts")]
    public async Task<IActionResult> GetContractsReport(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : (DateTime?)null;
        var query = _db.Contracts
            .Include(c => c.Customer)
            .Where(c => !c.IsDeleted && !c.Customer.IsDeleted && (isManager || c.CreatedById == userId || c.Customer.AssignedRepId == userId));

        if (startDate.HasValue) query = query.Where(c => c.CreatedAt >= startDate.Value);
        if (end.HasValue)       query = query.Where(c => c.CreatedAt <= end.Value);

        var contracts = await query.ToListAsync();
        var now = DateTime.UtcNow;
        var in30Days = now.AddDays(30);

        var totalCount = contracts.Count;
        var activeCount = contracts.Count(c => c.Status == "Active" || c.Status == "Signed");
        var draftCount = contracts.Count(c => c.Status == "Draft" || c.Status == "SentForSignature");
        var expiringCount = contracts.Count(c => c.EndDate >= now && c.EndDate <= in30Days);

        var totalValue = contracts.Sum(c => (double)c.ContractValue);
        var activeValue = contracts.Where(c => c.Status == "Active" || c.Status == "Signed").Sum(c => (double)c.ContractValue);

        var byStatus = contracts
            .GroupBy(c => string.IsNullOrWhiteSpace(c.Status) ? "Draft" : c.Status)
            .Select(g => new { Status = g.Key, Count = g.Count(), Value = g.Sum(c => (double)c.ContractValue) })
            .ToList();

        var byMonth = contracts
            .GroupBy(c => c.CreatedAt.ToString("yyyy-MM"))
            .Select(g => new
            {
                Month = g.Key,
                Count = g.Count(),
                Value = g.Sum(c => (double)c.ContractValue)
            })
            .OrderBy(x => x.Month)
            .ToList();

        return Ok(new
        {
            totalCount,
            activeCount,
            draftCount,
            expiringCount,
            totalValue,
            activeValue,
            byStatus,
            byMonth
        });
    }

    // ── 13. Data Import Activity Report ───────────────────────────────────────
    [HttpGet("imports")]
    public async Task<IActionResult> GetImportReport(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var isManager = _currentUser.IsManagerOrAbove;
        var userId = _currentUser.UserId;
        var totalLeadsImported = await _db.Leads.Where(l => (l.ConvertedCustomerId == null || l.ConvertedCustomer != null) && (isManager || l.AssignedRepId == userId)).CountAsync();
        var totalCustomers = await _db.Customers.Where(c => !c.IsDeleted && (isManager || c.AssignedRepId == userId)).CountAsync();
        var totalCompanies = await _db.Companies.Where(c => !c.IsDeleted && (isManager || c.AssignedRepId == userId)).CountAsync();
        var totalProducts = await _db.Products.CountAsync();

        return Ok(new
        {
            totalLeadsImported,
            totalCustomers,
            totalCompanies,
            totalProducts,
            lastImportDate = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
        });
    }
}
