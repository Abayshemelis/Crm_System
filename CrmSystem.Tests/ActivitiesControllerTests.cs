using CrmSystem.Api.Controllers;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Activity;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace CrmSystem.Tests;

public class ActivitiesControllerTests
{
    [Fact]
    public async Task GetAll_WithCustomerFilter_ReturnsTimelineForThatCustomer()
    {
        var controller = new ActivitiesController(new FakeActivityService(), new FakeCurrentUserService());

        var result = await controller.GetAll(customerId: 7, opportunityId: null, leadId: null);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var activities = Assert.IsAssignableFrom<IReadOnlyList<ActivityReadDto>>(okResult.Value);

        Assert.Single(activities);
        Assert.Equal(7, activities[0].CustomerId);
    }

    private sealed class FakeActivityService : IActivityService
    {
        public Task<IReadOnlyList<ActivityReadDto>> GetAllAsync()
            => Task.FromResult<IReadOnlyList<ActivityReadDto>>(new List<ActivityReadDto>
            {
                new() { ActivityId = 1, Subject = "All activities", CustomerId = 1 }
            });

        public Task<IReadOnlyList<ActivityReadDto>> GetTimelineAsync(int? customerId = null, int? opportunityId = null, int? leadId = null)
        {
            var list = new List<ActivityReadDto>();
            if (customerId.HasValue)
            {
                list.Add(new ActivityReadDto { ActivityId = 2, Subject = "Customer activity", CustomerId = customerId.Value });
            }
            return Task.FromResult<IReadOnlyList<ActivityReadDto>>(list);
        }

        public Task<ActivityReadDto> CreateAsync(ActivityCreateDto dto, int createdById)
            => throw new NotSupportedException();

        public Task<bool> DeleteAsync(int activityId, int requestingUserId, bool isAdmin)
            => throw new NotSupportedException();
    }

    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public int? UserId => 1;
        public string? Email => "tester@example.com";
        public IReadOnlyList<UserRole> Roles => new List<UserRole> { UserRole.SalesRep };
        public UserRole? Role => UserRole.SalesRep;
        public bool IsAuthenticated => true;
        public bool IsAdmin => false;
        public bool IsManagerOrAbove => false;

        public bool CanAccessOwnedRecord(int? ownerRepId) => true;
    }
}
