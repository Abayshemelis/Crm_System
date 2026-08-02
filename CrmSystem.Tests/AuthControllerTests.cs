using CrmSystem.Api.Controllers;
using CrmSystem.Api.Dtos;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace CrmSystem.Tests;

public class MockEmailSender : IEmailSender
{
    public Task SendPasswordResetAsync(string toEmail, string resetUrl, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    public Task SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}

public class MockGoogleAuthService : IGoogleAuthService
{
    public GoogleUserInfo? UserToReturn { get; set; }

    public Task<GoogleUserInfo?> ValidateIdTokenAsync(string idToken, CancellationToken cancellationToken = default)
    {
        if (idToken == "valid-google-token")
        {
            return Task.FromResult(UserToReturn ?? new GoogleUserInfo("googleuser@test.com", "Google User", "12345", true));
        }
        return Task.FromResult<GoogleUserInfo?>(null);
    }
}

public class AuthControllerTests
{
    private (AppDbContext Db, IConfiguration Config) CreateDbContextAndConfig()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var db = new AppDbContext(options);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "super-secret-key-1234567890123456789012345678901234567890",
                ["Jwt:Issuer"] = "crm-test",
                ["Jwt:AccessTokenExpiryMinutes"] = "60"
            })
            .Build();

        return (db, config);
    }

    [Fact]
    public async Task Login_ReturnsToken_WhenCredentialsAreValid()
    {
        var (db, config) = CreateDbContextAndConfig();
        await using (db)
        {
            db.Roles.Add(new Role { Name = "SalesRep", Description = "Sales Rep", IsSystemRole = true });
            await db.SaveChangesAsync();

            var identity = new Identity
            {
                Name = "Test User",
                Email = "user@test.com",
                PasswordHash = new BCryptPasswordHasher().Hash("Password123!"),
                RoleId = 1,
                IsActive = true
            };
            db.Identities.Add(identity);
            await db.SaveChangesAsync();

            var controller = new AuthController(
                db,
                new BCryptPasswordHasher(),
                new JwtTokenService(config),
                new MockEmailSender(),
                new MockGoogleAuthService());

            var result = await controller.Login(new LoginRequest("user@test.com", "Password123!"));

            Assert.NotNull(result.Result);
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var authResponse = Assert.IsType<AuthResponse>(okResult.Value);
            Assert.Equal("SalesRep", authResponse.Role);
            Assert.False(string.IsNullOrWhiteSpace(authResponse.AccessToken));
        }
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenAccountIsInactive()
    {
        var (db, config) = CreateDbContextAndConfig();
        await using (db)
        {
            db.Roles.Add(new Role { Name = "SalesRep", Description = "Sales Rep", IsSystemRole = true });
            await db.SaveChangesAsync();

            var identity = new Identity
            {
                Name = "Inactive User",
                Email = "inactive@test.com",
                PasswordHash = new BCryptPasswordHasher().Hash("Password123!"),
                RoleId = 1,
                IsActive = false
            };
            db.Identities.Add(identity);
            await db.SaveChangesAsync();

            var controller = new AuthController(
                db,
                new BCryptPasswordHasher(),
                new JwtTokenService(config),
                new MockEmailSender(),
                new MockGoogleAuthService());

            var result = await controller.Login(new LoginRequest("inactive@test.com", "Password123!"));

            Assert.NotNull(result.Result);
            Assert.IsType<UnauthorizedObjectResult>(result.Result);
        }
    }

    [Fact]
    public async Task Login_ReturnsBadRequest_WhenEmailFormatIsInvalid()
    {
        var (db, config) = CreateDbContextAndConfig();
        await using (db)
        {
            var controller = new AuthController(
                db,
                new BCryptPasswordHasher(),
                new JwtTokenService(config),
                new MockEmailSender(),
                new MockGoogleAuthService());

            var result = await controller.Login(new LoginRequest("not-an-email", "Password123!"));

            Assert.NotNull(result.Result);
            Assert.IsType<BadRequestObjectResult>(result.Result);
        }
    }

    [Fact]
    public async Task GoogleLogin_RegistersNewUser_WhenGoogleTokenIsValid()
    {
        var (db, config) = CreateDbContextAndConfig();
        await using (db)
        {
            db.Roles.Add(new Role { Name = "SalesRep", Description = "Sales Rep", IsSystemRole = true });
            await db.SaveChangesAsync();

            var mockGoogle = new MockGoogleAuthService
            {
                UserToReturn = new GoogleUserInfo("newgoogle@test.com", "Google Newbie", "sub-999", true)
            };

            var controller = new AuthController(
                db,
                new BCryptPasswordHasher(),
                new JwtTokenService(config),
                new MockEmailSender(),
                mockGoogle);

            var result = await controller.GoogleLogin(new GoogleLoginRequest("valid-google-token"));

            Assert.NotNull(result.Result);
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var authResponse = Assert.IsType<AuthResponse>(okResult.Value);
            Assert.Equal("newgoogle@test.com", authResponse.Email);
            Assert.Equal("SalesRep", authResponse.Role);
            Assert.False(string.IsNullOrWhiteSpace(authResponse.AccessToken));

            var createdUser = await db.Identities.FirstOrDefaultAsync(u => u.Email == "newgoogle@test.com");
            Assert.NotNull(createdUser);
            Assert.Equal("Google Newbie", createdUser.Name);
        }
    }

    [Fact]
    public async Task GoogleLogin_ReturnsUnauthorized_WhenGoogleTokenIsInvalid()
    {
        var (db, config) = CreateDbContextAndConfig();
        await using (db)
        {
            var controller = new AuthController(
                db,
                new BCryptPasswordHasher(),
                new JwtTokenService(config),
                new MockEmailSender(),
                new MockGoogleAuthService());

            var result = await controller.GoogleLogin(new GoogleLoginRequest("invalid-token"));

            Assert.NotNull(result.Result);
            Assert.IsType<UnauthorizedObjectResult>(result.Result);
        }
    }
}
