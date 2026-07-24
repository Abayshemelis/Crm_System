using CrmSystem.Domain.Dtos.Activity;
using CrmSystem.Domain.Dtos.Task;
using CrmSystem.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Infrastructure.Services;

public class TaskService : ITaskService
{
    private readonly AppDbContext _db;

    public TaskService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<TaskGroupedDto> GetMyTasksAsync(int identityId)
        => await GetByAssigneeAsync(identityId);

    public async Task<TaskGroupedDto> GetByAssigneeAsync(int assigneeId)
    {
        var now = DateTime.UtcNow;
        var tasks = await GetActiveTasksQuery()
            .Where(t => t.AssignedToId == assigneeId)
            .OrderBy(t => t.DueDate)
            .ToListAsync();

        return GroupTasks(tasks, now);
    }

    public async Task<IReadOnlyList<TaskReadDto>> GetByCustomerAsync(int customerId)
    {
        var linkedLeadIds = await _db.Leads
            .Where(l => l.ConvertedCustomerId == customerId)
            .Select(l => l.LeadId)
            .ToListAsync();

        var tasks = await GetAllTasksQuery()
            .Where(t => t.CustomerId == customerId || (t.LeadId.HasValue && linkedLeadIds.Contains(t.LeadId.Value)))
            .OrderBy(t => t.DueDate)
            .ToListAsync();
        return tasks.DistinctBy(t => t.CrmTaskId).Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<TaskReadDto>> GetByOpportunityAsync(int opportunityId)
    {
        var lead = await _db.Leads
            .Where(l => l.ConvertedOpportunityId == opportunityId)
            .Select(l => new { l.LeadId, l.ConvertedCustomerId })
            .FirstOrDefaultAsync();

        int? leadId = lead?.LeadId;
        int? custId = lead?.ConvertedCustomerId;

        var tasks = await GetAllTasksQuery()
            .Where(t => t.OpportunityId == opportunityId ||
                        (leadId.HasValue && t.LeadId == leadId.Value) ||
                        (custId.HasValue && t.CustomerId == custId.Value))
            .OrderBy(t => t.DueDate)
            .ToListAsync();
        return tasks.DistinctBy(t => t.CrmTaskId).Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<TaskReadDto>> GetByLeadAsync(int leadId)
    {
        var tasks = await GetAllTasksQuery()
            .Where(t => t.LeadId == leadId)
            .OrderBy(t => t.DueDate)
            .ToListAsync();
        return tasks.DistinctBy(t => t.CrmTaskId).Select(MapToDto).ToList();
    }

    public async Task<List<CalendarDayDto>> GetCalendarAsync(int year, int month, int? assignedToId)
    {
        var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1);

        var query = GetActiveTasksQuery()
            .Where(t => t.DueDate.HasValue && t.DueDate.Value >= start && t.DueDate.Value < end);

        if (assignedToId.HasValue)
            query = query.Where(t => t.AssignedToId == assignedToId.Value);

        var tasks = await query.OrderBy(t => t.DueDate).ToListAsync();

        var daysInMonth = DateTime.DaysInMonth(year, month);
        return Enumerable.Range(1, daysInMonth).Select(day =>
        {
            var dayTasks = tasks
                .Where(t => t.DueDate!.Value.Day == day)
                .Select(MapToDto)
                .ToList();
            return new CalendarDayDto { Day = day, TaskCount = dayTasks.Count, Tasks = dayTasks };
        }).ToList();
    }

    public async Task<TaskReadDto> CreateAsync(TaskCreateDto dto, int createdById)
    {
        int statusId = await ResolveTaskStatusIdAsync(dto.CrmTaskStatusId);

        var entity = new CrmTask
        {
            Title = dto.Title,
            Description = dto.Description,
            DueDate = dto.DueDate,
            CrmTaskStatusId = statusId,
            CustomerId = dto.CustomerId,
            OpportunityId = dto.OpportunityId,
            LeadId = dto.LeadId,
            ActivityId = dto.ActivityId,
            AssignedToId = dto.AssignedToId ?? createdById,
            CreatedById = createdById,
            CreatedAt = DateTime.UtcNow
        };

        _db.CrmTasks.Add(entity);
        await _db.SaveChangesAsync();

        // Create an activity for the task creation
        if (entity.CustomerId.HasValue || entity.OpportunityId.HasValue || entity.LeadId.HasValue)
        {
            // Find or create a "Task Created" activity type
            var taskCreatedType = await _db.ActivityTypes
                .FirstOrDefaultAsync(at => at.Name == "Task Created");

            if (taskCreatedType == null)
            {
                taskCreatedType = new ActivityType
                {
                    Name = "Task Created",
                    Icon = "📋"
                };
                _db.ActivityTypes.Add(taskCreatedType);
                await _db.SaveChangesAsync();
            }

            var activity = new Activity
            {
                ActivityTypeId = taskCreatedType.ActivityTypeId,
                Subject = $"Task created: {entity.Title}",
                Description = entity.Description ?? "New task scheduled",
                ActivityDate = DateTime.UtcNow,
                DurationMinutes = 0,
                CustomerId = entity.CustomerId,
                OpportunityId = entity.OpportunityId,
                LeadId = entity.LeadId,
                CreatedById = createdById,
                CreatedAt = DateTime.UtcNow
            };

            _db.Activities.Add(activity);
            await _db.SaveChangesAsync();
        }

        return await ReloadDto(entity.CrmTaskId);
    }

    public async Task<TaskReadDto?> UpdateAsync(int id, TaskUpdateDto dto)
    {
        var task = await _db.CrmTasks.FindAsync(id);
        if (task == null) return null;

        task.Title = dto.Title;
        task.Description = dto.Description;
        task.DueDate = dto.DueDate;
        task.CrmTaskStatusId = dto.CrmTaskStatusId;
        task.CustomerId = dto.CustomerId;
        task.OpportunityId = dto.OpportunityId;
        task.LeadId = dto.LeadId;
        task.ActivityId = dto.ActivityId;
        task.AssignedToId = dto.AssignedToId;

        await _db.SaveChangesAsync();
        return await ReloadDto(id);
    }

    public async Task<TaskReadDto?> CompleteAsync(int id, string? completionNote = null, int? completedById = null)
    {
        var task = await _db.CrmTasks.FindAsync(id);
        if (task == null) return null;

        // Find the terminal status (Completed)
        var completedStatus = await _db.CrmTaskStatuses
            .Where(s => s.IsTerminal)
            .OrderBy(s => s.CrmTaskStatusId)
            .FirstOrDefaultAsync();

        if (completedStatus != null)
            task.CrmTaskStatusId = completedStatus.CrmTaskStatusId;

        await _db.SaveChangesAsync();

        // Create an activity for the task completion
        if (task.CustomerId.HasValue || task.OpportunityId.HasValue || task.LeadId.HasValue)
        {
            // Find or create a "Task Completed" activity type
            var taskCompletedType = await _db.ActivityTypes
                .FirstOrDefaultAsync(at => at.Name == "Task Completed");

            if (taskCompletedType == null)
            {
                taskCompletedType = new ActivityType
                {
                    Name = "Task Completed",
                    Icon = "✓"
                };
                _db.ActivityTypes.Add(taskCompletedType);
                await _db.SaveChangesAsync();
            }

            var activity = new Activity
            {
                ActivityTypeId = taskCompletedType.ActivityTypeId,
                Subject = $"Task completed: {task.Title}",
                Description = completionNote ?? "Task marked as complete",
                ActivityDate = DateTime.UtcNow,
                DurationMinutes = 0,
                CustomerId = task.CustomerId,
                OpportunityId = task.OpportunityId,
                LeadId = task.LeadId,
                CreatedById = completedById ?? task.AssignedToId ?? task.CreatedById,
                CreatedAt = DateTime.UtcNow
            };

            _db.Activities.Add(activity);
            await _db.SaveChangesAsync();
        }

        return await ReloadDto(id);
    }

    public async Task<TaskReadDto?> CancelAsync(int id, string? cancellationNote = null)
    {
        var task = await _db.CrmTasks.FindAsync(id);
        if (task == null) return null;

        // Find the Cancelled status (terminal)
        var cancelledStatus = await _db.CrmTaskStatuses
            .Where(s => s.IsTerminal && s.Name == "Cancelled")
            .FirstOrDefaultAsync();

        if (cancelledStatus != null)
            task.CrmTaskStatusId = cancelledStatus.CrmTaskStatusId;

        await _db.SaveChangesAsync();

        // Create an activity for the task cancellation
        if (task.CustomerId.HasValue || task.OpportunityId.HasValue || task.LeadId.HasValue)
        {
            // Find or create a "Task Cancelled" activity type
            var taskCancelledType = await _db.ActivityTypes
                .FirstOrDefaultAsync(at => at.Name == "Task Cancelled");

            if (taskCancelledType == null)
            {
                taskCancelledType = new ActivityType
                {
                    Name = "Task Cancelled",
                    Icon = "✕"
                };
                _db.ActivityTypes.Add(taskCancelledType);
                await _db.SaveChangesAsync();
            }

            var activity = new Activity
            {
                ActivityTypeId = taskCancelledType.ActivityTypeId,
                Subject = $"Task cancelled: {task.Title}",
                Description = cancellationNote ?? "Task was cancelled",
                ActivityDate = DateTime.UtcNow,
                DurationMinutes = 0,
                CustomerId = task.CustomerId,
                OpportunityId = task.OpportunityId,
                LeadId = task.LeadId,
                CreatedById = task.AssignedToId ?? task.CreatedById,
                CreatedAt = DateTime.UtcNow
            };

            _db.Activities.Add(activity);
            await _db.SaveChangesAsync();
        }

        return await ReloadDto(task.CrmTaskId);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var task = await _db.CrmTasks.FindAsync(id);
        if (task == null) return false;
        _db.CrmTasks.Remove(task);
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private IQueryable<CrmTask> GetActiveTasksQuery()
        => _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Include(t => t.Customer)
            .Include(t => t.Opportunity)
            .Include(t => t.Lead)
            .Include(t => t.Activity)
            .ThenInclude(a => a.ActivityType)
            .Include(t => t.AssignedTo)
            .Include(t => t.CreatedBy)
            .Where(t => t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal);

    private IQueryable<CrmTask> GetAllTasksQuery()
        => _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Include(t => t.Customer)
            .Include(t => t.Opportunity)
            .Include(t => t.Lead)
            .Include(t => t.Activity)
            .ThenInclude(a => a.ActivityType)
            .Include(t => t.AssignedTo)
            .Include(t => t.CreatedBy);

    private static TaskGroupedDto GroupTasks(IEnumerable<CrmTask> tasks, DateTime now)
    {
        var result = new TaskGroupedDto();
        var today = now.Date;
        foreach (var t in tasks)
        {
            // Skip completed tasks for active grouping
            if (t.CrmTaskStatus != null && t.CrmTaskStatus.IsTerminal)
            {
                result.Completed.Add(MapToDto(t));
                continue;
            }

            if (!t.DueDate.HasValue)
                result.Upcoming.Add(MapToDto(t));
            else if (t.DueDate.Value < now)
                result.Overdue.Add(MapToDto(t));
            else if (t.DueDate.Value.Date == today && t.DueDate.Value >= now)
                result.DueToday.Add(MapToDto(t));
            else
                result.Upcoming.Add(MapToDto(t));
        }
        return result;
    }

    private async Task<TaskReadDto> ReloadDto(int id)
    {
        var t = await _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Include(t => t.Customer)
            .Include(t => t.Opportunity)
            .Include(t => t.Lead)
            .Include(t => t.Activity)
            .ThenInclude(a => a.ActivityType)
            .Include(t => t.AssignedTo)
            .Include(t => t.CreatedBy)
            .FirstOrDefaultAsync(t => t.CrmTaskId == id);

        if (t != null)
            return MapToDto(t);

        var tracked = _db.ChangeTracker.Entries<CrmTask>()
            .Select(e => e.Entity)
            .FirstOrDefault(task => task.CrmTaskId == id);

        return tracked != null ? MapToDto(tracked) : throw new InvalidOperationException($"Task {id} could not be reloaded after creation.");
    }

    private async Task<int> ResolveTaskStatusIdAsync(int requestedStatusId)
    {
        if (requestedStatusId > 0)
        {
            var requestedStatus = await _db.CrmTaskStatuses.FindAsync(requestedStatusId);
            if (requestedStatus != null)
                return requestedStatus.CrmTaskStatusId;
        }

        var defaultStatus = await _db.CrmTaskStatuses
            .Where(s => !s.IsTerminal)
            .OrderBy(s => s.CrmTaskStatusId)
            .FirstOrDefaultAsync();

        if (defaultStatus != null)
            return defaultStatus.CrmTaskStatusId;

        var createdStatus = new CrmTaskStatus
        {
            Name = "Pending",
            IsTerminal = false
        };

        _db.CrmTaskStatuses.Add(createdStatus);
        await _db.SaveChangesAsync();
        return createdStatus.CrmTaskStatusId;
    }

    private static TaskReadDto MapToDto(CrmTask t) => new()
    {
        CrmTaskId = t.CrmTaskId,
        Title = t.Title,
        Description = t.Description,
        DueDate = t.DueDate,
        CrmTaskStatusId = t.CrmTaskStatusId,
        StatusName = t.CrmTaskStatus?.Name ?? string.Empty,
        IsTerminal = t.CrmTaskStatus?.IsTerminal ?? false,
        CustomerId = t.CustomerId,
        CustomerName = t.Customer != null ? $"{t.Customer.FirstName} {t.Customer.LastName}" : null,
        OpportunityId = t.OpportunityId,
        OpportunityTitle = t.Opportunity?.Title,
        LeadId = t.LeadId,
        LeadName = t.Lead != null ? $"{t.Lead.FirstName} {t.Lead.LastName}" : null,
        ActivityId = t.ActivityId,
        ActivitySubject = t.Activity?.Subject,
        ActivityTypeName = t.Activity?.ActivityType?.Name,
        AssignedToId = t.AssignedToId,
        AssignedToName = t.AssignedTo?.Name,
        CreatedById = t.CreatedById,
        CreatedByName = t.CreatedBy?.Name ?? string.Empty,
        CreatedAt = t.CreatedAt
    };
}
