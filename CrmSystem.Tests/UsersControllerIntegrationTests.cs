using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CrmSystem.Tests;

public class UsersControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public UsersControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("environment", "Test");
            builder.UseSetting("UseInMemoryDatabase", "true");
            builder.UseSetting("Jwt:SigningKey", "development-signing-key-1234567890");
            builder.UseSetting("Jwt:AccessTokenExpiryMinutes", "60");
            builder.UseSetting("Jwt:Issuer", "CrmSystem.Api");
        });
    }

    [Fact]
    public async Task Admin_CanAssign_MultipleRoles_EndToEnd()
    {

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Ensure AuditActionType exists
        if (!await db.AuditActionTypes.AnyAsync(a => a.Name == "Update"))
            db.AuditActionTypes.Add(new AuditActionType { Name = "Update" });

        // Find seeded roles created by Program.cs seeding
        var adminRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");
        var salesRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "SalesRep");
        var managerRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "Manager");

        if (adminRole is null || salesRole is null || managerRole is null)
        {
            // If roles are not present, add them (shouldn't happen normally)
            db.Roles.AddRange(new Role { Name = "Admin" }, new Role { Name = "Manager" }, new Role { Name = "SalesRep" });
            await db.SaveChangesAsync();
            adminRole = await db.Roles.FirstAsync(r => r.Name == "Admin");
            salesRole = await db.Roles.FirstAsync(r => r.Name == "SalesRep");
            managerRole = await db.Roles.FirstAsync(r => r.Name == "Manager");
        }

        var admin = new Identity { Name = "Admin", Email = "admin-integ@x.com", PasswordHash = "h", RoleId = adminRole.RoleId, IsActive = true };
        var target = new Identity { Name = "Target", Email = "target-integ@x.com", PasswordHash = "h", RoleId = salesRole.RoleId, IsActive = true };
        db.Identities.AddRange(admin, target);
        await db.SaveChangesAsync();

        // Ensure navigation properties are loaded for token generation
        admin.Role = await db.Roles.FindAsync(admin.RoleId);
        admin.IdentityRoles = new List<IdentityRole>();

        var tokenService = scope.ServiceProvider.GetRequiredService<ITokenService>();
        var token = tokenService.GenerateAccessToken(admin);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var payload = new { roleIds = new[] { 2, 3 } };
        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var resp = await client.PutAsync($"/api/users/{target.IdentityId}/roles", content);
        var respBody = await resp.Content.ReadAsStringAsync();
        Assert.True(resp.IsSuccessStatusCode, $"Status: {resp.StatusCode}. Body: {respBody}");

        // Verify DB changed
        var roles = await db.IdentityRoles.Where(ir => ir.IdentityId == target.IdentityId).Select(ir => ir.RoleId).ToListAsync();
        Assert.Contains(2, roles);
        Assert.Contains(3, roles);
    }
}
