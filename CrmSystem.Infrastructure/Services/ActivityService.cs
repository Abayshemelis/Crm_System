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
            .Include(a => a.Lead)
            .Where(a => a.ActivityDate >= thirtyDaysAgo)
            .OrderByDescending(a => a.ActivityDate)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<ActivityReadDto>> GetTimelineAsync(int? customerId, int? opportunityId, int? leadId = null)
    {
        var baseQuery = _db.Activities
            .Include(a => a.ActivityType)
            .Include(a => a.CreatedBy)
            .Include(a => a.Customer)
            .Include(a => a.Opportunity)
            .Include(a => a.Lead)
            .AsQueryable();

        // If ONLY leadId is provided, we treat this as a snapshot request for the Lead page.
        // It should not show new activities created on the Customer/Opportunity after conversion.
        if (leadId.HasValue && !customerId.HasValue && !opportunityId.HasValue)
        {
            var listLeadOnly = await baseQuery
                .Where(a => a.LeadId == leadId.Value)
                .OrderByDescending(a => a.ActivityDate)
                .ToListAsync();
            return listLeadOnly.Select(MapToDto).ToList();
        }

        var linkedCustomerIds = new HashSet<int>();
        var linkedOpportunityIds = new HashSet<int>();
        var linkedLeadIds = new HashSet<int>();

        if (customerId.HasValue)
        {
            linkedCustomerIds.Add(customerId.Value);
            var leads = await _db.Leads
                .Where(l => l.ConvertedCustomerId == customerId.Value)
                .Select(l => new { l.LeadId, l.ConvertedOpportunityId })
                .ToListAsync();
            foreach (var l in leads)
            {
                linkedLeadIds.Add(l.LeadId);
                if (l.ConvertedOpportunityId.HasValue)
                    linkedOpportunityIds.Add(l.ConvertedOpportunityId.Value);
            }
        }

        if (opportunityId.HasValue)
        {
            linkedOpportunityIds.Add(opportunityId.Value);
            var leads = await _db.Leads
                .Where(l => l.ConvertedOpportunityId == opportunityId.Value)
                .Select(l => new { l.LeadId, l.ConvertedCustomerId })
                .ToListAsync();
            foreach (var l in leads)
            {
                linkedLeadIds.Add(l.LeadId);
                if (l.ConvertedCustomerId.HasValue)
                    linkedCustomerIds.Add(l.ConvertedCustomerId.Value);
            }
        }

        if (leadId.HasValue)
        {
            linkedLeadIds.Add(leadId.Value);
        }

        var cIds = linkedCustomerIds.ToList();
        var oIds = linkedOpportunityIds.ToList();
        var lIds = linkedLeadIds.ToList();

        var query = baseQuery.Where(a =>
            (a.CustomerId.HasValue && cIds.Contains(a.CustomerId.Value)) ||
            (a.OpportunityId.HasValue && oIds.Contains(a.OpportunityId.Value)) ||
            (a.LeadId.HasValue && lIds.Contains(a.LeadId.Value)));

        var list = await query
            .OrderByDescending(a => a.ActivityDate)
            .ToListAsync();

        return list.DistinctBy(a => a.ActivityId).Select(MapToDto).ToList();
    }

    public async Task<ActivityReadDto> CreateAsync(ActivityCreateDto dto, int createdById)
    {
        var typeExists = await _db.ActivityTypes.AnyAsync(at => at.ActivityTypeId == dto.ActivityTypeId);
        if (!typeExists)
        {
            throw new KeyNotFoundException($"ActivityType with ID {dto.ActivityTypeId} does not exist.");
        }

        var entity = new Activity
        {
            ActivityTypeId = dto.ActivityTypeId,
            Subject = dto.Subject,
            Description = dto.Description,
            ActivityDate = dto.ActivityDate,
            DurationMinutes = dto.DurationMinutes,
            CustomerId = dto.CustomerId,
            OpportunityId = dto.OpportunityId,
            LeadId = dto.LeadId,
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
            .Include(a => a.Lead)
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
        LeadId = a.LeadId,
        LeadName = a.Lead != null ? $"{a.Lead.FirstName} {a.Lead.LastName}" : null,
        CreatedById = a.CreatedById,
        CreatedByName = a.CreatedBy?.Name ?? string.Empty,
        CreatedAt = a.CreatedAt
    };
}
