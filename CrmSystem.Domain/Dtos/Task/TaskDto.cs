using System;

namespace CrmSystem.Domain.Dtos.Task;

public class TaskCreateDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; }
    public int CrmTaskStatusId { get; set; }
    public int? CustomerId { get; set; }
    public int? OpportunityId { get; set; }
    public int? LeadId { get; set; }
    public int? ActivityId { get; set; }
    public int? AssignedToId { get; set; }
}

public class TaskUpdateDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; }
    public int CrmTaskStatusId { get; set; }
    public int? CustomerId { get; set; }
    public int? OpportunityId { get; set; }
    public int? LeadId { get; set; }
    public int? ActivityId { get; set; }
    public int? AssignedToId { get; set; }
}

public class TaskCompleteDto
{
    public string? CompletionNote { get; set; }
}

public class TaskCancelDto
{
    public string? CancellationNote { get; set; }
}

public class TaskReadDto
{
    public int CrmTaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; }
    public int CrmTaskStatusId { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public bool IsTerminal { get; set; }
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public int? OpportunityId { get; set; }
    public string? OpportunityTitle { get; set; }
    public int? LeadId { get; set; }
    public string? LeadName { get; set; }
    public int? ActivityId { get; set; }
    public string? ActivitySubject { get; set; }
    public string? ActivityTypeName { get; set; }
    public int? AssignedToId { get; set; }
    public string? AssignedToName { get; set; }
    public int CreatedById { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class TaskGroupedDto
{
    public List<TaskReadDto> Overdue { get; set; } = new();
    public List<TaskReadDto> DueToday { get; set; } = new();
    public List<TaskReadDto> Upcoming { get; set; } = new();
    public List<TaskReadDto> Completed { get; set; } = new();
}

public class CalendarDayDto
{
    public int Day { get; set; }
    public int TaskCount { get; set; }
    public List<TaskReadDto> Tasks { get; set; } = new();
}
