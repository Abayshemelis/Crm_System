using System.Security.Claims;
using CrmSystem.Api.Dtos;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

using Microsoft.AspNetCore.SignalR;
using CrmSystem.Api.Hubs;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IEmailSender _emailSender;
    private readonly IGoogleAuthService _googleAuthService;
    private readonly IHubContext<NotificationHub> _hubContext;

    public AuthController(
        AppDbContext db,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IEmailSender emailSender,
        IGoogleAuthService googleAuthService,
        IHubContext<NotificationHub> hubContext)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _emailSender = emailSender;
        _googleAuthService = googleAuthService;
        _hubContext = hubContext;
    }

    // ── 1. USER REGISTRATION ──────────────────────────────────────────────────
    // Creates a new user account with hashed password and assigns default SalesRep role.
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var emailExists = await _db.Identities.AnyAsync(u => u.Email == request.Email);
        if (emailExists)
        {
            return Conflict(new { message = "A user with this email already exists." });
        }

        var salesRepRole = await _db.Roles.SingleOrDefaultAsync(r => r.Name == "SalesRep");
        if (salesRepRole is null)
        {
            return BadRequest(new { message = "SalesRep role is not configured in the database." });
        }

        var identity = new Identity
        {
            Name = request.Name,
            Email = request.Email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            RoleId = salesRepRole.RoleId
        };

        _db.Identities.Add(identity);
        await _db.SaveChangesAsync();

        // Persist initial IdentityRole mapping
        _db.IdentityRoles.Add(new IdentityRole { IdentityId = identity.IdentityId, RoleId = salesRepRole.RoleId });
        await _db.SaveChangesAsync();

        return Ok(new AuthResponse(identity.IdentityId, identity.Name, identity.Email, salesRepRole.Name, new[] { salesRepRole.Name }, null, null));
    }

    // ── 2. EMAIL & PASSWORD LOGIN ─────────────────────────────────────────────
    // Authenticates users with traditional email + password.
    // Verifies BCrypt password hash, generates JWT Access Token + Refresh Token.
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        try
        {
            var cleanIdentifier = request.Email?.Trim() ?? string.Empty;
            var cleanPassword = request.Password?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(cleanIdentifier) || string.IsNullOrWhiteSpace(cleanPassword))
            {
                return BadRequest(new { message = "Email/Username and password are required." });
            }

            var identity = await _db.Identities
                .Include(i => i.Role)
                .Include(i => i.IdentityRoles)
                    .ThenInclude(ir => ir.Role)
                .FirstOrDefaultAsync(i => i.Email.ToLower() == cleanIdentifier.ToLower() || i.Name.ToLower() == cleanIdentifier.ToLower());

            if (identity is null || !_passwordHasher.Verify(cleanPassword, identity.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid email/username or password." });
            }

            if (!identity.IsActive)
            {
                return Unauthorized(new { message = "Account is deactivated. Please contact an administrator." });
            }

            var rawRefreshToken = _tokenService.GenerateRefreshToken();

            var refreshTokenEntity = new RefreshToken
            {
                IdentityId = identity.IdentityId,
                TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
                DeviceInfo = GetDeviceInfo(Request),
                IpAddress = GetClientIpAddress(HttpContext),
                LastActiveAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(_tokenService.RefreshTokenExpiryDays),
                IsRevoked = false
            };

            _db.RefreshTokens.Add(refreshTokenEntity);
            await _db.SaveChangesAsync();

            var accessToken = _tokenService.GenerateAccessToken(identity, refreshTokenEntity.RefreshTokenId);

            var roles = identity.IdentityRoles
                .Where(ir => ir.Role != null)
                .Select(ir => ir.Role!.Name)
                .Distinct()
                .ToArray();

            if (roles.Length == 0 && identity.Role != null)
            {
                roles = new[] { identity.Role.Name };
            }

            return Ok(new AuthResponse(
                identity.IdentityId,
                identity.Name,
                identity.Email,
                roles.FirstOrDefault() ?? identity.Role?.Name ?? string.Empty,
                roles,
                accessToken,
                rawRefreshToken));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Login Exception]: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = $"Authentication error: {ex.Message}" });
        }
    }

    // ── 3. GOOGLE OAUTH LOGIN & AUTO-REGISTRATION ─────────────────────────────
    // When a user clicks "Sign In with Google", the frontend sends Google's JWT `idToken`.
    // 1. We cryptographically verify Google's signature using Google's public certificates.
    // 2. If the user does not exist in our DB, we auto-create an active account for them.
    // 3. PasswordHash gets a random GUID hash because Google users authenticate via OAuth, not password.
    // 4. We issue our CRM's JWT access token for API access.
    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.IdToken))
            {
                return BadRequest(new { message = "Google ID token is required." });
            }

            // Step A: Cryptographically validate the Google ID token with Google's public keys
            var googleUser = await _googleAuthService.ValidateIdTokenAsync(request.IdToken);
            if (googleUser is null || !googleUser.IsEmailVerified)
            {
                return Unauthorized(new { message = "Invalid or unverified Google authentication token." });
            }

            // Step B: Check if this Google user already exists in our database
            var identity = await _db.Identities
                .Include(i => i.Role)
                .Include(i => i.IdentityRoles)
                    .ThenInclude(ir => ir.Role)
                .SingleOrDefaultAsync(i => i.Email == googleUser.Email);

            if (identity is null)
            {
                // Step C: Auto-register first-time Google user with default SalesRep role
                var salesRepRole = await _db.Roles.SingleOrDefaultAsync(r => r.Name == "SalesRep");
                if (salesRepRole is null)
                {
                    return BadRequest(new { message = "SalesRep role is not configured in the database." });
                }

                identity = new Identity
                {
                    Name = googleUser.Name,
                    Email = googleUser.Email,
                    // Random password satisfying the NOT NULL constraint in SQL
                    PasswordHash = _passwordHasher.Hash(Guid.NewGuid().ToString("N")),
                    RoleId = salesRepRole.RoleId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _db.Identities.Add(identity);
                await _db.SaveChangesAsync();

                _db.IdentityRoles.Add(new IdentityRole { IdentityId = identity.IdentityId, RoleId = salesRepRole.RoleId });
                await _db.SaveChangesAsync();

                identity.Role = salesRepRole;
                identity.IdentityRoles = new List<IdentityRole> { new IdentityRole { IdentityId = identity.IdentityId, RoleId = salesRepRole.RoleId, Role = salesRepRole } };
            }
            else
            {
                // Step D: If account exists, verify it is active
                if (!identity.IsActive)
                {
                    return Unauthorized(new { message = "Account is deactivated. Please contact an administrator." });
                }
            }

            // Step E: Generate JWT access token & refresh token
            var rawRefreshToken = _tokenService.GenerateRefreshToken();

            var refreshTokenEntity = new RefreshToken
            {
                IdentityId = identity.IdentityId,
                TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
                DeviceInfo = GetDeviceInfo(Request),
                IpAddress = GetClientIpAddress(HttpContext),
                LastActiveAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(_tokenService.RefreshTokenExpiryDays),
                IsRevoked = false
            };

            _db.RefreshTokens.Add(refreshTokenEntity);
            await _db.SaveChangesAsync();

            var accessToken = _tokenService.GenerateAccessToken(identity, refreshTokenEntity.RefreshTokenId);

            var roles = identity.IdentityRoles
                .Where(ir => ir.Role != null)
                .Select(ir => ir.Role!.Name)
                .Distinct()
                .ToArray();

            if (roles.Length == 0 && identity.Role != null)
            {
                roles = new[] { identity.Role.Name };
            }

            return Ok(new AuthResponse(
                identity.IdentityId,
                identity.Name,
                identity.Email,
                roles.FirstOrDefault() ?? identity.Role?.Name ?? string.Empty,
                roles,
                accessToken,
                rawRefreshToken));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ── 4. TOKEN REFRESH ──────────────────────────────────────────────────────
    // Exchanges an expiring access token + valid refresh token for a fresh access token pair.
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request)
    {
        var incomingHash = _tokenService.HashRefreshToken(request.RefreshToken);

        var storedToken = await _db.RefreshTokens
            .Include(rt => rt.Identity)
                .ThenInclude(i => i!.Role)
            .Include(rt => rt.Identity)
                .ThenInclude(i => i!.IdentityRoles)
                    .ThenInclude(ir => ir.Role)
            .SingleOrDefaultAsync(rt => rt.TokenHash == incomingHash);

        if (storedToken is null || storedToken.IsRevoked || storedToken.ExpiresAt < DateTime.UtcNow)
        {
            return Unauthorized(new { message = "Invalid or expired refresh token." });
        }

        storedToken.IsRevoked = true;

        var identity = storedToken.Identity!;
        var newRawRefreshToken = _tokenService.GenerateRefreshToken();

        var newRefreshTokenEntity = new RefreshToken
        {
            IdentityId = identity.IdentityId,
            TokenHash = _tokenService.HashRefreshToken(newRawRefreshToken),
            DeviceInfo = GetDeviceInfo(Request) ?? storedToken.DeviceInfo,
            IpAddress = GetClientIpAddress(HttpContext) ?? storedToken.IpAddress,
            LastActiveAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_tokenService.RefreshTokenExpiryDays),
            IsRevoked = false
        };

        _db.RefreshTokens.Add(newRefreshTokenEntity);
        await _db.SaveChangesAsync();

        var newAccessToken = _tokenService.GenerateAccessToken(identity, newRefreshTokenEntity.RefreshTokenId);

        var roles = identity.IdentityRoles
            .Where(ir => ir.Role != null)
            .Select(ir => ir.Role!.Name)
            .Distinct()
            .ToArray();

        if (roles.Length == 0 && identity.Role != null)
        {
            roles = new[] { identity.Role.Name };
        }

        return Ok(new AuthResponse(
            identity.IdentityId,
            identity.Name,
            identity.Email,
            roles.FirstOrDefault() ?? identity.Role?.Name ?? string.Empty,
            roles,
            newAccessToken,
            newRawRefreshToken));
    }

    // ── 5. FORGOT PASSWORD ────────────────────────────────────────────────────
    // Generates a cryptographically random password reset token and sends an email link.
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var cleanEmail = request.Email?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanEmail))
        {
            return BadRequest(new { message = "Email is required." });
        }

        var identity = await _db.Identities.FirstOrDefaultAsync(i => i.Email.ToLower() == cleanEmail.ToLower());
        if (identity is null)
        {
            return Ok(new { message = "If that email exists, a reset link has been sent." });
        }

        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

        _db.PasswordResetTokens.RemoveRange(_db.PasswordResetTokens.Where(t => t.IdentityId == identity.IdentityId));
        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            IdentityId = identity.IdentityId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        });

        await _db.SaveChangesAsync();

        var resetUrl = $"http://localhost:5173/reset-password?token={rawToken}";
        var targetEmail = identity.Email;

        // Dispatch email sending in a non-blocking background thread for instant response
        _ = Task.Run(async () =>
        {
            try
            {
                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
                await _emailSender.SendPasswordResetAsync(targetEmail, resetUrl, cts.Token);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Email Dispatch Warning] Could not deliver reset email to {targetEmail}: {ex.Message}");
            }
        });

        return Ok(new { message = "If that email exists, a reset link has been sent." });
    }

    // ── 6. RESET PASSWORD ─────────────────────────────────────────────────────
    // Verifies the reset token hash and updates the user's password.
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var rawToken = request.Token?.Trim() ?? string.Empty;
        var newPass = request.NewPassword?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(rawToken) || string.IsNullOrWhiteSpace(newPass))
        {
            return BadRequest(new { message = "Token and password are required." });
        }

        if (newPass.Length < 8)
        {
            return BadRequest(new { message = "Password must be at least 8 characters long." });
        }

        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
        var resetToken = await _db.PasswordResetTokens
            .Include(t => t.Identity)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (resetToken is null || resetToken.ExpiresAt < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invalid or expired reset token." });
        }

        var userToUpdate = resetToken.Identity ?? await _db.Identities.FindAsync(resetToken.IdentityId);
        if (userToUpdate is null)
        {
            return BadRequest(new { message = "User account associated with this token was not found." });
        }

        userToUpdate.PasswordHash = _passwordHasher.Hash(newPass);
        _db.PasswordResetTokens.Remove(resetToken);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password reset successfully. You can now sign in with your new password." });
    }

    // ── 7. CURRENT USER PROFILE (/me) ─────────────────────────────────────────
    [Authorize]
    [HttpGet("me")]
    public ActionResult Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var email = User.FindFirstValue(ClaimTypes.Email);
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();
        var role = roles.FirstOrDefault();

        return Ok(new { userId, email, role, roles });
    }

    // ── 8. ADMIN ROLE CHECK ───────────────────────────────────────────────────
    [Authorize(Policy = "AdminOnly")]
    [HttpGet("admin-check")]
    public ActionResult AdminCheck()
    {
        return Ok(new { message = "You are an Admin. This proves AdminOnly policy works." });
    }

    // ── 9. ACTIVE SESSIONS MANAGEMENT ─────────────────────────────────────────
    [Authorize]
    [HttpGet("sessions")]
    public async Task<ActionResult> GetActiveSessions([FromQuery] string? currentRefreshToken = null)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        string? currentHash = null;
        if (!string.IsNullOrWhiteSpace(currentRefreshToken))
        {
            currentHash = _tokenService.HashRefreshToken(currentRefreshToken);
        }

        var rawSessions = await _db.RefreshTokens
            .Where(rt => rt.IdentityId == userId && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(rt => rt.LastActiveAt ?? rt.CreatedAt)
            .ToListAsync();

        var activeSessions = rawSessions.Select(rt => new
        {
            sessionId = rt.RefreshTokenId,
            deviceInfo = string.IsNullOrWhiteSpace(rt.DeviceInfo) ? "Web Browser" : rt.DeviceInfo,
            ipAddress = string.IsNullOrWhiteSpace(rt.IpAddress) ? "127.0.0.1" : rt.IpAddress,
            createdAt = rt.CreatedAt,
            lastActiveAt = rt.LastActiveAt ?? rt.CreatedAt,
            expiresAt = rt.ExpiresAt,
            isCurrentSession = currentHash != null ? rt.TokenHash == currentHash : false
        }).ToList();

        return Ok(activeSessions);
    }

    [Authorize]
    [HttpPost("sessions/revoke/{id:int}")]
    public async Task<ActionResult> RevokeSession(int id)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var session = await _db.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.RefreshTokenId == id && rt.IdentityId == userId);

        if (session is null)
        {
            return NotFound(new { message = "Session not found." });
        }

        session.IsRevoked = true;
        await _db.SaveChangesAsync();

        // Broadcast real-time SignalR event to instantly kick out revoked device
        await _hubContext.Clients.Group($"user_{userId}").SendAsync("SessionRevoked", new
        {
            sessionId = id,
            message = "Your session was terminated from another device."
        });

        return Ok(new { message = "Session revoked successfully." });
    }

    [Authorize]
    [HttpPost("sessions/revoke-others")]
    public async Task<ActionResult> RevokeOtherSessions([FromBody] RevokeOthersRequest? request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        string? currentHash = null;
        if (!string.IsNullOrWhiteSpace(request?.CurrentRefreshToken))
        {
            currentHash = _tokenService.HashRefreshToken(request.CurrentRefreshToken);
        }

        var sessionsToRevoke = await _db.RefreshTokens
            .Where(rt => rt.IdentityId == userId && !rt.IsRevoked && (currentHash == null || rt.TokenHash != currentHash))
            .ToListAsync();

        foreach (var s in sessionsToRevoke)
        {
            s.IsRevoked = true;
        }

        await _db.SaveChangesAsync();

        // Broadcast real-time SignalR event to all devices of this user
        await _hubContext.Clients.Group($"user_{userId}").SendAsync("SessionRevoked", new
        {
            message = "Your session was logged out from another device."
        });

        return Ok(new { message = $"Revoked {sessionsToRevoke.Count} other active session(s)." });
    }

    [Authorize]
    [HttpPost("sessions/revoke-all")]
    public async Task<ActionResult> RevokeAllSessions()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var sessions = await _db.RefreshTokens
            .Where(rt => rt.IdentityId == userId && !rt.IsRevoked)
            .ToListAsync();

        foreach (var s in sessions)
        {
            s.IsRevoked = true;
        }

        await _db.SaveChangesAsync();

        await _hubContext.Clients.Group($"user_{userId}").SendAsync("SessionRevoked", new
        {
            all = true,
            message = "All sessions have been terminated. Please log in again."
        });

        return Ok(new { message = "All sessions revoked." });
    }

    // ── 10. SESSION STATUS CHECK ──────────────────────────────────────────────
    [HttpPost("check-session")]
    public async Task<ActionResult> CheckSession([FromBody] RefreshRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Ok(new { isRevoked = true });
        }

        var incomingHash = _tokenService.HashRefreshToken(request.RefreshToken);
        var token = await _db.RefreshTokens
            .AsNoTracking()
            .FirstOrDefaultAsync(rt => rt.TokenHash == incomingHash);

        if (token is null || token.IsRevoked || token.ExpiresAt < DateTime.UtcNow)
        {
            return Ok(new { isRevoked = true });
        }

        return Ok(new { isRevoked = false });
    }

    // ── HELPER METHODS ────────────────────────────────────────────────────────
    private string GetDeviceInfo(HttpRequest request)
    {
        var ua = request.Headers["User-Agent"].ToString();
        if (string.IsNullOrWhiteSpace(ua)) return "Web Browser";

        string os = "Device";
        if (ua.Contains("Windows NT 10.0") || ua.Contains("Windows 10") || ua.Contains("Windows 11")) os = "Windows";
        else if (ua.Contains("Macintosh") || ua.Contains("Mac OS X")) os = "macOS";
        else if (ua.Contains("iPhone")) os = "iPhone";
        else if (ua.Contains("iPad")) os = "iPad";
        else if (ua.Contains("Android")) os = "Android";
        else if (ua.Contains("Linux")) os = "Linux";

        string browser = "Browser";
        if (ua.Contains("Edg/")) browser = "Edge";
        else if (ua.Contains("Chrome/") && !ua.Contains("Edg/")) browser = "Chrome";
        else if (ua.Contains("Firefox/")) browser = "Firefox";
        else if (ua.Contains("Safari/") && !ua.Contains("Chrome")) browser = "Safari";

        return $"{browser} on {os}";
    }

    private string GetClientIpAddress(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor) && !string.IsNullOrWhiteSpace(forwardedFor))
        {
            var ip = forwardedFor.ToString().Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(ip)) return ip;
        }

        var remoteIp = context.Connection.RemoteIpAddress?.ToString();
        if (remoteIp == "::1" || remoteIp == "127.0.0.1") return "127.0.0.1 (Local)";
        return string.IsNullOrWhiteSpace(remoteIp) ? "127.0.0.1" : remoteIp;
    }
}
