using CrmSystem.Domain.Dtos.Activity;

namespace CrmSystem.Infrastructure.Services;

public interface IActivityService
{
    Task<IReadOnlyList<ActivityReadDto>> GetAllAsync();
    Task<IReadOnlyList<ActivityReadDto>> GetTimelineAsync(int? customerId, int? opportunityId, int? leadId = null);
    Task<ActivityReadDto> CreateAsync(ActivityCreateDto dto, int createdById);
    Task<bool> DeleteAsync(int activityId, int requestingUserId, bool isAdmin);
}
