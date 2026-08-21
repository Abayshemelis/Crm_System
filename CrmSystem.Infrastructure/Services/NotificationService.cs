using CrmSystem.Domain.Dtos.Notification;
using CrmSystem.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Infrastructure.Services;

// ── ARCHITECTURAL ADAPTER INTERFACE ───────────────────────────────────────────
// Problem: NotificationService lives in CrmSystem.Infrastructure, but SignalR NotificationHub
// lives in CrmSystem.Api. A direct reference from Infrastructure to Api causes a Circular Dependency.
// Solution: We declare this INotificationHubContext interface in Infrastructure, and implement it
// with an Adapter in CrmSystem.Api (Dependency Inversion Principle).
public interface INotificationHubContext
{
    Task PushToUserGroupAsync(string groupName, string message, string type);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    private readonly INotificationHubContext _hub;

    public NotificationService(AppDbContext db, INotificationHubContext hub)
    {
        _db = db;
        _hub = hub;
    }

    // ── 1. GET USER NOTIFICATIONS ─────────────────────────────────────────────
    // Fetches the most recent 30 notifications for a specific user with related task/opportunity details.
    public async Task<IReadOnlyList<NotificationReadDto>> GetForUserAsync(int identityId)
    {
        var list = await _db.Notifications
            .Include(n => n.NotificationType)
            .Include(n => n.RelatedTask)
            .Include(n => n.RelatedOpportunity)
            .Where(n => n.IdentityId == identityId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(30)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    // ── 2. GET UNREAD COUNT ───────────────────────────────────────────────────
    // Fast count query for the notification bell badge counter in the top navigation bar.
    public async Task<int> GetUnreadCountAsync(int identityId)
    {
        return await _db.Notifications
            .CountAsync(n => n.IdentityId == identityId && !n.IsRead);
    }

    // ── 3. MARK SINGLE NOTIFICATION READ ──────────────────────────────────────
    public async Task MarkReadAsync(int notificationId, int identityId)
    {
        var n = await _db.Notifications
            .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.IdentityId == identityId);
        if (n is null) return;
        n.IsRead = true;
        await _db.SaveChangesAsync();
    }

    // ── 4. MARK ALL NOTIFICATIONS READ ────────────────────────────────────────
    public async Task MarkAllReadAsync(int identityId)
    {
        var unread = await _db.Notifications
            .Where(n => n.IdentityId == identityId && !n.IsRead)
            .ToListAsync();

        foreach (var n in unread)
            n.IsRead = true;

        if (unread.Count > 0)
            await _db.SaveChangesAsync();
    }

    // ── 5. CORE NOTIFICATION GENERATOR (IDEMPOTENT ENGINE) ────────────────────
    // Evaluates database records to detect:
    // - Tasks Due Today: DueDate is within today's UTC calendar day
    // - Overdue Tasks: DueDate is in the past and task is not completed
    // - Stalled Opportunities: Open deals with no updates for over 14 days
    // Safe to run repeatedly because it checks for duplicates within the current day.
    public async Task GenerateAsync()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var tomorrow = today.AddDays(1);
        var stalledThreshold = now.AddDays(-14);

        // Helper to resolve or seed NotificationType
        async Task<int> GetOrCreateTypeAsync(string name)
        {
            var t = await _db.NotificationTypes.FirstOrDefaultAsync(x => x.Name == name);
            if (t == null)
            {
                t = new NotificationType { Name = name, DefaultChannel = "InApp" };
                _db.NotificationTypes.Add(t);
                await _db.SaveChangesAsync();
            }
            return t.NotificationTypeId;
        }

        int taskDueTypeId = await GetOrCreateTypeAsync("TaskDue");
        int taskOverdueTypeId = await GetOrCreateTypeAsync("TaskOverdue");
        int stalledTypeId = await GetOrCreateTypeAsync("OpportunityStalled");
        int followUpOverdueTypeId = await GetOrCreateTypeAsync("FollowUpOverdue");
        int followUpDueTypeId = await GetOrCreateTypeAsync("FollowUpDue");

        // Clean up any test/dummy notifications from the database
        var testNotifs = await _db.Notifications
            .Where(n => n.Message.Contains("Test notification") || n.Message.Contains("seed-test"))
            .ToListAsync();
        if (testNotifs.Count > 0)
        {
            _db.Notifications.RemoveRange(testNotifs);
            await _db.SaveChangesAsync();
        }

        // Fetch all active Admins and Managers so notifications are always visible to supervisory staff
        var adminAndManagerIds = await _db.Identities
            .Include(i => i.Role)
            .Include(i => i.IdentityRoles).ThenInclude(ir => ir.Role)
            .Where(i => i.IsActive && (
                (i.Role != null && (i.Role.Name == "Admin" || i.Role.Name == "Manager")) ||
                i.IdentityRoles.Any(ir => ir.Role != null && (ir.Role.Name == "Admin" || ir.Role.Name == "Manager"))))
            .Select(i => i.IdentityId)
            .ToListAsync();

        var newNotificationsList = new List<(int IdentityId, string Message)>();

        // ── 5A. Tasks & Follow-ups Due Today (today <= DueDate < tomorrow) ────
        var dueTodayTasks = await _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Include(t => t.Lead)
            .Where(t => t.DueDate.HasValue
                     && t.DueDate.Value >= today
                     && t.DueDate.Value < tomorrow
                     && (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal))
            .ToListAsync();

        foreach (var task in dueTodayTasks)
        {
            var recipientIds = new HashSet<int>();
            if (task.AssignedToId.HasValue && task.AssignedToId.Value > 0)
                recipientIds.Add(task.AssignedToId.Value);
            if (task.Lead != null && task.Lead.AssignedRepId.HasValue && task.Lead.AssignedRepId.Value > 0)
                recipientIds.Add(task.Lead.AssignedRepId.Value);
            if (task.CreatedById > 0)
                recipientIds.Add(task.CreatedById);

            foreach (var adminId in adminAndManagerIds)
                recipientIds.Add(adminId);

            if (recipientIds.Count == 0) continue;

            bool isFollowUp = task.LeadId.HasValue || task.Title.StartsWith("Follow-up", StringComparison.OrdinalIgnoreCase);
            int notifTypeId = isFollowUp ? followUpDueTypeId : taskDueTypeId;

            string msg = isFollowUp && task.Lead != null
                ? $"Follow-up due today: {task.Lead.FirstName} {task.Lead.LastName} ({task.Title})"
                : $"Task due today: {task.Title}";

            foreach (var userId in recipientIds)
            {
                // De-duplication check: avoid sending multiple due today alerts on the same calendar day
                var alreadyExists = await _db.Notifications.AnyAsync(n =>
                    n.IdentityId == userId
                    && n.RelatedTaskId == task.CrmTaskId
                    && (n.NotificationTypeId == taskDueTypeId || n.NotificationTypeId == followUpDueTypeId)
                    && n.CreatedAt >= today
                    && n.CreatedAt < tomorrow);

                if (!alreadyExists)
                {
                    _db.Notifications.Add(new Notification
                    {
                        IdentityId = userId,
                        NotificationTypeId = notifTypeId,
                        Message = msg,
                        RelatedTaskId = task.CrmTaskId,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                    newNotificationsList.Add((userId, msg));
                }
            }
        }

        // ── 5B. Overdue Tasks & Follow-ups (DueDate < today) ──────────────────
        var overdueTasks = await _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Include(t => t.Lead)
            .Where(t => t.DueDate.HasValue
                     && t.DueDate.Value < today
                     && (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal))
            .ToListAsync();

        foreach (var task in overdueTasks)
        {
            var recipientIds = new HashSet<int>();
            if (task.AssignedToId.HasValue && task.AssignedToId.Value > 0)
                recipientIds.Add(task.AssignedToId.Value);
            if (task.Lead != null && task.Lead.AssignedRepId.HasValue && task.Lead.AssignedRepId.Value > 0)
                recipientIds.Add(task.Lead.AssignedRepId.Value);
            if (task.CreatedById > 0)
                recipientIds.Add(task.CreatedById);

            foreach (var adminId in adminAndManagerIds)
                recipientIds.Add(adminId);

            if (recipientIds.Count == 0) continue;

            bool isFollowUp = task.LeadId.HasValue || task.Title.StartsWith("Follow-up", StringComparison.OrdinalIgnoreCase);
            int notifTypeId = isFollowUp ? followUpOverdueTypeId : taskOverdueTypeId;

            string msg = isFollowUp && task.Lead != null
                ? $"⚠️ Follow-up overdue: {task.Lead.FirstName} {task.Lead.LastName} ({task.Title}) was due on {task.DueDate:MMM d}"
                : $"⚠️ Task overdue: {task.Title} was due on {task.DueDate:MMM d}";

            foreach (var userId in recipientIds)
            {
                var alreadyExists = await _db.Notifications.AnyAsync(n =>
                    n.IdentityId == userId
                    && n.RelatedTaskId == task.CrmTaskId
                    && (n.NotificationTypeId == taskOverdueTypeId || n.NotificationTypeId == followUpOverdueTypeId)
                    && n.CreatedAt >= today
                    && n.CreatedAt < tomorrow);

                if (!alreadyExists)
                {
                    _db.Notifications.Add(new Notification
                    {
                        IdentityId = userId,
                        NotificationTypeId = notifTypeId,
                        Message = msg,
                        RelatedTaskId = task.CrmTaskId,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                    newNotificationsList.Add((userId, msg));
                }
            }
        }

        // ── 5C. Stalled Opportunities (No updates in > 14 days) ───────────────
        var stalledOpps = await _db.Opportunities
            .Include(o => o.OpportunityStage)
            .Where(o => o.UpdatedAt < stalledThreshold
                     && (o.OpportunityStage == null || (!o.OpportunityStage.IsWon && !o.OpportunityStage.IsLost)))
            .ToListAsync();

        foreach (var opp in stalledOpps)
        {
            var recipientIds = new HashSet<int>();
            if (opp.OwnerId > 0) recipientIds.Add(opp.OwnerId);
            foreach (var adminId in adminAndManagerIds) recipientIds.Add(adminId);

            var msg = $"Opportunity stalled: \"{opp.Title}\" — no update in 14 days";

            foreach (var userId in recipientIds)
            {
                var alreadyExists = await _db.Notifications.AnyAsync(n =>
                    n.IdentityId == userId
                    && n.RelatedOpportunityId == opp.OpportunityId
                    && n.NotificationTypeId == stalledTypeId
                    && n.CreatedAt >= today
                    && n.CreatedAt < tomorrow);

                if (!alreadyExists)
                {
                    _db.Notifications.Add(new Notification
                    {
                        IdentityId = userId,
                        NotificationTypeId = stalledTypeId,
                        Message = msg,
                        RelatedOpportunityId = opp.OpportunityId,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                    newNotificationsList.Add((userId, msg));
                }
            }
        }

        // Step 5D: Save new notifications to DB and push real-time SignalR notifications
        if (newNotificationsList.Count > 0)
        {
            await _db.SaveChangesAsync();

            foreach (var (identityId, message) in newNotificationsList)
            {
                await _hub.PushToUserGroupAsync($"user_{identityId}", message, "warning");
            }
        }
    }

    // ── 6. CREATE CUSTOM NOTIFICATION ─────────────────────────────────────────
    public async Task CreateNotificationAsync(int identityId, string typeName, string message, int? taskId = null, int? opportunityId = null)
    {
        var type = await _db.NotificationTypes.FirstOrDefaultAsync(t => t.Name == typeName);
        if (type == null)
        {
            type = await _db.NotificationTypes.FirstOrDefaultAsync();
        }
        if (type == null) return;

        var notif = new Notification
        {
            IdentityId = identityId,
            NotificationTypeId = type.NotificationTypeId,
            Message = message,
            RelatedTaskId = taskId,
            RelatedOpportunityId = opportunityId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Notifications.Add(notif);
        await _db.SaveChangesAsync();

        // Push real-time notification via SignalR
        await PushToUserAsync(identityId, message);
    }

    // ── 7. PUSH NOTIFICATION VIA SIGNALR ──────────────────────────────────────
    public async Task PushToUserAsync(int identityId, string message, string type = "info")
    {
        await _hub.PushToUserGroupAsync($"user_{identityId}", message, type);
    }

    // ── 8. DTO MAPPER HELPER ──────────────────────────────────────────────────
    private static NotificationReadDto MapToDto(Notification n) => new()
    {
        NotificationId = n.NotificationId,
        Message = n.Message,
        NotificationTypeId = n.NotificationTypeId,
        TypeName = n.NotificationType?.Name ?? string.Empty,
        IsRead = n.IsRead,
        RelatedTaskId = n.RelatedTaskId,
        RelatedTaskTitle = n.RelatedTask?.Title,
        RelatedOpportunityId = n.RelatedOpportunityId,
        RelatedOpportunityTitle = n.RelatedOpportunity?.Title,
        CreatedAt = DateTime.SpecifyKind(n.CreatedAt, DateTimeKind.Utc)
    };
}
