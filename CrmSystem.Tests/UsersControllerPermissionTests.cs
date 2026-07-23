using CrmSystem.Api.Controllers;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CrmSystem.Tests;

public class UsersControllerPermissionTests
{
    private DbContextOptions<AppDbContext> GetInMemoryOptions()
    {
        return new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
    }

    [Fact]
    public async Task Manager_CannotAssign_ManagerOrAdmin()
    {
        var options = GetInMemoryOptions();
        await using var db = new AppDbContext(options);

        db.Roles.AddRange(new Role { RoleId = 1, Name = "Admin" }, new Role { RoleId = 2, Name = "Manager" }, new Role { RoleId = 3, Name = "SalesRep" });
        db.EntityTypes.Add(new EntityType { Name = "User", TableName = "Identities" });
        db.AuditActionTypes.Add(new AuditActionType { Name = "Update" });

        var manager = new Identity { Name = "Manager", Email = "m@x.com", PasswordHash = "h", RoleId = 2 };
        var target = new Identity { Name = "Target", Email = "t@x.com", PasswordHash = "h", RoleId = 3 };
        db.Identities.AddRange(manager, target);
        await db.SaveChangesAsync();

        var auditService = new AuditService(db);
        var currentUser = new FlexibleCurrentUserService(manager.IdentityId, UserRole.Manager);
        var controller = new UsersController(db, currentUser, auditService);

        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, manager.IdentityId.ToString()), new Claim(ClaimTypes.Role, "Manager") };
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims)) } };

        var req = new CrmSystem.Api.Controllers.UpdateRolesRequest { RoleIds = new int[] { 2 } }; // attempt to assign Manager
        var result = await controller.UpdateUserRoles(target.IdentityId, req);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Manager_CanAssign_SalesRep()
    {
        var options = GetInMemoryOptions();
        await using var db = new AppDbContext(options);

        db.Roles.AddRange(new Role { RoleId = 1, Name = "Admin" }, new Role { RoleId = 2, Name = "Manager" }, new Role { RoleId = 3, Name = "SalesRep" });
        db.EntityTypes.Add(new EntityType { Name = "User", TableName = "Identities" });
        db.AuditActionTypes.Add(new AuditActionType { Name = "Update" });

        var manager = new Identity { Name = "Manager", Email = "m@x.com", PasswordHash = "h", RoleId = 2 };
        var target = new Identity { Name = "Target", Email = "t@x.com", PasswordHash = "h", RoleId = 2 };
        db.Identities.AddRange(manager, target);
        await db.SaveChangesAsync();

        var auditService = new AuditService(db);
        var currentUser = new FlexibleCurrentUserService(manager.IdentityId, UserRole.Manager);
        var controller = new UsersController(db, currentUser, auditService);

        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, manager.IdentityId.ToString()), new Claim(ClaimTypes.Role, "Manager") };
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims)) } };

        var req = new CrmSystem.Api.Controllers.UpdateRolesRequest { RoleIds = new int[] { 3 } }; // assign SalesRep
        var result = await controller.UpdateUserRoles(target.IdentityId, req);

        var ok = Assert.IsType<OkObjectResult>(result);
        var value = ok.Value;
        var rolesProp = value.GetType().GetProperty("Roles");
        Assert.NotNull(rolesProp);
        var rolesVal = rolesProp.GetValue(value) as System.Collections.IEnumerable;
        Assert.NotNull(rolesVal);

        var logs = await db.AuditLogs.ToListAsync();
        Assert.Single(logs);
        Assert.Equal("Roles", logs[0].FieldName);
    }
}

// Flexible test implementation of ICurrentUserService
class FlexibleCurrentUserService : CrmSystem.Api.Services.ICurrentUserService
{
    private readonly int _userId;
    private readonly IReadOnlyList<UserRole> _roles;

    public FlexibleCurrentUserService(int userId, params UserRole[] roles)
    {
        _userId = userId;
        _roles = roles.ToList();
    }

    public int? UserId => _userId;
    public string? Email => null;
    public IReadOnlyList<UserRole> Roles => _roles;
    public UserRole? Role => _roles.FirstOrDefault();
    public bool IsAuthenticated => true;
    public bool IsAdmin => _roles.Contains(UserRole.Admin);
    public bool IsManagerOrAbove => _roles.Contains(UserRole.Manager) || _roles.Contains(UserRole.Admin);
    public bool CanAccessOwnedRecord(int? ownerRepId) => true;
}
