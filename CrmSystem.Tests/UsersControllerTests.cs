using CrmSystem.Api.Controllers;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CrmSystem.Tests;

public class UsersControllerTests
{
    private DbContextOptions<AppDbContext> GetInMemoryOptions()
    {
        return new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
    }

    [Fact]
    public async Task UpdateUserRoles_CreatesAuditLog()
    {
        var options = GetInMemoryOptions();
        await using var db = new AppDbContext(options);

        // Seed required lookups
        db.EntityTypes.Add(new EntityType { Name = "User", TableName = "Identities" });
        db.AuditActionTypes.Add(new AuditActionType { Name = "Update" });
        db.Roles.AddRange(new Role { Name = "Admin" }, new Role { Name = "Manager" }, new Role { Name = "SalesRep" });

        // Admin user
        var admin = new Identity { Name = "Admin", Email = "admin@x.com", PasswordHash = "h", RoleId = 1 };
        db.Identities.Add(admin);

        // Target user
        var target = new Identity { Name = "Target", Email = "t@x.com", PasswordHash = "h", RoleId = 3 };
        db.Identities.Add(target);

        await db.SaveChangesAsync();

        var auditService = new AuditService(db);

        // Fake current user service
        var currentUser = new TestCurrentUserService(admin.IdentityId);

        var controller = new UsersController(db, currentUser, auditService);

        // Set HttpContext user with Admin role so User.IsInRole("Admin") checks pass
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, admin.IdentityId.ToString()), new Claim(ClaimTypes.Role, "Admin") };
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims)) } };

        // Call UpdateUserRoles to set Manager and SalesRep
        var req = new CrmSystem.Api.Controllers.UpdateRolesRequest { RoleIds = new int[] { 2, 3 } };
        var result = await controller.UpdateUserRoles(target.IdentityId, req);

        // Verify audit log created
        var logs = await db.AuditLogs.ToListAsync();
        Assert.Single(logs);
        var log = logs.Single();
        Assert.Equal("Roles", log.FieldName);
        Assert.Contains("Manager", log.NewValue ?? string.Empty);
        Assert.Contains("SalesRep", log.NewValue ?? string.Empty);
    }
}

// Minimal test implementation of ICurrentUserService
class TestCurrentUserService : ICurrentUserService
{
    public TestCurrentUserService(int userId)
    {
        UserId = userId;
    }

    public int? UserId { get; }
    public string? Email => null;
    public IReadOnlyList<UserRole> Roles => new List<UserRole> { UserRole.Admin };
    public UserRole? Role => UserRole.Admin;
    public bool IsAuthenticated => true;
    public bool IsAdmin => true;
    public bool IsManagerOrAbove => true;
    public bool CanAccessOwnedRecord(int? ownerRepId) => true;
}
