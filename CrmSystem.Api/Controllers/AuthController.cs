using System.Security.Claims;
using CrmSystem.Api.Dtos;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;

    public AuthController(AppDbContext db, IPasswordHasher passwordHasher, ITokenService tokenService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

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

        return Ok(new AuthResponse(identity.IdentityId, identity.Name, identity.Email, salesRepRole.Name, null, null));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var identity = await _db.Identities
            .Include(i => i.Role)
            .SingleOrDefaultAsync(i => i.Email == request.Email);

        if (identity is null || !_passwordHasher.Verify(request.Password, identity.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
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

        return Ok(new AuthResponse(identity.IdentityId, identity.Name, identity.Email, identity.Role?.Name ?? string.Empty, accessToken, rawRefreshToken));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request)
    {
        var incomingHash = _tokenService.HashRefreshToken(request.RefreshToken);

        var storedToken = await _db.RefreshTokens
            .Include(rt => rt.Identity)
                .ThenInclude(i => i.Role)
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

        return Ok(new AuthResponse(identity.IdentityId, identity.Name, identity.Email, identity.Role?.Name ?? string.Empty, newAccessToken, newRawRefreshToken));
    }

    [Authorize]
    [HttpGet("me")]
    public ActionResult Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var email = User.FindFirstValue(ClaimTypes.Email);
        var role = User.FindFirstValue(ClaimTypes.Role);

        return Ok(new { userId, email, role });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("admin-check")]
    public ActionResult AdminCheck()
    {
        return Ok(new { message = "You are an Admin. This proves AdminOnly policy works." });
    }
}
