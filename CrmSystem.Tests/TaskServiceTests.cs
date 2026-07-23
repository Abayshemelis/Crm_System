using CrmSystem.Domain.Dtos.Task;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Tests;

public class TaskServiceTests
{
    [Fact]
    public async Task CreateAsync_CreatesDefaultPendingStatus_WhenNoTaskStatusesExist()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var db = new AppDbContext(options);

        var role = new Role { Name = "SalesRep", Description = "Sales Rep", IsSystemRole = true };
        db.Roles.Add(role);
        await db.SaveChangesAsync();

        var creator = new Identity
        {
            Name = "Creator",
            Email = "creator@test.com",
            PasswordHash = "hash",
            RoleId = role.RoleId
        };
        db.Identities.Add(creator);
        await db.SaveChangesAsync();

        var service = new TaskService(db);

        var result = await service.CreateAsync(new TaskCreateDto
        {
            Title = "New task",
            Description = "Needs follow-up",
            DueDate = DateTime.UtcNow.AddDays(1),
            CrmTaskStatusId = 0
        }, creator.IdentityId);

        Assert.Equal("New task", result.Title);
        Assert.Equal("Pending", result.StatusName);
        Assert.False(result.IsTerminal);
        Assert.Equal(creator.IdentityId, result.CreatedById);
    }
}
