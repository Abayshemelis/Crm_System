using CrmSystem.Domain.Dtos.Activity;
using CrmSystem.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Infrastructure.Services;

public class ActivityService : IActivityService
{
    private readonly AppDbContext _db;

    public ActivityService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ActivityReadDto>> GetAllAsync()
    {
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

        var list = await _db.Activities
            .Include(a => a.ActivityType)
            .Include(a => a.CreatedBy)
            .Include(a => a.Customer)
            .Include(a => a.Opportunity)
            .Where(a => a.ActivityDate >= thirtyDaysAgo)
            .OrderByDescending(a => a.ActivityDate)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<ActivityReadDto>> GetTimelineAsync(int? customerId, int? opportunityId)
    {
        var query = _db.Activities
            .Include(a => a.ActivityType)
            .Include(a => a.CreatedBy)
            .Include(a => a.Customer)
            .Include(a => a.Opportunity)
            .AsQueryable();

        if (customerId.HasValue)
            query = query.Where(a => a.CustomerId == customerId.Value);

        if (opportunityId.HasValue)
            query = query.Where(a => a.OpportunityId == opportunityId.Value);

        var list = await query
            .OrderByDescending(a => a.ActivityDate)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<ActivityReadDto> CreateAsync(ActivityCreateDto dto, int createdById)
    {
        var entity = new Activity
        {
            ActivityTypeId = dto.ActivityTypeId,
            Subject = dto.Subject,
            Description = dto.Description,
            ActivityDate = dto.ActivityDate,
            DurationMinutes = dto.DurationMinutes,
            CustomerId = dto.CustomerId,
            OpportunityId = dto.OpportunityId,
            CreatedById = createdById,
            CreatedAt = DateTime.UtcNow
        };

        _db.Activities.Add(entity);
        await _db.SaveChangesAsync();

        // Reload with navigation properties
        var created = await _db.Activities
            .Include(a => a.ActivityType)
            .Include(a => a.CreatedBy)
            .Include(a => a.Customer)
            .Include(a => a.Opportunity)
            .FirstAsync(a => a.ActivityId == entity.ActivityId);

        return MapToDto(created);
    }

    public async Task<bool> DeleteAsync(int activityId, int requestingUserId, bool isAdmin)
    {
        var activity = await _db.Activities.FindAsync(activityId);
        if (activity == null) return false;
        if (!isAdmin && activity.CreatedById != requestingUserId) return false;

        _db.Activities.Remove(activity);
        await _db.SaveChangesAsync();
        return true;
    }

    private static ActivityReadDto MapToDto(Activity a) => new()
    {
        ActivityId = a.ActivityId,
        ActivityTypeId = a.ActivityTypeId,
        ActivityTypeName = a.ActivityType?.Name ?? string.Empty,
        ActivityTypeIcon = a.ActivityType?.Icon,
        Subject = a.Subject,
        Description = a.Description,
        ActivityDate = a.ActivityDate,
        DurationMinutes = a.DurationMinutes,
        CustomerId = a.CustomerId,
        CustomerName = a.Customer != null ? $"{a.Customer.FirstName} {a.Customer.LastName}" : null,
        OpportunityId = a.OpportunityId,
        OpportunityTitle = a.Opportunity?.Title,
        CreatedById = a.CreatedById,
        CreatedByName = a.CreatedBy?.Name ?? string.Empty,
        CreatedAt = a.CreatedAt
    };
}
