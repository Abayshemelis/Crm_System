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

    public AuthController(
        AppDbContext db,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IEmailSender emailSender,
        IGoogleAuthService googleAuthService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _emailSender = emailSender;
        _googleAuthService = googleAuthService;
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
        var cleanEmail = request.Email?.Trim() ?? string.Empty;
        var cleanPassword = request.Password?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(cleanEmail) || string.IsNullOrWhiteSpace(cleanPassword))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(cleanEmail))
        {
            return BadRequest(new { message = "Invalid email format." });
        }

        var identity = await _db.Identities
            .Include(i => i.Role)
            .Include(i => i.IdentityRoles)
                .ThenInclude(ir => ir.Role)
            .FirstOrDefaultAsync(i => i.Email.ToLower() == cleanEmail.ToLower());

        if (identity is null || !_passwordHasher.Verify(cleanPassword, identity.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (!identity.IsActive)
        {
            return Unauthorized(new { message = "Account is deactivated. Please contact an administrator." });
        }

        var accessToken = _tokenService.GenerateAccessToken(identity);
        var rawRefreshToken = _tokenService.GenerateRefreshToken();

        var refreshTokenEntity = new RefreshToken
        {
            IdentityId = identity.IdentityId,
            TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(_tokenService.RefreshTokenExpiryDays),
            IsRevoked = false
        };

        _db.RefreshTokens.Add(refreshTokenEntity);
        await _db.SaveChangesAsync();

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
            var accessToken = _tokenService.GenerateAccessToken(identity);
            var rawRefreshToken = _tokenService.GenerateRefreshToken();

            var refreshTokenEntity = new RefreshToken
            {
                IdentityId = identity.IdentityId,
                TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(_tokenService.RefreshTokenExpiryDays),
                IsRevoked = false
            };

            _db.RefreshTokens.Add(refreshTokenEntity);
            await _db.SaveChangesAsync();

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
        var newAccessToken = _tokenService.GenerateAccessToken(identity);
        var newRawRefreshToken = _tokenService.GenerateRefreshToken();

        var newRefreshTokenEntity = new RefreshToken
        {
            IdentityId = identity.IdentityId,
            TokenHash = _tokenService.HashRefreshToken(newRawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(_tokenService.RefreshTokenExpiryDays),
            IsRevoked = false
        };

        _db.RefreshTokens.Add(newRefreshTokenEntity);
        await _db.SaveChangesAsync();

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
}
