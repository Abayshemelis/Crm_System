using System.Security.Claims;
using CrmSystem.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Middleware;

public class SessionValidationMiddleware
{
    private readonly RequestDelegate _next;

    public SessionValidationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        var path = context.Request.Path;
        
        // Skip session revocation check on auth login/refresh/status endpoints
        if (path.StartsWithSegments("/api/auth/login") ||
            path.StartsWithSegments("/api/auth/refresh") ||
            path.StartsWithSegments("/api/auth/check-session") ||
            path.StartsWithSegments("/api/auth/google"))
        {
            await _next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated == true)
        {
            var sessionIdClaim = context.User.FindFirst("sessionId")?.Value;
            if (!string.IsNullOrEmpty(sessionIdClaim) && int.TryParse(sessionIdClaim, out var sessionId))
            {
                var isRevoked = await db.RefreshTokens
                    .AsNoTracking()
                    .AnyAsync(rt => rt.RefreshTokenId == sessionId && rt.IsRevoked);

                if (isRevoked)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new { message = "Session has been revoked. Please sign in again." });
                    return;
                }
            }
        }

        await _next(context);
    }
}
