using CrmSystem.Domain.Dtos.Task;

namespace CrmSystem.Infrastructure.Services;

public interface ITaskService
{
    Task<TaskGroupedDto> GetMyTasksAsync(int identityId);
    Task<TaskGroupedDto> GetByAssigneeAsync(int assigneeId);
    Task<IReadOnlyList<TaskReadDto>> GetByCustomerAsync(int customerId);
    Task<IReadOnlyList<TaskReadDto>> GetByOpportunityAsync(int opportunityId);
    Task<List<CalendarDayDto>> GetCalendarAsync(int year, int month, int? assignedToId);
    Task<TaskReadDto> CreateAsync(TaskCreateDto dto, int createdById);
    Task<TaskReadDto?> UpdateAsync(int id, TaskUpdateDto dto);
    Task<TaskReadDto?> CompleteAsync(int id, string? completionNote = null, int? completedById = null);
    Task<TaskReadDto?> CancelAsync(int id, string? cancellationNote = null);
    Task<bool> DeleteAsync(int id);
}
