using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace CrmSystem.Api.Middleware;

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Add security response headers
        var headers = context.Response.Headers;

        // Prevent MIME-sniffing
        headers["X-Content-Type-Options"] = "nosniff";

        // Prevent clickjacking for API responses
        if (!headers.ContainsKey("X-Frame-Options"))
        {
            headers["X-Frame-Options"] = "SAMEORIGIN";
        }

        // Enable XSS filter
        headers["X-XSS-Protection"] = "1; mode=block";

        // Control referrer information sent with requests
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

        // Restrict powerful browser features
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

        // Enforce HTTPS HSTS
        if (context.Request.IsHttps || context.Request.Headers.ContainsKey("X-Forwarded-Proto"))
        {
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
        }

        await _next(context);
    }
}
