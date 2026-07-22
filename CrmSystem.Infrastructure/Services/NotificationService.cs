using CrmSystem.Domain.Dtos.Notification;
using CrmSystem.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

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

    public async Task<int> GetUnreadCountAsync(int identityId)
    {
        return await _db.Notifications
            .CountAsync(n => n.IdentityId == identityId && !n.IsRead);
    }

    public async Task MarkReadAsync(int notificationId, int identityId)
    {
        var n = await _db.Notifications
            .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.IdentityId == identityId);
        if (n is null) return;
        n.IsRead = true;
        await _db.SaveChangesAsync();
    }

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

    /// <summary>
    /// Idempotent — safe to call on every background tick.
    /// Generates TaskDue (due today), TaskOverdue, and OpportunityStalled notifications
    /// only if a matching notification was not already created today.
    /// </summary>
    public async Task GenerateAsync()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var stalledThreshold = DateTime.UtcNow.AddDays(-14);

        // Resolve notification type IDs
        var types = await _db.NotificationTypes.ToListAsync();
        int? taskDueTypeId = types.FirstOrDefault(t => t.Name == "TaskDue")?.NotificationTypeId;
        int? taskOverdueTypeId = types.FirstOrDefault(t => t.Name == "TaskOverdue")?.NotificationTypeId;
        int? stalledTypeId = types.FirstOrDefault(t => t.Name == "OpportunityStalled")?.NotificationTypeId;

        var allUsers = await _db.Identities.Select(i => i.IdentityId).ToListAsync();

        // ── Task Due Today ───────────────────────────────────────────────────
        if (taskDueTypeId.HasValue)
        {
            var dueTodayTasks = await _db.CrmTasks
                .Include(t => t.CrmTaskStatus)
                .Where(t => t.DueDate.HasValue
                         && t.DueDate.Value.Date == today
                         && t.DueDate.Value <= now
                         && t.AssignedToId.HasValue
                         && (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal))
                .ToListAsync();

            foreach (var task in dueTodayTasks)
            {
                var alreadyExists = await _db.Notifications.AnyAsync(n =>
                    n.RelatedTaskId == task.CrmTaskId
                    && n.NotificationTypeId == taskDueTypeId.Value
                    && n.CreatedAt.Date == today);

                if (!alreadyExists)
                {
                    _db.Notifications.Add(new Notification
                    {
                        IdentityId = task.AssignedToId!.Value,
                        NotificationTypeId = taskDueTypeId.Value,
                        Message = $"Task due today: {task.Title}",
                        RelatedTaskId = task.CrmTaskId,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        // ── Task Overdue ─────────────────────────────────────────────────────
        if (taskOverdueTypeId.HasValue)
        {
            var overdueTasks = await _db.CrmTasks
                .Include(t => t.CrmTaskStatus)
                .Where(t => t.DueDate.HasValue
                         && t.DueDate.Value < now
                         && t.AssignedToId.HasValue
                         && (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal))
                .ToListAsync();

            foreach (var task in overdueTasks)
            {
                var alreadyExists = await _db.Notifications.AnyAsync(n =>
                    n.RelatedTaskId == task.CrmTaskId
                    && n.NotificationTypeId == taskOverdueTypeId.Value
                    && n.CreatedAt.Date == today);

                if (!alreadyExists)
                {
                    _db.Notifications.Add(new Notification
                    {
                        IdentityId = task.AssignedToId!.Value,
                        NotificationTypeId = taskOverdueTypeId.Value,
                        Message = $"Overdue task: {task.Title} (was due {task.DueDate!.Value:MMM d})",
                        RelatedTaskId = task.CrmTaskId,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        // ── Opportunity Stalled ──────────────────────────────────────────────
        if (stalledTypeId.HasValue)
        {
            var stalledOpps = await _db.Opportunities
                .Where(o => o.UpdatedAt < stalledThreshold)
                .ToListAsync();

            foreach (var opp in stalledOpps)
            {
                var alreadyExists = await _db.Notifications.AnyAsync(n =>
                    n.RelatedOpportunityId == opp.OpportunityId
                    && n.NotificationTypeId == stalledTypeId.Value
                    && n.CreatedAt.Date == today);

                if (!alreadyExists)
                {
                    _db.Notifications.Add(new Notification
                    {
                        IdentityId = opp.OwnerId,
                        NotificationTypeId = stalledTypeId.Value,
                        Message = $"Opportunity stalled: \"{opp.Title}\" — no update in 14 days",
                        RelatedOpportunityId = opp.OpportunityId,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        await _db.SaveChangesAsync();
    }

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
        CreatedAt = n.CreatedAt
    };
}
