using System;
using System.Collections.Generic;
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

    // ── Helper: Scope & Permissions ───────────────────────────────────────────
    private (bool isAdmin, bool isManager, int? userId) GetScope(string scope)
    {
        var isPersonal = string.Equals(scope, "personal", StringComparison.OrdinalIgnoreCase);
        var isCompanyOrTeam = string.Equals(scope, "company", StringComparison.OrdinalIgnoreCase) ||
                              string.Equals(scope, "team", StringComparison.OrdinalIgnoreCase) ||
                              string.Equals(scope, "all", StringComparison.OrdinalIgnoreCase);

        var isAdmin = _currentUser.IsAdmin || (isCompanyOrTeam && _currentUser.IsAuthenticated);
        var isManager = _currentUser.IsManagerOrAbove || (isCompanyOrTeam && _currentUser.IsAuthenticated);
        if (isPersonal)
        {
            isAdmin = false;
            isManager = false;
        }
        var userId = _currentUser.UserId;
        return (isAdmin, isManager, userId);
    }

    private (DateTime start, DateTime end) NormalizeDateRange(DateTime? startDate, DateTime? endDate)
    {
        var now = DateTime.UtcNow;
        var start = (startDate ?? now.AddDays(-30)).Date;
        var end = endDate.HasValue ? endDate.Value.Date.AddDays(1).AddTicks(-1) : DateTime.SpecifyKind(now.Date.AddDays(1).AddTicks(-1), DateTimeKind.Unspecified);
        if (end < start) end = start.AddDays(1).AddTicks(-1);
        return (start, end);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    // 1. COMPLETE MASTER EXECUTIVE REPORTS OVERVIEW
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);
        var now = DateTime.UtcNow;

        // 1. Customer & Company Metrics
        var compQuery = _db.Companies
            .Where(c => !c.IsDeleted && (isAdmin || c.AssignedRepId == userId || (isManager && c.AssignedRep != null && c.AssignedRep.ManagerId == userId)));
        var totalCompanies = await compQuery.CountAsync();
        var newCompanies = await compQuery.Where(c => c.CreatedAt >= start && c.CreatedAt <= end).CountAsync();

        var custQuery = _db.Customers
            .Include(c => c.Source)
            .Where(c => !c.IsDeleted && (isAdmin || c.AssignedRepId == userId || (isManager && c.AssignedRep != null && c.AssignedRep.ManagerId == userId)));

        var totalCustomers = await custQuery.CountAsync();
        var newCustomers = await custQuery.Where(c => c.CreatedAt >= start && c.CreatedAt <= end).CountAsync();
        var activeCustomers = totalCustomers;
        var inactiveCustomers = 0;

        var allCustList = await custQuery.Select(c => new { c.CreatedAt, SourceName = c.Source != null ? c.Source.Name : "Direct" }).ToListAsync();

        var customersBySource = allCustList
            .GroupBy(c => string.IsNullOrWhiteSpace(c.SourceName) ? "Direct" : c.SourceName)
            .Select(g => new { source = g.Key, count = g.Count(), percentage = totalCustomers > 0 ? Math.Round((double)g.Count() / totalCustomers * 100, 1) : 0 })
            .OrderByDescending(x => x.count)
            .ToList();

        var customersByStatus = new List<object>
        {
            new { status = "Active Client", count = totalCustomers },
            new { status = "New This Period", count = newCustomers }
        };

        // 2. Lead & Conversion Metrics
        var leadQuery = _db.Leads
            .Include(l => l.LeadStatus)
            .Include(l => l.Source)
            .Where(l => !l.IsDeleted && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep != null && l.AssignedRep.ManagerId == userId)));

        var useDailyBuckets = (end - start).TotalDays <= 45;
        string BucketKey(DateTime dt) => useDailyBuckets ? dt.ToString("yyyy-MM-dd") : dt.ToString("yyyy-MM");
        var periodKeys = new List<string>();
        if (useDailyBuckets)
        {
            for (var d = start.Date; d <= end.Date; d = d.AddDays(1))
                periodKeys.Add(d.ToString("yyyy-MM-dd"));
        }
        else
        {
            var cursor = new DateTime(start.Year, start.Month, 1);
            var last = new DateTime(end.Year, end.Month, 1);
            while (cursor <= last)
            {
                periodKeys.Add(cursor.ToString("yyyy-MM"));
                cursor = cursor.AddMonths(1);
            }
        }

        var customersInPeriod = allCustList.Where(c => c.CreatedAt >= start && c.CreatedAt <= end).ToList();
        var customerGrowthLookup = customersInPeriod
            .GroupBy(d => BucketKey(d.CreatedAt))
            .ToDictionary(g => g.Key, g => g.Count());
        var customerGrowthTrend = periodKeys
            .Select(k => new { month = k, count = customerGrowthLookup.TryGetValue(k, out var c) ? c : 0 })
            .ToList();

        var totalLeads = await leadQuery.CountAsync();
        var newLeads = await leadQuery.Where(l => l.CreatedAt >= start && l.CreatedAt <= end).CountAsync();
        var qualifiedLeads = await leadQuery.Where(l => l.LeadStatus != null && (l.LeadStatus.Name == "Qualified" || l.LeadStatus.Name == "Converted")).CountAsync();
        var convertedLeads = await leadQuery
            .Where(l => l.ConvertedCustomerId != null || (l.LeadStatus != null && l.LeadStatus.Name == "Converted"))
            .CountAsync();
        var convertedInPeriod = await leadQuery
            .Where(l => (l.ConvertedCustomerId != null || (l.LeadStatus != null && l.LeadStatus.Name == "Converted"))
                     && ((l.ConvertedAt.HasValue && l.ConvertedAt.Value >= start && l.ConvertedAt.Value <= end)
                         || (!l.ConvertedAt.HasValue && l.CreatedAt >= start && l.CreatedAt <= end)))
            .CountAsync();
        var conversionRate = totalLeads > 0 ? Math.Round((double)convertedLeads / totalLeads * 100, 1) : 0.0;
        var periodConversionRate = newLeads > 0 ? Math.Round((double)convertedInPeriod / newLeads * 100, 1) : 0.0;

        var allLeadsList = await leadQuery
            .Select(l => new {
                l.CreatedAt,
                StatusName = l.LeadStatus != null ? l.LeadStatus.Name : "New"
            })
            .ToListAsync();

        var leadStatusBreakdown = allLeadsList
            .GroupBy(l => l.StatusName)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToList();

        var leadsInPeriod = allLeadsList.Where(l => l.CreatedAt >= start && l.CreatedAt <= end).ToList();
        var leadTrendLookup = leadsInPeriod
            .GroupBy(l => BucketKey(l.CreatedAt))
            .ToDictionary(g => g.Key, g => g.Count());
        var leadTrend = periodKeys
            .Select(k => new { month = k, count = leadTrendLookup.TryGetValue(k, out var c) ? c : 0 })
            .ToList();

        // 3. Opportunities & Sales Metrics
        var oppQuery = _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Include(o => o.Owner)
            .Where(o => (o.Customer == null || !o.Customer.IsDeleted) && (isAdmin || o.OwnerId == userId || (isManager && o.Owner != null && o.Owner.ManagerId == userId)));

        var totalOpportunities = await oppQuery.CountAsync();
        var allOppsList = await oppQuery.Select(o => new {
            o.OpportunityId,
            o.OpportunityStageId,
            StageName = o.OpportunityStage != null ? o.OpportunityStage.Name : "No Stage",
            IsWon = o.OpportunityStage != null && o.OpportunityStage.IsWon,
            IsLost = o.OpportunityStage != null && o.OpportunityStage.IsLost,
            o.EstimatedValue,
            o.ActualCloseDate,
            o.UpdatedAt,
            o.CreatedAt,
            OwnerName = o.Owner != null ? o.Owner.Name : "Unassigned"
        }).ToListAsync();

        var openOpps = allOppsList.Where(o => !o.IsWon && !o.IsLost).ToList();
        var openDeals = openOpps.Count;
        var pipelineValue = (double)openOpps.Sum(o => o.EstimatedValue);

        static DateTime CloseAt(DateTime? actualClose, DateTime? updatedAt, DateTime createdAt) =>
            actualClose ?? updatedAt ?? createdAt;

        var wonOpps = allOppsList.Where(o => o.IsWon).ToList();
        var lostOpps = allOppsList.Where(o => o.IsLost).ToList();
        var wonDealsCount = wonOpps.Count;
        var lostDealsCount = lostOpps.Count;
        var wonRevenueTotal = (double)wonOpps.Sum(o => o.EstimatedValue);
        var lostValueTotal = (double)lostOpps.Sum(o => o.EstimatedValue);
        var wonInPeriod = wonOpps.Where(o => CloseAt(o.ActualCloseDate, o.UpdatedAt, o.CreatedAt) >= start && CloseAt(o.ActualCloseDate, o.UpdatedAt, o.CreatedAt) <= end).ToList();
        var lostInPeriod = lostOpps.Where(o => CloseAt(o.ActualCloseDate, o.UpdatedAt, o.CreatedAt) >= start && CloseAt(o.ActualCloseDate, o.UpdatedAt, o.CreatedAt) <= end).ToList();
        var wonDealsInPeriod = wonInPeriod.Count;
        var lostDealsInPeriod = lostInPeriod.Count;
        var wonRevenueInPeriod = (double)wonInPeriod.Sum(o => o.EstimatedValue);
        var lostValueInPeriod = (double)lostInPeriod.Sum(o => o.EstimatedValue);
        var averageDealSize = wonDealsCount > 0 ? Math.Round(wonRevenueTotal / wonDealsCount, 2) : 0.0;
        var closedCount = wonDealsCount + lostDealsCount;
        var winRate = closedCount > 0 ? Math.Round((double)wonDealsCount / closedCount * 100, 1) : 0.0;
        var periodClosed = wonDealsInPeriod + lostDealsInPeriod;
        var periodWinRate = periodClosed > 0 ? Math.Round((double)wonDealsInPeriod / periodClosed * 100, 1) : 0.0;

        var allStages = await _db.OpportunityStages.OrderBy(s => s.SortOrder).ToListAsync();
        var pipelineDistribution = allStages
            .Where(s => !s.IsWon && !s.IsLost)
            .Select(s =>
            {
                var stageOpps = allOppsList.Where(o => o.OpportunityStageId == s.OpportunityStageId).ToList();
                return new
                {
                    stage = s.Name,
                    count = stageOpps.Count,
                    value = (double)stageOpps.Sum(o => o.EstimatedValue)
                };
            }).ToList();

        var wonLostBreakdown = new[]
        {
            new { status = "Won", count = wonDealsCount, value = wonRevenueTotal },
            new { status = "Lost", count = lostDealsCount, value = lostValueTotal },
            new { status = "Open", count = openDeals, value = pipelineValue }
        };

        var wonLostTrendLookup = wonOpps.Concat(lostOpps)
            .Where(o => CloseAt(o.ActualCloseDate, o.UpdatedAt, o.CreatedAt) >= start && CloseAt(o.ActualCloseDate, o.UpdatedAt, o.CreatedAt) <= end)
            .GroupBy(o => BucketKey(CloseAt(o.ActualCloseDate, o.UpdatedAt, o.CreatedAt)))
            .ToDictionary(
                g => g.Key,
                g => new {
                    won = (double)g.Where(x => x.IsWon).Sum(x => x.EstimatedValue),
                    lost = (double)g.Where(x => x.IsLost).Sum(x => x.EstimatedValue)
                });
        var wonLostTrend = periodKeys.Select(k =>
        {
            wonLostTrendLookup.TryGetValue(k, out var v);
            return new { month = k, won = v?.won ?? 0.0, lost = v?.lost ?? 0.0 };
        }).ToList();

        var salesByOwner = allOppsList
            .GroupBy(o => string.IsNullOrWhiteSpace(o.OwnerName) ? "Unassigned" : o.OwnerName)
            .Select(g => new
            {
                name = g.Key,
                openDeals = g.Count(x => !x.IsWon && !x.IsLost),
                wonDeals = g.Count(x => x.IsWon),
                pipelineValue = (double)g.Where(x => !x.IsWon && !x.IsLost).Sum(x => x.EstimatedValue),
                wonValue = (double)g.Where(x => x.IsWon).Sum(x => x.EstimatedValue)
            })
            .OrderByDescending(x => x.wonValue)
            .ThenByDescending(x => x.pipelineValue)
            .Take(8)
            .ToList();

        // 4. Contracts Metrics
        var contractQuery = _db.Contracts.Where(c => !c.IsDeleted && (isAdmin || c.CreatedById == userId || (c.Customer != null && c.Customer.AssignedRepId == userId) || (isManager && c.CreatedBy != null && c.CreatedBy.ManagerId == userId)));
        var totalContracts = await contractQuery.CountAsync();
        var allContracts = await contractQuery.ToListAsync();
        var activeContracts = allContracts.Count(c => c.Status == "Active" || c.Status == "Signed");
        var pendingContracts = allContracts.Count(c =>
            c.Status == "Draft" || c.Status == "SentForSignature" || c.Status == "PendingCustomer" || c.Status == "PendingSeller");
        var expiredContracts = allContracts.Count(c => c.Status == "Expired" || c.Status == "Terminated" || c.EndDate < now);
        var newContractsInPeriod = allContracts.Count(c => c.CreatedAt >= start && c.CreatedAt <= end);
        var totalContractValue = (double)allContracts.Sum(c => c.ContractValue);

        var contractsByStatus = allContracts
            .GroupBy(c => string.IsNullOrWhiteSpace(c.Status) ? "Draft" : c.Status)
            .Select(g => new { status = g.Key, count = g.Count(), value = (double)g.Sum(c => c.ContractValue) })
            .ToList();

        // 5. Invoices, Payments & Financial Metrics
        var invoiceQuery = _db.Invoices.Include(i => i.Payments).Where(i => !i.IsDeleted && (isAdmin || i.CreatedById == userId || (i.Customer != null && i.Customer.AssignedRepId == userId) || (isManager && i.CreatedBy != null && i.CreatedBy.ManagerId == userId)));
        var allInvoices = await invoiceQuery.ToListAsync();
        var totalInvoices = allInvoices.Count;
        var totalInvoicedValue = (double)allInvoices.Sum(i => i.TotalAmount);

        var paymentQuery = _db.Payments.Where(p => !p.IsDeleted && (isAdmin || p.CreatedById == userId || (p.Customer != null && p.Customer.AssignedRepId == userId) || (isManager && p.CreatedBy != null && p.CreatedBy.ManagerId == userId)));
        var allPayments = await paymentQuery.ToListAsync();

        var totalPaymentsCollected = (double)allPayments.Where(p => p.Status == "Completed" || p.Status == "Paid").Sum(p => p.Amount);
        var periodInvoices = allInvoices.Where(i => i.IssueDate >= start && i.IssueDate <= end).ToList();
        var periodPayments = allPayments.Where(p =>
            (p.PaymentDate != default ? p.PaymentDate : p.CreatedAt) >= start &&
            (p.PaymentDate != default ? p.PaymentDate : p.CreatedAt) <= end).ToList();
        var periodInvoicedValue = (double)periodInvoices.Sum(i => i.TotalAmount);
        var periodCollectedValue = (double)periodPayments.Where(p => p.Status == "Completed" || p.Status == "Paid").Sum(p => p.Amount);
        
        // Outstanding Receivables: Unpaid balance on open active invoices
        double outstandingReceivables = (double)allInvoices
            .Where(i => i.Status != "Paid" && i.Status != "Cancelled" && i.Status != "Void")
            .Sum(i =>
            {
                var paid = i.Payments.Where(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")).Sum(p => p.Amount);
                return Math.Max(0m, i.TotalAmount - paid);
            });

        var overdueInvoicesList = allInvoices
            .Where(i => i.Status != "Paid" && i.Status != "Cancelled" && i.Status != "Void" && i.DueDate < now)
            .ToList();
        var overdueCount = overdueInvoicesList.Count;
        double overdueValue = (double)overdueInvoicesList.Sum(i =>
        {
            var paid = i.Payments.Where(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")).Sum(p => p.Amount);
            return Math.Max(0m, i.TotalAmount - paid);
        });

        var collectionRate = totalInvoicedValue > 0 ? Math.Round(totalPaymentsCollected / totalInvoicedValue * 100, 1) : 0.0;

        var monthlyPayments = periodPayments
            .Where(p => p.Status == "Completed" || p.Status == "Paid")
            .GroupBy(p => BucketKey(p.PaymentDate != default ? p.PaymentDate : p.CreatedAt))
            .ToDictionary(g => g.Key, g => (double)g.Sum(p => p.Amount));

        var monthlyInvoices = periodInvoices
            .GroupBy(i => BucketKey(i.IssueDate))
            .ToDictionary(g => g.Key, g => (double)g.Sum(i => i.TotalAmount));

        var revenueTrend = periodKeys.Select(m => new
        {
            month = m,
            invoiced = monthlyInvoices.TryGetValue(m, out var inv) ? inv : 0.0,
            collected = monthlyPayments.TryGetValue(m, out var col) ? col : 0.0
        }).ToList();

        var invoicesByStatus = allInvoices
            .GroupBy(i => string.IsNullOrWhiteSpace(i.Status) ? "Draft" : i.Status)
            .Select(g => new { status = g.Key, count = g.Count(), value = (double)g.Sum(i => i.TotalAmount) })
            .ToList();

        var paymentsByStatus = allPayments
            .GroupBy(p => string.IsNullOrWhiteSpace(p.Status) ? "Pending" : p.Status)
            .Select(g => new { status = g.Key, count = g.Count(), value = (double)g.Sum(p => p.Amount) })
            .ToList();

        // 6. Operations: Tasks & Activities Metrics
        var actQuery = _db.Activities
            .Include(a => a.ActivityType)
            .Where(a => (isAdmin || a.CreatedById == userId || (isManager && a.CreatedBy != null && a.CreatedBy.ManagerId == userId)));
        var totalActivities = await actQuery.CountAsync();
        var allActivities = await actQuery.ToListAsync();
        var activitiesInPeriod = allActivities.Count(a => a.ActivityDate >= start && a.ActivityDate <= end);
        var customerActivityCount = allActivities.Count(a => a.CustomerId.HasValue);
        activeCustomers = allActivities.Where(a => a.CustomerId.HasValue).Select(a => a.CustomerId!.Value).Distinct().Count();
        inactiveCustomers = Math.Max(0, totalCustomers - activeCustomers);
        customersByStatus = new List<object>
        {
            new { status = "With activity", count = activeCustomers },
            new { status = "No logged activity", count = inactiveCustomers },
            new { status = "New this period", count = newCustomers }
        };

        var activitiesByType = allActivities
            .GroupBy(a => a.ActivityType != null ? a.ActivityType.Name : "Note")
            .Select(g => new { type = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        var activityTrendLookup = allActivities
            .Where(a => a.ActivityDate >= start && a.ActivityDate <= end)
            .GroupBy(a => BucketKey(a.ActivityDate))
            .ToDictionary(g => g.Key, g => g.Count());
        var activityTrend = periodKeys
            .Select(k => new { month = k, count = activityTrendLookup.TryGetValue(k, out var c) ? c : 0 })
            .ToList();

        var taskQuery = _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Where(t => (isAdmin || t.AssignedToId == userId || t.CreatedById == userId || (isManager && t.AssignedTo != null && t.AssignedTo.ManagerId == userId)));
        var allTasks = await taskQuery.ToListAsync();
        var totalTasks = allTasks.Count;
        var completedTasks = allTasks.Count(t => t.CrmTaskStatus != null && t.CrmTaskStatus.IsTerminal);
        var openTasks = totalTasks - completedTasks;
        
        // Overdue tasks: DueDate < now and not terminal completed
        var overdueTasks = allTasks.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate.HasValue && t.DueDate.Value < now);
        var dueTodayTasks = allTasks.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate.HasValue && t.DueDate.Value.Date == now.Date);

        var tasksByStatus = allTasks
            .GroupBy(t => t.CrmTaskStatus != null ? t.CrmTaskStatus.Name : "Pending")
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToList();

        // 7. System Health & User Metrics
        var activeUsersCount = await _db.Identities.CountAsync(u => u.IsActive);
        var totalUsersCount = await _db.Identities.CountAsync();
        var totalAuditLogsCount = await _db.AuditLogs.CountAsync();
        var auditPeriodRows = await _db.AuditLogs
            .AsNoTracking()
            .Where(a => a.ChangedAt >= start && a.ChangedAt <= end)
            .Select(a => new
            {
                Action = a.AuditActionType != null ? a.AuditActionType.Name : "Update",
                Entity = a.EntityType != null ? a.EntityType.Name : ""
            })
            .ToListAsync();

        var auditInPeriodCount = auditPeriodRows.Count;
        var auditByAction = auditPeriodRows
            .GroupBy(a => string.IsNullOrWhiteSpace(a.Action) ? "Update" : a.Action)
            .Select(g => new { action = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        var authEventCount = auditPeriodRows.Count(a =>
            (a.Entity ?? "").Contains("Auth") ||
            (a.Action ?? "").Contains("Login") ||
            (a.Action ?? "").Contains("Logout") ||
            (a.Action ?? "").Contains("Password") ||
            (a.Action ?? "").Contains("Session"));

        var activeSessionsCount = await _db.RefreshTokens.CountAsync(t => !t.IsRevoked && t.ExpiresAt > now);
        var sessionsCreatedInPeriod = await _db.RefreshTokens.CountAsync(t => t.CreatedAt >= start && t.CreatedAt <= end);
        var revokedSessionsInPeriod = await _db.RefreshTokens.CountAsync(t => t.IsRevoked && t.CreatedAt >= start && t.CreatedAt <= end);

        var failedPayments = allPayments.Count(p => p.Status == "Failed" || p.Status == "Cancelled");
        var recentAuditLogs = await _db.AuditLogs
            .Include(a => a.EntityType)
            .Include(a => a.AuditActionType)
            .Include(a => a.ChangedBy)
            .OrderByDescending(a => a.ChangedAt)
            .Take(8)
            .Select(a => new
            {
                a.AuditLogId,
                entity = a.EntityType != null ? a.EntityType.Name : "Record",
                action = a.AuditActionType != null ? a.AuditActionType.Name : "Update",
                user = a.ChangedBy != null ? a.ChangedBy.Name : "System",
                field = a.FieldName,
                oldValue = a.OldValue,
                newValue = a.NewValue,
                time = a.ChangedAt
            })
            .ToListAsync();

        var alerts = new List<object>();
        if (overdueTasks > 0)
            alerts.Add(new { severity = "warning", label = "Overdue tasks", count = overdueTasks, detail = "Open tasks past their due date" });
        if (overdueCount > 0)
            alerts.Add(new { severity = "critical", label = "Overdue invoices", count = overdueCount, detail = "Unpaid invoices past due" });
        if (pendingContracts > 0)
            alerts.Add(new { severity = "info", label = "Contracts awaiting action", count = pendingContracts, detail = "Draft or pending signature" });
        if (failedPayments > 0)
            alerts.Add(new { severity = "warning", label = "Failed or cancelled payments", count = failedPayments, detail = "Payment records that did not complete" });
        if (dueTodayTasks > 0)
            alerts.Add(new { severity = "info", label = "Tasks due today", count = dueTodayTasks, detail = "Require attention today" });

        return Ok(new
        {
            periodStart = start,
            periodEnd = end,
            bucket = useDailyBuckets ? "day" : "month",

            // Executive KPIs (snapshots unless named *InPeriod)
            totalCompanies,
            newCompanies,
            totalCustomers,
            newCustomers,
            activeCustomers,
            inactiveCustomers,
            totalLeads,
            newLeads,
            qualifiedLeads,
            convertedLeads,
            convertedInPeriod,
            conversionRate,
            periodConversionRate,
            totalOpportunities,
            totalDeals = totalOpportunities,
            openDeals,
            pipelineValue,
            totalPipelineValue = pipelineValue,
            wonDealsCount,
            wonDeals = wonDealsCount,
            lostDealsCount,
            lostDeals = lostDealsCount,
            wonDealsInPeriod,
            lostDealsInPeriod,
            wonRevenueTotal,
            wonRevenueInPeriod,
            lostValueInPeriod,
            revenueInPeriod = wonRevenueInPeriod,
            totalRevenue = wonRevenueTotal,
            lostValueTotal,
            averageDealSize,
            winRate,
            periodWinRate,
            overallWinRate = winRate,
            totalContracts,
            activeContracts,
            pendingContracts,
            expiredContracts,
            newContractsInPeriod,
            totalContractValue,
            totalInvoices,
            totalInvoicedValue,
            periodInvoicedValue,
            totalPaymentsCollected,
            periodCollectedValue,
            outstandingReceivables,
            overdueCount,
            overdueValue,
            collectionRate,
            totalActivities,
            activitiesInPeriod,
            customerActivityCount,
            totalTasks,
            completedTasks,
            openTasks,
            overdueTasks,
            dueTodayTasks,
            activeUsersCount,
            totalUsersCount,
            totalAuditLogsCount,
            auditInPeriodCount,
            authEventCount,
            activeSessionsCount,
            sessionsCreatedInPeriod,
            revokedSessionsInPeriod,
            failedPayments,

            // Charts & Breakdowns
            customerGrowthTrend,
            customersBySource,
            customersByStatus,
            leadStatusBreakdown,
            leadTrend,
            pipelineDistribution,
            wonLostBreakdown,
            wonLostTrend,
            salesByOwner,
            revenueTrend,
            contractsByStatus,
            invoicesByStatus,
            paymentsByStatus,
            activitiesByType,
            activityTrend,
            tasksByStatus,
            auditByAction,
            alerts,
            recentAuditLogs
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. CUSTOMER REPORTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomerReports(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] int? sourceId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);

        var query = _db.Customers
            .Include(c => c.Company)
            .Include(c => c.Source)
            .Include(c => c.AssignedRep)
            .Include(c => c.Payments.Where(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")))
            .Where(c => !c.IsDeleted && (isAdmin || c.AssignedRepId == userId || (isManager && c.AssignedRep != null && c.AssignedRep.ManagerId == userId)))
            .AsQueryable();

        if (sourceId.HasValue && sourceId.Value > 0)
            query = query.Where(c => c.SourceId == sourceId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(c => c.FirstName.ToLower().Contains(s) || c.LastName.ToLower().Contains(s) || c.Email.ToLower().Contains(s) || (c.Company != null && c.Company.Name.ToLower().Contains(s)));
        }

        var allCustomers = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();

        // Date-filtered customer list for growth period
        var inPeriodCustomers = allCustomers.Where(c => c.CreatedAt >= start && c.CreatedAt <= end).ToList();

        var totalCustomers = allCustomers.Count;
        var newCustomers = inPeriodCustomers.Count;
        
        // Active vs Inactive: customers with activity/payment or registered
        var activeCustomers = allCustomers.Count(c => c.Payments.Any() || c.CreatedAt >= DateTime.UtcNow.AddDays(-180));
        var inactiveCustomers = Math.Max(0, totalCustomers - activeCustomers);
        var growthRate = totalCustomers > 0 ? Math.Round((double)newCustomers / totalCustomers * 100, 1) : 0.0;

        // Customer Growth Over Time (Monthly / Daily)
        var growthOverTime = inPeriodCustomers
            .GroupBy(c => (end - start).TotalDays <= 31 ? c.CreatedAt.ToString("yyyy-MM-dd") : c.CreatedAt.ToString("yyyy-MM"))
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToList();

        // Customer Status Distribution (e.g. Active, Inactive, New)
        var byStatus = new List<object>
        {
            new { status = "Active", count = activeCustomers, percentage = totalCustomers > 0 ? Math.Round((double)activeCustomers / totalCustomers * 100, 1) : 0 },
            new { status = "Inactive", count = inactiveCustomers, percentage = totalCustomers > 0 ? Math.Round((double)inactiveCustomers / totalCustomers * 100, 1) : 0 }
        };

        // Customers by Acquisition Source
        var bySource = allCustomers
            .GroupBy(c => c.Source != null ? c.Source.Name : "Direct / Organic")
            .Select(g => new
            {
                source = g.Key,
                count = g.Count(),
                percentage = totalCustomers > 0 ? Math.Round((double)g.Count() / totalCustomers * 100, 1) : 0,
                revenue = (double)g.Sum(c => c.Payments.Sum(p => p.Amount))
            })
            .OrderByDescending(x => x.count)
            .ToList();

        // Corporate vs Individual
        var corporateCount = allCustomers.Count(c => c.CompanyId.HasValue);
        var individualCount = totalCustomers - corporateCount;

        // Customer Activity summary
        var customerIds = allCustomers.Select(c => c.CustomerId).ToList();
        var activitiesCount = await _db.Activities
            .Where(a => a.CustomerId.HasValue && customerIds.Contains(a.CustomerId.Value))
            .CountAsync();

        // Mapped Customer Ledger items
        var items = allCustomers.Select(c =>
        {
            var custRevenue = (double)c.Payments.Sum(p => p.Amount);
            return new
            {
                customerId = c.CustomerId,
                name = $"{c.FirstName} {c.LastName}".Trim(),
                firstName = c.FirstName,
                lastName = c.LastName,
                email = c.Email,
                phone = c.Phone ?? "—",
                companyName = c.Company?.Name ?? "—",
                companyId = c.CompanyId,
                status = c.Payments.Any() || c.CreatedAt >= DateTime.UtcNow.AddDays(-180) ? "Active" : "Inactive",
                sourceName = c.Source?.Name ?? "Direct",
                sourceId = c.SourceId,
                assignedRepName = c.AssignedRep?.Name ?? "Unassigned",
                createdAt = c.CreatedAt,
                lastActivity = c.CreatedAt,
                revenue = custRevenue
            };
        }).ToList();

        return Ok(new
        {
            totalCustomers,
            newCustomers,
            activeCustomers,
            inactiveCustomers,
            growthRate,
            growthOverTime,
            byStatus,
            bySource,
            corporateCount,
            individualCount,
            activitiesCount,
            items
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2.5. COMPANY REPORTS (B2B ENTERPRISE INTELLIGENCE)
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("companies")]
    [HttpGet("company-reports")]
    public async Task<IActionResult> GetCompanyReports(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] string? industry = null,
        [FromQuery] string? companySize = null,
        [FromQuery] string? search = null)
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);

        var query = _db.Companies
            .Include(c => c.AssignedRep)
            .Include(c => c.Source)
            .Where(c => !c.IsDeleted && (isAdmin || c.AssignedRepId == userId || (isManager && c.AssignedRep != null && c.AssignedRep.ManagerId == userId)))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(industry) && industry != "all" && industry != "All")
        {
            query = query.Where(c => c.Industry == industry);
        }

        if (!string.IsNullOrWhiteSpace(companySize) && companySize != "all" && companySize != "All")
        {
            query = query.Where(c => c.CompanySize == companySize);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(s)
                || (c.Industry != null && c.Industry.ToLower().Contains(s))
                || (c.Website != null && c.Website.ToLower().Contains(s))
                || (c.Email != null && c.Email.ToLower().Contains(s))
                || (c.Phone != null && c.Phone.ToLower().Contains(s)));
        }

        var allCompanies = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        var companyIds = allCompanies.Select(c => c.CompanyId).ToList();

        // Query customers associated with these companies
        var customers = await _db.Customers
            .Include(c => c.Payments.Where(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")))
            .Where(c => !c.IsDeleted && c.CompanyId.HasValue && companyIds.Contains(c.CompanyId.Value))
            .ToListAsync();

        var customerIds = customers.Select(c => c.CustomerId).ToList();

        // Query opportunities associated with these customers
        var opps = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => customerIds.Contains(o.CustomerId))
            .ToListAsync();

        // Query contracts associated with these customers
        var contracts = await _db.Contracts
            .Where(c => !c.IsDeleted && customerIds.Contains(c.CustomerId))
            .ToListAsync();

        var inPeriodCompanies = allCompanies.Where(c => c.CreatedAt >= start && c.CreatedAt <= end).ToList();

        var totalCompanies = allCompanies.Count;
        var newCompanies = inPeriodCompanies.Count;
        var totalContacts = customers.Count;
        var withWebsite = allCompanies.Count(c => !string.IsNullOrWhiteSpace(c.Website));
        var avgContactsPerCompany = totalCompanies > 0 ? Math.Round((double)totalContacts / totalCompanies, 1) : 0.0;

        // B2B Financial Pipeline metrics
        var openOpps = opps.Where(o => o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)).ToList();
        var wonOpps = opps.Where(o => o.OpportunityStage != null && o.OpportunityStage.IsWon).ToList();
        var totalPipelineValue = (double)openOpps.Sum(o => o.EstimatedValue);
        var totalWonRevenue = (double)wonOpps.Sum(o => o.EstimatedValue);
        var totalCollectedCash = (double)customers.Sum(c => c.Payments.Sum(p => p.Amount));
        var totalContractValue = (double)contracts.Sum(c => c.ContractValue);

        // Group by Industry Sector
        var industryBreakdown = allCompanies
            .GroupBy(c => string.IsNullOrWhiteSpace(c.Industry) ? "Uncategorized" : c.Industry.Trim())
            .Select(g =>
            {
                var compIdsInGroup = g.Select(c => c.CompanyId).ToList();
                var custIdsInGroup = customers.Where(c => c.CompanyId.HasValue && compIdsInGroup.Contains(c.CompanyId.Value)).Select(c => c.CustomerId).ToList();
                var wonRev = (double)opps.Where(o => custIdsInGroup.Contains(o.CustomerId) && o.OpportunityStage != null && o.OpportunityStage.IsWon).Sum(o => o.EstimatedValue);
                var openVal = (double)opps.Where(o => custIdsInGroup.Contains(o.CustomerId) && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost))).Sum(o => o.EstimatedValue);
                return new
                {
                    name = g.Key,
                    industry = g.Key,
                    count = g.Count(),
                    percentage = totalCompanies > 0 ? Math.Round((double)g.Count() / totalCompanies * 100, 1) : 0.0,
                    contactsCount = custIdsInGroup.Count,
                    wonRevenue = wonRev,
                    pipelineValue = openVal
                };
            })
            .OrderByDescending(x => x.count)
            .ToList();

        // Group by Size Tier
        var sizeBreakdown = allCompanies
            .GroupBy(c => string.IsNullOrWhiteSpace(c.CompanySize) ? "Not Specified" : c.CompanySize.Trim())
            .Select(g =>
            {
                var compIdsInGroup = g.Select(c => c.CompanyId).ToList();
                var custIdsInGroup = customers.Where(c => c.CompanyId.HasValue && compIdsInGroup.Contains(c.CompanyId.Value)).Select(c => c.CustomerId).ToList();
                var wonRev = (double)opps.Where(o => custIdsInGroup.Contains(o.CustomerId) && o.OpportunityStage != null && o.OpportunityStage.IsWon).Sum(o => o.EstimatedValue);
                return new
                {
                    name = g.Key,
                    companySize = g.Key,
                    count = g.Count(),
                    percentage = totalCompanies > 0 ? Math.Round((double)g.Count() / totalCompanies * 100, 1) : 0.0,
                    contactsCount = custIdsInGroup.Count,
                    wonRevenue = wonRev
                };
            })
            .OrderByDescending(x => x.count)
            .ToList();

        // Growth Velocity over time
        var companyGrowthTrend = inPeriodCompanies
            .GroupBy(c => (end - start).TotalDays <= 31 ? c.CreatedAt.ToString("yyyy-MM-dd") : c.CreatedAt.ToString("yyyy-MM"))
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToList();

        // Detailed enriched items ledger
        var items = allCompanies.Select(c =>
        {
            var compCusts = customers.Where(cust => cust.CompanyId == c.CompanyId).ToList();
            var compCustIds = compCusts.Select(cust => cust.CustomerId).ToList();
            var compOpps = opps.Where(o => compCustIds.Contains(o.CustomerId)).ToList();
            var compWonOpps = compOpps.Where(o => o.OpportunityStage != null && o.OpportunityStage.IsWon).ToList();
            var compOpenOpps = compOpps.Where(o => o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)).ToList();
            var compContracts = contracts.Where(ctr => compCustIds.Contains(ctr.CustomerId)).ToList();
            var compCash = (double)compCusts.Sum(cust => cust.Payments.Sum(p => p.Amount));

            return new
            {
                companyId = c.CompanyId,
                name = c.Name,
                industry = c.Industry ?? "General",
                companySize = c.CompanySize ?? "—",
                website = c.Website,
                phone = c.Phone ?? "—",
                email = c.Email ?? "—",
                assignedRepName = c.AssignedRep != null ? c.AssignedRep.Name : "Unassigned",
                contactCount = compCusts.Count,
                openDealsCount = compOpenOpps.Count,
                pipelineValue = (double)compOpenOpps.Sum(o => o.EstimatedValue),
                wonDealsCount = compWonOpps.Count,
                revenueWon = (double)compWonOpps.Sum(o => o.EstimatedValue),
                collectedCash = compCash,
                totalContracts = compContracts.Count,
                contractValue = (double)compContracts.Sum(ctr => ctr.ContractValue),
                createdAt = c.CreatedAt
            };
        }).ToList();

        var topAccounts = items
            .OrderByDescending(x => x.revenueWon)
            .ThenByDescending(x => x.contactCount)
            .Take(12)
            .ToList();

        return Ok(new
        {
            totalCompanies,
            newCompanies,
            totalContacts,
            withWebsite,
            avgContactsPerCompany,
            totalPipelineValue,
            totalWonRevenue,
            totalCollectedCash,
            totalContractValue,
            industryBreakdown,
            sizeBreakdown,
            companyGrowthTrend,
            topAccounts,
            items
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. LEAD REPORTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("leads")]
    public async Task<IActionResult> GetLeadReports(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] int? sourceId = null,
        [FromQuery] int? statusId = null,
        [FromQuery] string? search = null)
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);
        var now = DateTime.UtcNow;

        var query = _db.Leads
            .Include(l => l.Source)
            .Include(l => l.LeadStatus)
            .Include(l => l.AssignedRep)
            .Include(l => l.ConvertedCustomer)
            .Include(l => l.Tasks)
                .ThenInclude(t => t.CrmTaskStatus)
            .Where(l => !l.IsDeleted && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep != null && l.AssignedRep.ManagerId == userId)))
            .AsQueryable();

        if (sourceId.HasValue && sourceId.Value > 0)
            query = query.Where(l => l.SourceId == sourceId.Value);

        if (statusId.HasValue && statusId.Value > 0)
            query = query.Where(l => l.LeadStatusId == statusId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(l => l.FirstName.ToLower().Contains(s) || l.LastName.ToLower().Contains(s) || (l.Email != null && l.Email.ToLower().Contains(s)) || (l.CompanyName != null && l.CompanyName.ToLower().Contains(s)));
        }

        var allLeads = await query.OrderByDescending(l => l.CreatedAt).ToListAsync();
        var inPeriodLeads = allLeads.Where(l => l.CreatedAt >= start && l.CreatedAt <= end || (l.ConvertedAt.HasValue && l.ConvertedAt.Value >= start && l.ConvertedAt.Value <= end)).ToList();

        var totalLeads = allLeads.Count;
        var newLeads = inPeriodLeads.Count(l => l.CreatedAt >= start && l.CreatedAt <= end);

        var convertedLeads = allLeads.Count(l => l.ConvertedCustomerId != null || (l.LeadStatus != null && l.LeadStatus.Name == "Converted"));
        var convertedInPeriod = inPeriodLeads.Count(l => l.ConvertedCustomerId != null || (l.LeadStatus != null && l.LeadStatus.Name == "Converted"));
        
        var qualifiedLeads = allLeads.Count(l => l.LeadStatus != null && (l.LeadStatus.Name == "Qualified" || l.LeadStatus.Name == "Converted"));
        var unqualifiedLeads = allLeads.Count(l => l.LeadStatus == null || l.LeadStatus.Name == "New" || l.LeadStatus.Name == "Unqualified" || l.LeadStatus.Name == "Lost");

        var conversionRate = totalLeads > 0 ? Math.Round((double)convertedLeads / totalLeads * 100, 1) : 0.0;

        // Lead Trend Over Time
        var leadTrend = inPeriodLeads
            .GroupBy(l => (end - start).TotalDays <= 31 ? l.CreatedAt.ToString("yyyy-MM-dd") : l.CreatedAt.ToString("yyyy-MM"))
            .Select(g => new
            {
                date = g.Key,
                total = g.Count(),
                converted = g.Count(x => x.ConvertedCustomerId != null || (x.LeadStatus != null && x.LeadStatus.Name == "Converted"))
            })
            .OrderBy(x => x.date)
            .ToList();

        // Leads by Status
        var byStatus = allLeads
            .GroupBy(l => l.LeadStatus != null ? l.LeadStatus.Name : "New")
            .Select(g => new
            {
                status = g.Key,
                count = g.Count(),
                percentage = totalLeads > 0 ? Math.Round((double)g.Count() / totalLeads * 100, 1) : 0
            })
            .OrderByDescending(x => x.count)
            .ToList();

        // Leads by Source
        var bySource = allLeads
            .GroupBy(l => l.Source != null ? l.Source.Name : "Direct")
            .Select(g => new
            {
                source = g.Key,
                count = g.Count(),
                converted = g.Count(x => x.ConvertedCustomerId != null || (x.LeadStatus != null && x.LeadStatus.Name == "Converted")),
                conversionRate = g.Count() > 0 ? Math.Round((double)g.Count(x => x.ConvertedCustomerId != null || (x.LeadStatus != null && x.LeadStatus.Name == "Converted")) / g.Count() * 100, 1) : 0.0
            })
            .OrderByDescending(x => x.count)
            .ToList();

        // Lead Score Breakdown
        var scoreTiers = new List<object>
        {
            new { tier = "Urgent (80-100)", min = 80, max = 100, count = allLeads.Count(l => l.LeadScore >= 80) },
            new { tier = "High (60-79)",    min = 60, max = 79,  count = allLeads.Count(l => l.LeadScore >= 60 && l.LeadScore < 80) },
            new { tier = "Medium (40-59)",  min = 40, max = 59,  count = allLeads.Count(l => l.LeadScore >= 40 && l.LeadScore < 60) },
            new { tier = "Low (0-39)",      min = 0,  max = 39,  count = allLeads.Count(l => l.LeadScore < 40) },
        };

        // Lead Follow-Up SLA
        var activeLeads = allLeads.Where(l => l.LeadStatus == null || !l.LeadStatus.IsTerminal).ToList();
        var scheduledFollowUps = activeLeads.Count(l => l.Tasks.Any(t => t.DueDate.HasValue && t.DueDate.Value >= now && (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal)));
        var dueTodayFollowUps = activeLeads.Count(l => l.Tasks.Any(t => t.DueDate.HasValue && t.DueDate.Value.Date == now.Date && (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal)));
        var overdueFollowUps = activeLeads.Count(l => l.Tasks.Any(t => t.DueDate.HasValue && t.DueDate.Value < now && (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal)));
        var completedFollowUps = allLeads.Sum(l => l.Tasks.Count(t => t.CrmTaskStatus != null && t.CrmTaskStatus.IsTerminal));
        var slaHealthRate = activeLeads.Count > 0 ? Math.Round((double)(scheduledFollowUps + dueTodayFollowUps) / activeLeads.Count * 100, 1) : 100.0;

        // Mapped Lead Ledger Items
        var items = allLeads.Select(l => new
        {
            leadId = l.LeadId,
            name = $"{l.FirstName} {l.LastName}".Trim(),
            firstName = l.FirstName,
            lastName = l.LastName,
            companyName = l.CompanyName ?? "—",
            email = l.Email ?? "—",
            phone = l.Phone ?? "—",
            jobTitle = l.JobTitle ?? "—",
            sourceName = l.Source?.Name ?? "Direct",
            statusName = l.LeadStatus?.Name ?? "New",
            leadScore = l.LeadScore,
            priority = l.Priority ?? "Medium",
            assignedRepName = l.AssignedRep?.Name ?? "Unassigned",
            convertedCustomerId = l.ConvertedCustomerId,
            convertedAt = l.ConvertedAt,
            createdAt = l.CreatedAt,
            lastActivityAt = l.LastActivityAt ?? l.CreatedAt
        }).ToList();

        return Ok(new
        {
            totalLeads,
            newLeads,
            qualifiedLeads,
            unqualifiedLeads,
            convertedLeads,
            convertedInPeriod,
            conversionRate,
            leadTrend,
            byStatus,
            bySource,
            scoreTiers,
            followUp = new
            {
                scheduledFollowUps,
                dueTodayFollowUps,
                overdueFollowUps,
                completedFollowUps,
                slaHealthRate
            },
            items
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4. PIPELINE REPORTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("pipeline")]
    public async Task<IActionResult> GetPipelineReports(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] int? stageId = null,
        [FromQuery] string? search = null)
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);

        var query = _db.Opportunities
            .Include(o => o.Customer)
                .ThenInclude(c => c.Company)
            .Include(o => o.OpportunityStage)
            .Include(o => o.Owner)
            .Where(o => (o.Customer == null || !o.Customer.IsDeleted) && (isAdmin || o.OwnerId == userId || (isManager && o.Owner != null && o.Owner.ManagerId == userId)))
            .AsQueryable();

        if (stageId.HasValue && stageId.Value > 0)
            query = query.Where(o => o.OpportunityStageId == stageId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(o => o.Title.ToLower().Contains(s) || (o.Customer != null && (o.Customer.FirstName.ToLower().Contains(s) || o.Customer.LastName.ToLower().Contains(s))));
        }

        var allOpps = await query.OrderByDescending(o => o.CreatedAt).ToListAsync();
        var allStages = await _db.OpportunityStages.OrderBy(s => s.OpportunityStageId).ToListAsync();

        var totalOpps = allOpps.Count;
        var openOpps = allOpps.Where(o => o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)).ToList();
        var wonOpps = allOpps.Where(o => o.OpportunityStage != null && o.OpportunityStage.IsWon).ToList();
        var lostOpps = allOpps.Where(o => o.OpportunityStage != null && o.OpportunityStage.IsLost).ToList();

        var totalPipelineValue = (double)allOpps.Sum(o => o.EstimatedValue);
        var openPipelineValue = (double)openOpps.Sum(o => o.EstimatedValue);
        var wonValue = (double)wonOpps.Sum(o => o.EstimatedValue);
        var lostValue = (double)lostOpps.Sum(o => o.EstimatedValue);
        var averageDealValue = totalOpps > 0 ? totalPipelineValue / totalOpps : 0.0;

        var closedTotal = wonOpps.Count + lostOpps.Count;
        var winRate = closedTotal > 0 ? Math.Round((double)wonOpps.Count / closedTotal * 100, 1) : 0.0;

        // Pipeline by Stage
        var byStage = allStages.Select(stage =>
        {
            var stageOpps = allOpps.Where(o => o.OpportunityStageId == stage.OpportunityStageId).ToList();
            var val = (double)stageOpps.Sum(o => o.EstimatedValue);
            return new
            {
                stageId = stage.OpportunityStageId,
                stageName = stage.Name,
                isWon = stage.IsWon,
                isLost = stage.IsLost,
                dealCount = stageOpps.Count,
                totalValue = val,
                averageValue = stageOpps.Count > 0 ? val / stageOpps.Count : 0.0,
                percentage = totalPipelineValue > 0 ? Math.Round(val / totalPipelineValue * 100, 1) : 0.0
            };
        }).ToList();

        // Win / Loss Monthly Trend
        var closedOpps = allOpps.Where(o => o.OpportunityStage != null && (o.OpportunityStage.IsWon || o.OpportunityStage.IsLost)).ToList();
        var winLossByMonth = closedOpps
            .GroupBy(o => (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt).ToString("yyyy-MM"))
            .Select(g => new
            {
                month = g.Key,
                won = g.Count(x => x.OpportunityStage!.IsWon),
                lost = g.Count(x => x.OpportunityStage!.IsLost),
                wonValue = (double)g.Where(x => x.OpportunityStage!.IsWon).Sum(x => x.EstimatedValue),
                lostValue = (double)g.Where(x => x.OpportunityStage!.IsLost).Sum(x => x.EstimatedValue),
                winRate = g.Count() > 0 ? Math.Round((double)g.Count(x => x.OpportunityStage!.IsWon) / g.Count() * 100, 1) : 0.0
            })
            .OrderBy(x => x.month)
            .ToList();

        // Forecast: Weighted expected value by month
        var forecastByMonth = openOpps
            .Where(o => o.ExpectedCloseDate.HasValue)
            .GroupBy(o => o.ExpectedCloseDate!.Value.ToString("yyyy-MM"))
            .Select(g => new
            {
                month = g.Key,
                dealCount = g.Count(),
                totalValue = (double)g.Sum(o => o.EstimatedValue),
                weightedValue = (double)g.Sum(o => o.EstimatedValue * 0.65m)
            })
            .OrderBy(x => x.month)
            .ToList();

        // Mapped Items
        var items = allOpps.Select(o => new
        {
            opportunityId = o.OpportunityId,
            title = o.Title,
            customerId = o.CustomerId,
            customerName = o.Customer != null ? $"{o.Customer.FirstName} {o.Customer.LastName}".Trim() : "—",
            companyName = o.Customer?.Company?.Name ?? "—",
            stageId = o.OpportunityStageId,
            stageName = o.OpportunityStage?.Name ?? "No Stage",
            isWon = o.OpportunityStage?.IsWon ?? false,
            isLost = o.OpportunityStage?.IsLost ?? false,
            estimatedValue = (double)o.EstimatedValue,
            expectedCloseDate = o.ExpectedCloseDate,
            actualCloseDate = o.ActualCloseDate,
            ownerName = o.Owner?.Name ?? "Unassigned",
            createdAt = o.CreatedAt
        }).ToList();

        return Ok(new
        {
            totalPipelineValue,
            openPipelineValue,
            wonValue,
            lostValue,
            averageDealValue,
            dealCount = totalOpps,
            openDealsCount = openOpps.Count,
            wonDealsCount = wonOpps.Count,
            lostDealsCount = lostOpps.Count,
            winRate,
            byStage,
            winLossByMonth,
            forecastByMonth,
            items
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 5. OPPORTUNITY REPORTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("opportunities")]
    public async Task<IActionResult> GetOpportunityReports(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] int? stageId = null,
        [FromQuery] int? ownerId = null,
        [FromQuery] string? search = null)
    {
        return await GetPipelineReports(startDate, endDate, scope, stageId, search);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 6. CONTRACT REPORTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("contracts")]
    public async Task<IActionResult> GetContractsReport(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] int? repId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);
        var now = DateTime.UtcNow;
        var in30Days = now.AddDays(30);

        var query = _db.Contracts
            .Include(c => c.Customer)
                .ThenInclude(cust => cust.AssignedRep)
            .Include(c => c.Opportunity)
                .ThenInclude(opp => opp.Owner)
            .Include(c => c.CreatedBy)
            .Where(c => !c.IsDeleted)
            .AsQueryable();

        if (!isAdmin)
        {
            if (isManager)
            {
                query = query.Where(c => c.CreatedById == userId || (c.Customer != null && (c.Customer.AssignedRepId == userId || (c.Customer.AssignedRep != null && c.Customer.AssignedRep.ManagerId == userId))));
            }
            else
            {
                query = query.Where(c => c.CreatedById == userId || (c.Customer != null && c.Customer.AssignedRepId == userId));
            }
        }
        else if (repId.HasValue && repId.Value > 0)
        {
            query = query.Where(c => c.CreatedById == repId.Value || (c.Customer != null && c.Customer.AssignedRepId == repId.Value));
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            query = query.Where(c => c.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(c => c.Title.ToLower().Contains(s) || c.ContractNumber.ToLower().Contains(s) || (c.Customer != null && (c.Customer.FirstName.ToLower().Contains(s) || c.Customer.LastName.ToLower().Contains(s))));
        }

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
                displayStatus = "Pending Client Signature";
                category = "PartiallySigned";
            }
            else if (c.Status == "PendingSeller" || (!hasCompany && hasCustomer))
            {
                displayStatus = "Pending Company Signature";
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
        var expiredCount = enriched.Count(x => x.category == "Expired");
        var cancelledCount = enriched.Count(x => x.category == "Cancelled");
        var expiringCount = enriched.Count(x => x.contract.EndDate >= now && x.contract.EndDate <= in30Days && x.category != "Cancelled");

        var totalContractValue = enriched.Sum(x => (double)x.contract.ContractValue);
        var activeValue = enriched.Where(x => x.category == "Signed").Sum(x => (double)x.contract.ContractValue);
        var pendingExecutionValue = enriched.Where(x => x.category == "PartiallySigned" || x.category == "PendingSignature").Sum(x => (double)x.contract.ContractValue);
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
                activeValue = g.Where(x => x.category == "Signed").Sum(x => (double)x.contract.ContractValue)
            })
            .OrderByDescending(g => g.totalValue)
            .ToList();

        var items = enriched.Select(x => new
        {
            contractId = x.contract.ContractId,
            title = x.contract.Title,
            contractNumber = x.contract.ContractNumber ?? $"CTR-{x.contract.ContractId:D5}",
            customerName = x.contract.Customer != null ? $"{x.contract.Customer.FirstName} {x.contract.Customer.LastName}".Trim() : "Unknown Customer",
            customerId = x.contract.CustomerId,
            ownerName = x.ownerName,
            contractValue = (double)x.contract.ContractValue,
            status = x.displayStatus,
            rawStatus = x.contract.Status,
            category = x.category,
            signatureProgress = x.signatureProgress,
            startDate = x.contract.StartDate,
            endDate = x.contract.EndDate,
            createdAt = x.contract.CreatedAt,
            isExpiring = x.contract.EndDate >= now && x.contract.EndDate <= in30Days && x.category != "Cancelled"
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
            expiredCount,
            cancelledCount,
            expiringCount,
            totalContractValue,
            totalValue = totalContractValue,
            activeValue,
            pendingValue = pendingExecutionValue,
            draftValue,
            signingRate,
            byStatus,
            byMonth,
            byRep,
            items
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 7. INVOICE REPORTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("invoices")]
    [HttpGet("invoice-revenue")]
    public async Task<IActionResult> GetInvoiceReports(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);
        var now = DateTime.UtcNow;

        var query = _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.CreatedBy)
            .Include(i => i.Payments.Where(p => !p.IsDeleted))
            .Where(i => !i.IsDeleted && (isAdmin || i.CreatedById == userId || (i.Customer != null && i.Customer.AssignedRepId == userId) || (isManager && i.CreatedBy != null && i.CreatedBy.ManagerId == userId)))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            query = query.Where(i => i.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(i => i.InvoiceNumber.ToLower().Contains(s) || (i.Customer != null && (i.Customer.FirstName.ToLower().Contains(s) || i.Customer.LastName.ToLower().Contains(s))));
        }

        var invoices = await query.OrderByDescending(i => i.CreatedAt).ToListAsync();

        var totalInvoiced = invoices.Sum(i => (double)i.TotalAmount);
        var totalCollected = invoices.Sum(i =>
        {
            var paidPayments = i.Payments.Where(p => p.Status == "Completed" || p.Status == "Paid").Sum(p => (double)p.Amount);
            if (paidPayments > 0) return paidPayments;
            return i.Status == "Paid" ? (double)i.TotalAmount : 0.0;
        });

        var totalOutstanding = invoices.Where(i => i.Status != "Paid" && i.Status != "Cancelled" && i.Status != "Void").Sum(i =>
        {
            var paid = i.Payments.Where(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")).Sum(p => (double)p.Amount);
            return Math.Max(0.0, (double)i.TotalAmount - paid);
        });

        var overdueInvoicesList = invoices.Where(i => i.Status != "Paid" && i.Status != "Cancelled" && i.DueDate < now).ToList();
        var totalOverdue = overdueInvoicesList.Sum(i =>
        {
            var paid = i.Payments.Where(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")).Sum(p => (double)p.Amount);
            return Math.Max(0.0, (double)i.TotalAmount - paid);
        });

        var totalCancelled = invoices.Where(i => i.Status == "Cancelled").Sum(i => (double)i.TotalAmount);

        var paidCount = invoices.Count(i => i.Status == "Paid" || (i.Payments.Where(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")).Sum(p => p.Amount) >= i.TotalAmount));
        var unpaidCount = invoices.Count(i => (i.Status == "Draft" || i.Status == "Sent" || i.Status == "Overdue") && !i.Payments.Any(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")));
        var partiallyPaidCount = invoices.Count(i => i.Status != "Paid" && i.Status != "Cancelled" && i.Payments.Any(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")));
        var overdueCount = overdueInvoicesList.Count;

        var collectionRate = totalInvoiced > 0 ? Math.Round(totalCollected / totalInvoiced * 100, 1) : 0.0;

        // Accounts Receivable Aging Buckets
        double aging0to30 = 0, aging31to60 = 0, aging61to90 = 0, aging90Plus = 0;
        foreach (var inv in invoices.Where(i => i.Status != "Paid" && i.Status != "Cancelled" && i.Status != "Void"))
        {
            var paid = inv.Payments.Where(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")).Sum(p => (double)p.Amount);
            var balance = Math.Max(0.0, (double)inv.TotalAmount - paid);
            if (balance <= 0) continue;

            if (inv.DueDate >= now)
            {
                aging0to30 += balance;
            }
            else
            {
                var daysOverdue = (now - inv.DueDate).TotalDays;
                if (daysOverdue <= 30) aging0to30 += balance;
                else if (daysOverdue <= 60) aging31to60 += balance;
                else if (daysOverdue <= 90) aging61to90 += balance;
                else aging90Plus += balance;
            }
        }

        var byMonth = invoices
            .GroupBy(i => i.CreatedAt.ToString("yyyy-MM"))
            .Select(g => new
            {
                month = g.Key,
                collected = g.Sum(i => i.Payments.Where(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")).Sum(p => (double)p.Amount)),
                invoiced = g.Sum(i => (double)i.TotalAmount),
                count = g.Count()
            })
            .OrderBy(x => x.month)
            .ToList();

        var byStatus = invoices
            .GroupBy(i => string.IsNullOrWhiteSpace(i.Status) ? "Draft" : i.Status)
            .Select(g => new { status = g.Key, count = g.Count(), value = g.Sum(i => (double)i.TotalAmount) })
            .ToList();

        var items = invoices.Select(i =>
        {
            var paid = i.Payments.Where(p => p.Status == "Completed" || p.Status == "Paid").Sum(p => (double)p.Amount);
            var balance = Math.Max(0.0, (double)i.TotalAmount - paid);
            var isOverdue = i.Status != "Paid" && i.Status != "Cancelled" && i.DueDate < now && balance > 0;
            return new
            {
                invoiceId = i.InvoiceId,
                invoiceNumber = i.InvoiceNumber ?? $"INV-{i.InvoiceId:D5}",
                customerName = i.Customer != null ? $"{i.Customer.FirstName} {i.Customer.LastName}".Trim() : "Unknown Customer",
                customerId = i.CustomerId,
                totalAmount = (double)i.TotalAmount,
                amountPaid = paid,
                balance = balance,
                status = i.Status ?? "Draft",
                dueDate = i.DueDate,
                createdAt = i.CreatedAt,
                isOverdue = isOverdue
            };
        }).ToList();

        return Ok(new
        {
            totalInvoiced,
            totalCollected,
            totalOutstanding,
            totalOverdue,
            totalCancelled,
            paidCount,
            unpaidCount,
            partiallyPaidCount,
            overdueCount,
            collectionRate,
            aging0to30,
            aging31to60,
            aging61to90,
            aging90Plus,
            byMonth,
            byStatus,
            items
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 8. PAYMENT REPORTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("payments")]
    public async Task<IActionResult> GetPaymentReports(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] string? method = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);
        var now = DateTime.UtcNow;

        var query = _db.Payments
            .Include(p => p.Customer)
                .ThenInclude(c => c.Company)
            .Include(p => p.Invoice)
            .Include(p => p.Opportunity)
            .Include(p => p.CreatedBy)
            .Where(p => !p.IsDeleted && (isAdmin || p.CreatedById == userId || (p.Customer != null && p.Customer.AssignedRepId == userId) || (isManager && p.CreatedBy != null && p.CreatedBy.ManagerId == userId)))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(method) && method != "All")
            query = query.Where(p => p.PaymentMethod == method);

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            query = query.Where(p => p.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p => p.PaymentNumber.ToLower().Contains(s) || (p.TransactionReference != null && p.TransactionReference.ToLower().Contains(s)) || (p.Customer != null && (p.Customer.FirstName.ToLower().Contains(s) || p.Customer.LastName.ToLower().Contains(s))));
        }

        var payments = await query.OrderByDescending(p => p.PaymentDate).ToListAsync();

        var isPaidStatus = new Func<string, bool>(s => s == "Completed" || s == "Paid");
        var isPendingStatus = new Func<string, bool>(s => s == "Pending" || s == "PendingVerification");

        var totalCollected = payments.Where(p => isPaidStatus(p.Status)).Sum(p => (double)p.Amount);
        var totalPending = payments.Where(p => isPendingStatus(p.Status)).Sum(p => (double)p.Amount);
        var totalRefunded = payments.Where(p => p.Status == "Refunded").Sum(p => (double)p.Amount);
        var totalFailed = payments.Where(p => p.Status == "Failed" || p.Status == "Cancelled").Sum(p => (double)p.Amount);
        var totalTransactions = payments.Count;

        var completedCount = payments.Count(p => isPaidStatus(p.Status));
        var pendingCount = payments.Count(p => isPendingStatus(p.Status));
        var refundedCount = payments.Count(p => p.Status == "Refunded");
        var failedCount = payments.Count(p => p.Status == "Failed" || p.Status == "Cancelled");

        var averagePayment = completedCount > 0 ? totalCollected / completedCount : 0.0;
        var latestPaymentDate = payments.FirstOrDefault()?.PaymentDate;

        // Outstanding Receivables from active open invoices
        var openInvoices = await _db.Invoices
            .Include(i => i.Payments)
            .Where(i => !i.IsDeleted && i.Status != "Paid" && i.Status != "Cancelled" && (isAdmin || i.CreatedById == userId || (i.Customer != null && i.Customer.AssignedRepId == userId)))
            .ToListAsync();

        var totalReceivable = (double)openInvoices.Sum(inv =>
        {
            var paid = inv.Payments.Where(p => !p.IsDeleted && isPaidStatus(p.Status)).Sum(p => p.Amount);
            return Math.Max(0m, inv.TotalAmount - paid);
        });

        // Payment Methods breakdown from real database records
        var byMethod = payments
            .GroupBy(p => string.IsNullOrWhiteSpace(p.PaymentMethod) ? "Other" : p.PaymentMethod)
            .Select(g => new
            {
                method = g.Key,
                count = g.Count(),
                totalAmount = (double)g.Sum(p => p.Amount),
                collectedAmount = (double)g.Where(p => isPaidStatus(p.Status)).Sum(p => p.Amount),
                percentage = totalTransactions > 0 ? Math.Round((double)g.Count() / totalTransactions * 100, 1) : 0
            })
            .OrderByDescending(x => x.totalAmount)
            .ToList();

        // Status Breakdown
        var byStatus = payments
            .GroupBy(p => string.IsNullOrWhiteSpace(p.Status) ? "Pending" : p.Status)
            .Select(g => new
            {
                status = g.Key,
                count = g.Count(),
                totalAmount = (double)g.Sum(p => p.Amount),
                percentage = totalTransactions > 0 ? Math.Round((double)g.Count() / totalTransactions * 100, 1) : 0
            })
            .OrderByDescending(x => x.count)
            .ToList();

        // Inflow velocity trend
        var monthlyInflow = payments
            .GroupBy(p => p.PaymentDate.ToString("yyyy-MM"))
            .Select(g => new
            {
                month = g.Key,
                collected = (double)g.Where(p => isPaidStatus(p.Status)).Sum(p => p.Amount),
                pending = (double)g.Where(p => isPendingStatus(p.Status)).Sum(p => p.Amount),
                refunded = (double)g.Where(p => p.Status == "Refunded").Sum(p => p.Amount),
                count = g.Count()
            })
            .OrderBy(x => x.month)
            .ToList();

        var items = payments.Select(p => new
        {
            paymentId = p.PaymentId,
            paymentNumber = p.PaymentNumber,
            customerId = p.CustomerId,
            customerName = p.Customer != null ? $"{p.Customer.FirstName} {p.Customer.LastName}".Trim() : "—",
            companyName = p.Customer?.Company?.Name ?? "—",
            invoiceId = p.InvoiceId,
            invoiceNumber = p.Invoice != null ? p.Invoice.InvoiceNumber : null,
            amount = (double)p.Amount,
            currency = p.Currency ?? "USD",
            paymentMethod = p.PaymentMethod ?? "Other",
            status = isPaidStatus(p.Status) ? "Paid" : p.Status,
            transactionReference = p.TransactionReference,
            paymentDate = p.PaymentDate,
            createdAt = p.CreatedAt,
            createdByName = p.CreatedBy?.Name
        }).ToList();

        return Ok(new
        {
            totalCollected,
            totalPending,
            totalRefunded,
            totalFailed,
            totalReceivable,
            totalTransactions,
            completedCount,
            pendingCount,
            refundedCount,
            failedCount,
            averagePayment,
            latestPaymentDate,
            byMethod,
            byStatus,
            byMonth = monthlyInflow,
            monthlyInflow,
            items
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 9. ACTIVITY REPORTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("activities")]
    [HttpGet("activity-summary")]
    public async Task<IActionResult> GetActivityReports(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] int? typeId = null,
        [FromQuery] int? userIdParam = null,
        [FromQuery] string? search = null)
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);
        var now = DateTime.UtcNow;

        var query = _db.Activities
            .Include(a => a.ActivityType)
            .Include(a => a.Customer)
            .Include(a => a.Lead)
            .Include(a => a.Opportunity)
            .Include(a => a.CreatedBy)
            .Where(a => isAdmin || a.CreatedById == userId || (isManager && a.CreatedBy != null && a.CreatedBy.ManagerId == userId))
            .AsQueryable();

        if (typeId.HasValue && typeId.Value > 0)
            query = query.Where(a => a.ActivityTypeId == typeId.Value);

        if (userIdParam.HasValue && userIdParam.Value > 0)
            query = query.Where(a => a.CreatedById == userIdParam.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(a => a.Subject.ToLower().Contains(s) || (a.Description != null && a.Description.ToLower().Contains(s)));
        }

        var activities = await query.OrderByDescending(a => a.ActivityDate).ToListAsync();
        var inPeriodActivities = activities.Where(a => a.ActivityDate >= start && a.ActivityDate <= end).ToList();

        var totalActivities = activities.Count;
        var completedActivities = activities.Count(a => a.ActivityDate <= now);
        var upcomingActivities = activities.Count(a => a.ActivityDate > now);

        // Activity breakdown by type
        var byType = activities
            .GroupBy(a => a.ActivityType != null ? a.ActivityType.Name : "Other")
            .Select(g => new
            {
                type = g.Key,
                count = g.Count(),
                duration = g.Sum(x => x.DurationMinutes),
                percentage = totalActivities > 0 ? Math.Round((double)g.Count() / totalActivities * 100, 1) : 0
            })
            .OrderByDescending(x => x.count)
            .ToList();

        // Activity breakdown by User
        var byUser = activities
            .GroupBy(a => a.CreatedBy != null ? a.CreatedBy.Name : "Unknown")
            .Select(g => new
            {
                userName = g.Key,
                count = g.Count(),
                totalMinutes = g.Sum(x => x.DurationMinutes)
            })
            .OrderByDescending(x => x.count)
            .ToList();

        // Activities over time
        var trend = inPeriodActivities
            .GroupBy(a => (end - start).TotalDays <= 31 ? a.ActivityDate.ToString("yyyy-MM-dd") : a.ActivityDate.ToString("yyyy-MM"))
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToList();

        var items = activities.Select(a => new
        {
            activityId = a.ActivityId,
            type = a.ActivityType?.Name ?? "Note",
            icon = a.ActivityType?.Icon,
            subject = a.Subject,
            description = a.Description,
            activityDate = a.ActivityDate,
            durationMinutes = a.DurationMinutes,
            customerId = a.CustomerId,
            customerName = a.Customer != null ? $"{a.Customer.FirstName} {a.Customer.LastName}".Trim() : null,
            leadId = a.LeadId,
            leadName = a.Lead != null ? $"{a.Lead.FirstName} {a.Lead.LastName}".Trim() : null,
            opportunityId = a.OpportunityId,
            opportunityTitle = a.Opportunity?.Title,
            createdByName = a.CreatedBy?.Name ?? "User",
            createdAt = a.CreatedAt
        }).ToList();

        return Ok(new
        {
            totalActivities,
            completedActivities,
            upcomingActivities,
            overdueActivities = 0,
            byType,
            byUser,
            trend,
            items
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 10. TASK REPORTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("tasks")]
    public async Task<IActionResult> GetTaskReports(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] int? assigneeId = null,
        [FromQuery] int? statusId = null,
        [FromQuery] string? search = null)
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);
        var now = DateTime.UtcNow;

        var query = _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Include(t => t.Customer)
            .Include(t => t.Opportunity)
            .Include(t => t.Lead)
            .Include(t => t.Activity)
                .ThenInclude(a => a.ActivityType)
            .Include(t => t.AssignedTo)
            .Include(t => t.CreatedBy)
            .Where(t => isAdmin || isManager || t.AssignedToId == userId || t.CreatedById == userId)
            .AsQueryable();

        if (assigneeId.HasValue && assigneeId.Value > 0)
            query = query.Where(t => t.AssignedToId == assigneeId.Value);

        if (statusId.HasValue && statusId.Value > 0)
            query = query.Where(t => t.CrmTaskStatusId == statusId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(s) || (t.Description != null && t.Description.ToLower().Contains(s)));
        }

        var allTasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

        var total = allTasks.Count;
        var completed = allTasks.Count(t => t.CrmTaskStatus != null && t.CrmTaskStatus.IsTerminal);
        
        // Critical requirement: A task must remain visible as overdue when DueDate has passed, even if In Progress
        var overdue = allTasks.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate.HasValue && t.DueDate.Value < now);
        var dueToday = allTasks.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate.HasValue && t.DueDate.Value.Date == now.Date);
        var inProgress = allTasks.Count(t => t.CrmTaskStatus != null && t.CrmTaskStatus.Name == "In Progress" && (!t.DueDate.HasValue || t.DueDate.Value >= now));
        var pending = allTasks.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && (!t.DueDate.HasValue || t.DueDate.Value >= now));

        var completionRate = total > 0 ? Math.Round((double)completed / total * 100, 1) : 0.0;

        var byStatus = allTasks
            .GroupBy(t => t.CrmTaskStatus != null ? t.CrmTaskStatus.Name : "Pending")
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToList();

        var byAssignee = allTasks
            .GroupBy(t => t.AssignedTo != null ? t.AssignedTo.Name : "Unassigned")
            .Select(g => new
            {
                assignee = g.Key,
                total = g.Count(),
                completed = g.Count(t => t.CrmTaskStatus != null && t.CrmTaskStatus.IsTerminal),
                overdue = g.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate.HasValue && t.DueDate.Value < now)
            })
            .OrderByDescending(g => g.total)
            .ToList();

        var items = allTasks.Select(t =>
        {
            var isTerminal = t.CrmTaskStatus?.IsTerminal ?? false;
            var isOverdue = !isTerminal && t.DueDate.HasValue && t.DueDate.Value < now;
            var isDueToday = !isTerminal && t.DueDate.HasValue && t.DueDate.Value.Date == now.Date;

            return new
            {
                crmTaskId = t.CrmTaskId,
                title = t.Title,
                description = t.Description,
                dueDate = t.DueDate,
                createdAt = t.CreatedAt,
                statusName = t.CrmTaskStatus?.Name ?? "Pending",
                isTerminal = isTerminal,
                isOverdue = isOverdue,
                isDueToday = isDueToday,
                assignedToName = t.AssignedTo?.Name ?? "Unassigned",
                customerName = t.Customer != null ? $"{t.Customer.FirstName} {t.Customer.LastName}".Trim() : null,
                customerId = t.CustomerId,
                leadName = t.Lead != null ? $"{t.Lead.FirstName} {t.Lead.LastName}".Trim() : null,
                leadId = t.LeadId,
                opportunityTitle = t.Opportunity?.Title,
                opportunityId = t.OpportunityId
            };
        }).ToList();

        return Ok(new
        {
            total,
            completed,
            pending,
            inProgress,
            overdue,
            dueToday,
            completionRate,
            byStatus,
            byAssignee,
            items
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 11. TEAM PERFORMANCE REPORTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("team")]
    [HttpGet("rep-performance")]
    public async Task<IActionResult> GetTeamPerformanceReports(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string scope = "company",
        [FromQuery] string? search = null)
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);
        var now = DateTime.UtcNow;

        // Fetch active sales team members
        var usersQuery = _db.Identities.Include(i => i.Role).AsQueryable();
        if (!isAdmin)
        {
            if (isManager && userId.HasValue)
                usersQuery = usersQuery.Where(u => u.IdentityId == userId.Value || u.ManagerId == userId.Value);
            else if (userId.HasValue)
                usersQuery = usersQuery.Where(u => u.IdentityId == userId.Value);
        }

        var users = await usersQuery.ToListAsync();

        // Aggregate actual database metrics per rep
        var opps = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => (o.Customer == null || !o.Customer.IsDeleted))
            .ToListAsync();

        var leads = await _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => !l.IsDeleted && l.AssignedRepId.HasValue)
            .ToListAsync();

        var activities = await _db.Activities.ToListAsync();
        var tasks = await _db.CrmTasks.Include(t => t.CrmTaskStatus).ToListAsync();
        var payments = await _db.Payments.Where(p => !p.IsDeleted && (p.Status == "Completed" || p.Status == "Paid")).ToListAsync();

        var reps = users.Select(user =>
        {
            var repId = user.IdentityId;
            var repLeads = leads.Where(l => l.AssignedRepId == repId).ToList();
            var repOpps = opps.Where(o => o.OwnerId == repId).ToList();
            var repWonOpps = repOpps.Where(o => o.OpportunityStage != null && o.OpportunityStage.IsWon).ToList();
            var repLostOpps = repOpps.Where(o => o.OpportunityStage != null && o.OpportunityStage.IsLost).ToList();
            var repOpenOpps = repOpps.Where(o => o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)).ToList();
            var repActivities = activities.Where(a => a.CreatedById == repId).ToList();
            var repTasks = tasks.Where(t => t.AssignedToId == repId).ToList();
            var repPayments = payments.Where(p => p.CreatedById == repId).ToList();

            var leadsHandled = repLeads.Count;
            var leadsConverted = repLeads.Count(l => l.ConvertedCustomerId != null || (l.LeadStatus != null && l.LeadStatus.Name == "Converted"));
            var leadConversionRate = leadsHandled > 0 ? Math.Round((double)leadsConverted / leadsHandled * 100, 1) : 0.0;

            var oppsHandled = repOpps.Count;
            var dealsWon = repWonOpps.Count;
            var dealsLost = repLostOpps.Count;
            var closedTotal = dealsWon + dealsLost;
            var winRate = closedTotal > 0 ? Math.Round((double)dealsWon / closedTotal * 100, 1) : 0.0;

            var revenueWon = (double)repWonOpps.Sum(o => o.EstimatedValue);
            var openPipelineValue = (double)repOpenOpps.Sum(o => o.EstimatedValue);
            var activitiesCompleted = repActivities.Count;
            var tasksCompleted = repTasks.Count(t => t.CrmTaskStatus != null && t.CrmTaskStatus.IsTerminal);
            var tasksOverdue = repTasks.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate.HasValue && t.DueDate.Value < now);

            return new
            {
                repId = repId,
                repName = user.Name,
                email = user.Email,
                role = user.Role?.Name ?? "Sales Rep",
                leadsHandled,
                leadsConverted,
                leadConversionRate,
                oppsHandled,
                dealsWon,
                dealsLost,
                winRate,
                revenueWon,
                revenueGenerated = revenueWon,
                openPipelineValue,
                openPipeline = openPipelineValue,
                activitiesCompleted,
                activitiesLogged = activitiesCompleted,
                tasksCompleted,
                tasksOverdue,
                avgTouchpointsPerLead = leadsHandled > 0 ? Math.Round((double)activitiesCompleted / leadsHandled, 1) : activitiesCompleted
            };
        })
        .OrderByDescending(r => r.revenueWon)
        .ToList();

        var totalTeamRevenue = reps.Sum(r => r.revenueWon);
        var totalDealsWon = reps.Sum(r => r.dealsWon);
        var overallWinRate = reps.Sum(r => r.dealsWon + r.dealsLost) > 0
            ? Math.Round((double)totalDealsWon / reps.Sum(r => r.dealsWon + r.dealsLost) * 100, 1)
            : 0.0;

        return Ok(new
        {
            totalReps = reps.Count,
            totalTeamRevenue,
            totalDealsWon,
            overallWinRate,
            reps
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BACKWARD-COMPATIBLE ENDPOINTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("pipeline-by-stage")]
    public async Task<IActionResult> GetPipelineByStage(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var (isAdmin, isManager, userId) = GetScope(scope);

        var query = _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => (o.Customer == null || !o.Customer.IsDeleted) && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)) && (isAdmin || o.OwnerId == userId || (isManager && o.Owner != null && o.Owner.ManagerId == userId)));

        var results = await query
            .GroupBy(o => new { o.OpportunityStageId, StageName = o.OpportunityStage != null ? o.OpportunityStage.Name : "No Stage" })
            .Select(g => new { Stage = g.Key.StageName, Value = (double)g.Sum(o => o.EstimatedValue), Count = g.Count() })
            .ToListAsync();

        return Ok(results);
    }

    [HttpGet("win-rate")]
    public async Task<IActionResult> GetWinRate(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);

        var query = _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => (o.Customer == null || !o.Customer.IsDeleted) && o.OpportunityStage != null && (o.OpportunityStage!.IsWon || o.OpportunityStage!.IsLost) && (isAdmin || o.OwnerId == userId || (isManager && o.Owner != null && o.Owner.ManagerId == userId)));

        if (startDate.HasValue) query = query.Where(o => (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) >= start);
        if (endDate.HasValue) query = query.Where(o => (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) <= end);

        var closedOpps = await query
            .Select(o => new { Date = o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt, IsWon = o.OpportunityStage!.IsWon })
            .ToListAsync();

        var groupedByMonth = closedOpps
            .GroupBy(o => o.Date.ToString("yyyy-MM"))
            .Select(g => new
            {
                Month = g.Key,
                Won = g.Count(x => x.IsWon),
                Total = g.Count(),
                WinRate = g.Count() > 0 ? (double)g.Count(x => x.IsWon) / g.Count() * 100 : 0
            })
            .OrderBy(x => x.Month)
            .ToList();

        var overallWon = closedOpps.Count(x => x.IsWon);
        var overallTotal = closedOpps.Count;
        var overallWinRate = overallTotal > 0 ? (double)overallWon / overallTotal * 100 : 0;

        return Ok(new { OverallWinRate = overallWinRate, ByMonth = groupedByMonth });
    }

    [HttpGet("time-per-stage")]
    public async Task<IActionResult> GetTimePerStage(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);

        var query = _db.StageHistories
            .Include(sh => sh.OldStage)
            .Include(sh => sh.NewStage)
            .Include(sh => sh.Opportunity)
            .Where(sh => (sh.Opportunity == null || sh.Opportunity.Customer == null || !sh.Opportunity.Customer.IsDeleted) && (isAdmin || sh.Opportunity.OwnerId == userId || (isManager && sh.Opportunity.Owner != null && sh.Opportunity.Owner.ManagerId == userId)))
            .AsQueryable();

        if (startDate.HasValue) query = query.Where(sh => sh.ChangedAt >= start);
        if (endDate.HasValue) query = query.Where(sh => sh.ChangedAt <= end);

        var allHistories = await query
            .OrderBy(sh => sh.OpportunityId)
            .ThenBy(sh => sh.ChangedAt)
            .ToListAsync();

        var stageDurations = new Dictionary<string, List<double>>();
        foreach (var group in allHistories.GroupBy(sh => sh.OpportunityId))
        {
            var oppHistories = group.ToList();
            for (int i = 0; i < oppHistories.Count; i++)
            {
                var current = oppHistories[i];
                var oldStageName = current.OldStage?.Name;
                if (oldStageName == null) continue;
                var previous = i > 0 ? oppHistories[i - 1] : null;
                var startTime = previous?.ChangedAt ?? current.Opportunity?.CreatedAt ?? current.ChangedAt;
                var duration = (current.ChangedAt - startTime).TotalDays;
                if (!stageDurations.ContainsKey(oldStageName))
                    stageDurations[oldStageName] = new List<double>();
                stageDurations[oldStageName].Add(duration);
            }
        }

        var results = stageDurations.Select(kvp => new
        {
            Stage = kvp.Key,
            AverageDays = kvp.Value.Any() ? kvp.Value.Average() : 0,
            Transitions = kvp.Value.Count
        }).ToList();

        return Ok(results);
    }

    [HttpGet("lead-source")]
    public async Task<IActionResult> GetLeadSourceBreakdown(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);

        var query = _db.Leads
            .Include(l => l.Source)
            .Where(l => !l.IsDeleted && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep != null && l.AssignedRep.ManagerId == userId)));

        if (startDate.HasValue) query = query.Where(l => l.CreatedAt >= start);
        if (endDate.HasValue) query = query.Where(l => l.CreatedAt <= end);

        var leadList = await query
            .Select(l => new { SourceName = l.Source != null ? l.Source.Name : "Direct" })
            .ToListAsync();

        var results = leadList
            .GroupBy(l => l.SourceName)
            .Select(g => new { Source = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToList();

        return Ok(results);
    }

    [HttpGet("funnel")]
    public async Task<IActionResult> GetLeadFunnel(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);

        var leads = await _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => !l.IsDeleted && (l.CreatedAt >= start && l.CreatedAt <= end || (l.ConvertedAt.HasValue && l.ConvertedAt.Value >= start && l.ConvertedAt.Value <= end)) && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep != null && l.AssignedRep.ManagerId == userId)))
            .Select(l => new { StatusName = l.LeadStatus != null ? l.LeadStatus.Name : "New", IsTerminal = l.LeadStatus != null && l.LeadStatus.IsTerminal })
            .ToListAsync();

        var pipelineLostCount = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => (o.Customer == null || !o.Customer.IsDeleted) && o.OpportunityStage != null && o.OpportunityStage.IsLost
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) >= start
                     && (o.ActualCloseDate ?? o.UpdatedAt ?? o.CreatedAt) <= end
                     && (isAdmin || o.OwnerId == userId || (isManager && o.Owner != null && o.Owner.ManagerId == userId)))
            .CountAsync();

        var total = leads.Count;
        var converted = leads.Count(l => l.StatusName == "Converted");
        var leadLost = leads.Count(l => l.IsTerminal && l.StatusName != "Converted");
        var lost = leadLost + pipelineLostCount;
        var active = leads.Count(l => !l.IsTerminal);
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

    [HttpGet("lead-priority")]
    public async Task<IActionResult> GetLeadPriorityBreakdown(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);

        var query = _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => !l.IsDeleted && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep != null && l.AssignedRep.ManagerId == userId)));

        if (startDate.HasValue) query = query.Where(l => l.CreatedAt >= start && l.CreatedAt <= end);

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

    [HttpGet("followup-sla")]
    public async Task<IActionResult> GetFollowUpSlaHealth(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string scope = "company")
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);
        var now = DateTime.UtcNow;
        var today = now.Date;

        var query = _db.Leads
            .Include(l => l.LeadStatus)
            .Where(l => !l.IsDeleted && (l.LeadStatus == null || !l.LeadStatus.IsTerminal) && (isAdmin || l.AssignedRepId == userId || (isManager && l.AssignedRep != null && l.AssignedRep.ManagerId == userId)));

        if (startDate.HasValue) query = query.Where(l => l.CreatedAt >= start && l.CreatedAt <= end);

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

    // ══════════════════════════════════════════════════════════════════════════
    // 12. SYSTEM HISTORY & AUDIT TRAIL REPORTS
    // ══════════════════════════════════════════════════════════════════════════
    [HttpGet("system-history")]
    public async Task<IActionResult> GetSystemHistoryReports(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string scope = "company",
        [FromQuery] string? module = null,
        [FromQuery] string? action = null,
        [FromQuery] int? userIdParam = null,
        [FromQuery] string? search = null)
    {
        var (isAdmin, isManager, userId) = GetScope(scope);
        var (start, end) = NormalizeDateRange(startDate, endDate);

        var query = _db.AuditLogs
            .Include(a => a.EntityType)
            .Include(a => a.AuditActionType)
            .Include(a => a.ChangedBy)
            .Where(a => !a.IsDeleted && (isAdmin || isManager || a.ChangedById == userId))
            .AsQueryable();

        if (startDate.HasValue) query = query.Where(a => a.ChangedAt >= start);
        if (endDate.HasValue) query = query.Where(a => a.ChangedAt <= end);

        if (!string.IsNullOrWhiteSpace(module) && module != "All" && module != "all")
            query = query.Where(a => a.EntityType != null && a.EntityType.Name == module);

        if (!string.IsNullOrWhiteSpace(action) && action != "All" && action != "all")
            query = query.Where(a => a.AuditActionType != null && a.AuditActionType.Name == action);

        if (userIdParam.HasValue && userIdParam.Value > 0)
            query = query.Where(a => a.ChangedById == userIdParam.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(a => (a.EntityType != null && a.EntityType.Name.ToLower().Contains(s))
                || (a.AuditActionType != null && a.AuditActionType.Name.ToLower().Contains(s))
                || (a.ChangedBy != null && a.ChangedBy.Name.ToLower().Contains(s))
                || (a.FieldName != null && a.FieldName.ToLower().Contains(s))
                || (a.OldValue != null && a.OldValue.ToLower().Contains(s))
                || (a.NewValue != null && a.NewValue.ToLower().Contains(s)));
        }

        var allLogs = await query.OrderByDescending(a => a.ChangedAt).Take(2000).ToListAsync();

        var totalEvents = allLogs.Count;
        var createdCount = allLogs.Count(a => (a.AuditActionType != null && (a.AuditActionType.Name.Contains("Insert") || a.AuditActionType.Name.Contains("Create"))));
        var updatedCount = allLogs.Count(a => (a.AuditActionType != null && (a.AuditActionType.Name.Contains("Update") || a.AuditActionType.Name.Contains("Modify"))));
        var deletedCount = allLogs.Count(a => (a.AuditActionType != null && a.AuditActionType.Name.Contains("Delete")));
        var loginCount = allLogs.Count(a => (a.EntityType != null && a.EntityType.Name.Contains("Auth")) || (a.AuditActionType != null && a.AuditActionType.Name.Contains("Login")));

        var byModule = allLogs
            .GroupBy(a => a.EntityType != null ? a.EntityType.Name : "Other")
            .Select(g => new { module = g.Key, count = g.Count(), percentage = totalEvents > 0 ? Math.Round((double)g.Count() / totalEvents * 100, 1) : 0 })
            .OrderByDescending(x => x.count)
            .ToList();

        var byAction = allLogs
            .GroupBy(a => a.AuditActionType != null ? a.AuditActionType.Name : "Action")
            .Select(g => new { action = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        var byUser = allLogs
            .GroupBy(a => new { a.ChangedById, Name = a.ChangedBy != null ? a.ChangedBy.Name : "System", Email = a.ChangedBy != null ? a.ChangedBy.Email : "" })
            .Select(g => new { userId = g.Key.ChangedById, name = g.Key.Name, email = g.Key.Email, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(10)
            .ToList();

        var timeline = allLogs
            .GroupBy(a => a.ChangedAt.ToString("yyyy-MM-dd"))
            .OrderBy(g => g.Key)
            .Select(g => new { date = g.Key, count = g.Count() })
            .ToList();

        var items = allLogs.Select(a => new
        {
            auditLogId = a.AuditLogId,
            entityTypeId = a.EntityTypeId,
            entityTypeName = a.EntityType != null ? a.EntityType.Name : "Unknown",
            entityId = a.EntityId,
            fieldName = a.FieldName,
            oldValue = a.OldValue,
            newValue = a.NewValue,
            auditActionTypeId = a.AuditActionTypeId,
            auditActionTypeName = a.AuditActionType != null ? a.AuditActionType.Name : "Unknown",
            changedById = a.ChangedById,
            changedByName = a.ChangedBy != null ? a.ChangedBy.Name : "Unknown",
            changedByEmail = a.ChangedBy != null ? a.ChangedBy.Email : null,
            changedAt = a.ChangedAt
        }).ToList();

        return Ok(new
        {
            totalEvents,
            createdCount,
            updatedCount,
            deletedCount,
            loginCount,
            byModule,
            byAction,
            byUser,
            timeline,
            items
        });
    }
}
