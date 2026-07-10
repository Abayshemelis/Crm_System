using CrmSystem.Api.Controllers;
using CrmSystem.Api.Dtos;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace CrmSystem.Tests;

public class MockEmailSender : IEmailSender
{
    public Task SendPasswordResetAsync(string toEmail, string resetUrl, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}

public class AuthControllerTests
{
    [Fact]
    public async Task Login_ReturnsToken_WhenCredentialsAreValid()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var db = new AppDbContext(options);
        db.Roles.Add(new Role { Name = "SalesRep", Description = "Sales Rep", IsSystemRole = true });
        await db.SaveChangesAsync();

        var identity = new Identity
        {
            Name = "Test User",
            Email = "user@test.com",
            PasswordHash = new BCryptPasswordHasher().Hash("Password123!"),
            RoleId = 1
        };
        db.Identities.Add(identity);
        await db.SaveChangesAsync();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "super-secret-key-1234567890123456789012345678901234567890",
                ["Jwt:Issuer"] = "crm-test",
                ["Jwt:AccessTokenExpiryMinutes"] = "60"
            })
            .Build();

        var controller = new AuthController(
            db,
            new BCryptPasswordHasher(),
            new JwtTokenService(config),
            new MockEmailSender());

        var result = await controller.Login(new LoginRequest("user@test.com", "Password123!"));

        Assert.NotNull(result.Result);
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var authResponse = Assert.IsType<AuthResponse>(okResult.Value);
        Assert.Equal("SalesRep", authResponse.Role);
        Assert.False(string.IsNullOrWhiteSpace(authResponse.AccessToken));
    }
}
