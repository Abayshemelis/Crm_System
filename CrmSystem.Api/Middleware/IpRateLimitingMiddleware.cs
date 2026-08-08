using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace CrmSystem.Api.Middleware
{
    public class IpRateLimitingMiddleware
    {
        private readonly RequestDelegate _next;
        private static readonly ConcurrentDictionary<string, (int Count, DateTime WindowStart)> _ipTrackers = new();
        private const int MaxRequestsPerMinute = 120; // 120 reqs/min max

        public IpRateLimitingMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var path = context.Request.Path.Value?.ToLower() ?? string.Empty;

            // Strict rate limit on auth endpoints (15 login attempts/min)
            int limit = path.Contains("/api/auth/login") ? 15 : MaxRequestsPerMinute;

            var now = DateTime.UtcNow;
            _ipTrackers.AddOrUpdate(
                ip,
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

            if (_ipTrackers.TryGetValue(ip, out var current) && current.Count > limit)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"status\":429,\"title\":\"Too Many Requests\",\"detail\":\"Rate limit exceeded. Please wait a minute before retrying.\"}");
                return;
            }

            await _next(context);
        }
    }
}
