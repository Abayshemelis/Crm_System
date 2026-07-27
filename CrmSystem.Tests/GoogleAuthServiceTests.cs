using System.Net;
using System.Text.Json;
using CrmSystem.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CrmSystem.Tests;

public class MockHttpMessageHandler : HttpMessageHandler
{
    public HttpResponseMessage ResponseToReturn { get; set; } = new(HttpStatusCode.OK);

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(ResponseToReturn);
    }
}

public class GoogleAuthServiceTests
{
    [Fact]
    public async Task ValidateIdTokenAsync_ReturnsGoogleUserInfo_WhenTokenIsValidWithBooleanVerified()
    {
        var jsonResponse = JsonSerializer.Serialize(new
        {
            email = "test@example.com",
            name = "Test User",
            sub = "123456789",
            email_verified = true
        });

        var handler = new MockHttpMessageHandler
        {
            ResponseToReturn = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(jsonResponse, System.Text.Encoding.UTF8, "application/json")
            }
        };

        var httpClient = new HttpClient(handler);
        var service = new GoogleAuthService(httpClient, NullLogger<GoogleAuthService>.Instance);

        var result = await service.ValidateIdTokenAsync("valid-token");

        Assert.NotNull(result);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("Test User", result.Name);
        Assert.Equal("123456789", result.Sub);
        Assert.True(result.IsEmailVerified);
    }

    [Fact]
    public async Task ValidateIdTokenAsync_ReturnsGoogleUserInfo_WhenTokenIsValidWithStringVerified()
    {
        var jsonResponse = "{\"email\":\"test@example.com\",\"name\":\"Test User\",\"sub\":\"123456789\",\"email_verified\":\"true\"}";

        var handler = new MockHttpMessageHandler
        {
            ResponseToReturn = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(jsonResponse, System.Text.Encoding.UTF8, "application/json")
            }
        };

        var httpClient = new HttpClient(handler);
        var service = new GoogleAuthService(httpClient, NullLogger<GoogleAuthService>.Instance);

        var result = await service.ValidateIdTokenAsync("valid-token");

        Assert.NotNull(result);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("Test User", result.Name);
        Assert.True(result.IsEmailVerified);
    }

    [Fact]
    public async Task ValidateIdTokenAsync_ReturnsNull_WhenEmailIsNotVerified()
    {
        var jsonResponse = JsonSerializer.Serialize(new
        {
            email = "unverified@example.com",
            name = "Unverified User",
            email_verified = false
        });

        var handler = new MockHttpMessageHandler
        {
            ResponseToReturn = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(jsonResponse, System.Text.Encoding.UTF8, "application/json")
            }
        };

        var httpClient = new HttpClient(handler);
        var service = new GoogleAuthService(httpClient, NullLogger<GoogleAuthService>.Instance);

        var result = await service.ValidateIdTokenAsync("token-unverified");

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateIdTokenAsync_ReturnsNull_WhenGoogleReturnsErrorStatusCode()
    {
        var handler = new MockHttpMessageHandler
        {
            ResponseToReturn = new HttpResponseMessage(HttpStatusCode.BadRequest)
        };

        var httpClient = new HttpClient(handler);
        var service = new GoogleAuthService(httpClient, NullLogger<GoogleAuthService>.Instance);

        var result = await service.ValidateIdTokenAsync("invalid-token");

        Assert.Null(result);
    }
}
