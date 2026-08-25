using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace CrmSystem.Api.Middleware;

public class IpRateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private static readonly ConcurrentDictionary<string, (int Count, DateTime WindowStart)> _trackers = new();

    // Limit definitions per minute
    private const int MaxGeneralRequestsPerMinute = 300;
    private const int MaxAuthRequestsPerMinute = 12;         // Login, Register, Forgot Password
    private const int MaxPublicAiRequestsPerMinute = 20;     // Public AI Copilot chat
    private const int MaxPublicLeadRequestsPerMinute = 15;   // Public Lead submission form

    public IpRateLimitingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Bypass preflight CORS OPTIONS requests
        if (HttpMethods.IsOptions(context.Request.Method))
        {
            await _next(context);
            return;
        }

        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var path = context.Request.Path.Value?.ToLower() ?? string.Empty;

        // Bypass rate limit for lightweight notification count heartbeats
        if (path.Contains("/api/notifications/count") || path.Contains("/api/health"))
        {
            await _next(context);
            return;
        }

        // Determine rate limit category and threshold
        string bucket;
        int limit;

        if (path.StartsWith("/api/auth/login") || path.StartsWith("/api/auth/register") || path.StartsWith("/api/auth/forgot-password"))
        {
            bucket = "auth";
            limit = MaxAuthRequestsPerMinute;
        }
        else if (path.Contains("/api/ai/copilot/public"))
        {
            bucket = "public_ai";
            limit = MaxPublicAiRequestsPerMinute;
        }
        else if (path.StartsWith("/api/public/leads"))
        {
            bucket = "public_leads";
            limit = MaxPublicLeadRequestsPerMinute;
        }
        else
        {
            bucket = "general";
            limit = MaxGeneralRequestsPerMinute;
        }

        var trackerKey = $"{ip}:{bucket}";
        var now = DateTime.UtcNow;

        _trackers.AddOrUpdate(
            trackerKey,
            _ => (1, now),
            (_, tracker) =>
            {
                if ((now - tracker.WindowStart).TotalSeconds > 60)
                {
                    return (1, now);
                }
                return (tracker.Count + 1, tracker.WindowStart);
            }
        );

        if (_trackers.TryGetValue(trackerKey, out var current) && current.Count > limit)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.ContentType = "application/json";
            context.Response.Headers["Retry-After"] = "60";
            await context.Response.WriteAsync("{\"status\":429,\"title\":\"Too Many Requests\",\"detail\":\"Rate limit exceeded. Please wait a minute before retrying.\"}");
            return;
        }

        await _next(context);
    }
}
