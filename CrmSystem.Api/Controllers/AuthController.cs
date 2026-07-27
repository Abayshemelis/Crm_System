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

        // persist initial IdentityRole mapping
        _db.IdentityRoles.Add(new IdentityRole { IdentityId = identity.IdentityId, RoleId = salesRepRole.RoleId });
        await _db.SaveChangesAsync();

        return Ok(new AuthResponse(identity.IdentityId, identity.Name, identity.Email, salesRepRole.Name, new[] { salesRepRole.Name }, null, null));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(request.Email))
        {
            return BadRequest(new { message = "Invalid email format." });
        }

        var identity = await _db.Identities
            .Include(i => i.Role)
            .Include(i => i.IdentityRoles)
                .ThenInclude(ir => ir.Role)
            .SingleOrDefaultAsync(i => i.Email == request.Email);

        if (identity is null || !_passwordHasher.Verify(request.Password, identity.PasswordHash))
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

        var roles = identity.IdentityRoles.Select(ir => ir.Role!.Name).Distinct().ToArray();
        if (roles.Length == 0 && identity.Role != null)
        {
            roles = new[] { identity.Role.Name };
        }

        return Ok(new AuthResponse(identity.IdentityId, identity.Name, identity.Email, roles.FirstOrDefault() ?? identity.Role?.Name ?? string.Empty, roles, accessToken, rawRefreshToken));
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
        {
            return BadRequest(new { message = "Google ID token is required." });
        }

        var googleUser = await _googleAuthService.ValidateIdTokenAsync(request.IdToken);
        if (googleUser is null || !googleUser.IsEmailVerified)
        {
            return Unauthorized(new { message = "Invalid or unverified Google authentication token." });
        }

        var identity = await _db.Identities
            .Include(i => i.Role)
            .Include(i => i.IdentityRoles)
                .ThenInclude(ir => ir.Role)
            .SingleOrDefaultAsync(i => i.Email == googleUser.Email);

        if (identity is null)
        {
            // Auto-register first-time Google user
            var salesRepRole = await _db.Roles.SingleOrDefaultAsync(r => r.Name == "SalesRep");
            if (salesRepRole is null)
            {
                return BadRequest(new { message = "SalesRep role is not configured in the database." });
            }

            identity = new Identity
            {
                Name = googleUser.Name,
                Email = googleUser.Email,
                PasswordHash = _passwordHasher.Hash(Guid.NewGuid().ToString("N")),
                RoleId = salesRepRole.RoleId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.Identities.Add(identity);
            await _db.SaveChangesAsync();

            _db.IdentityRoles.Add(new IdentityRole { IdentityId = identity.IdentityId, RoleId = salesRepRole.RoleId });
            await _db.SaveChangesAsync();

            await SeedSampleDataForUserAsync(identity);

            identity.Role = salesRepRole;
            identity.IdentityRoles = new List<IdentityRole> { new IdentityRole { IdentityId = identity.IdentityId, RoleId = salesRepRole.RoleId, Role = salesRepRole } };
        }
        else
        {
            if (!identity.IsActive)
            {
                return Unauthorized(new { message = "Account is deactivated. Please contact an administrator." });
            }
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

        var roles = identity.IdentityRoles.Select(ir => ir.Role!.Name).Distinct().ToArray();
        if (roles.Length == 0 && identity.Role != null)
        {
            roles = new[] { identity.Role.Name };
        }

        return Ok(new AuthResponse(identity.IdentityId, identity.Name, identity.Email, roles.FirstOrDefault() ?? identity.Role?.Name ?? string.Empty, roles, accessToken, rawRefreshToken));
    }

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

        var roles = identity.IdentityRoles.Select(ir => ir.Role!.Name).Distinct().ToArray();
        return Ok(new AuthResponse(identity.IdentityId, identity.Name, identity.Email, roles.FirstOrDefault() ?? identity.Role?.Name ?? string.Empty, roles, newAccessToken, newRawRefreshToken));
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Email is required." });
        }

        var identity = await _db.Identities.SingleOrDefaultAsync(i => i.Email == request.Email);
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
        await _emailSender.SendPasswordResetAsync(identity.Email, resetUrl);

        return Ok(new { message = "If that email exists, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "Token and password are required." });
        }

        if (request.NewPassword.Length < 8)
        {
            return BadRequest(new { message = "Password must be at least 8 characters long." });
        }

        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.Token)));
        var resetToken = await _db.PasswordResetTokens
            .Include(t => t.Identity)
            .SingleOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (resetToken is null || resetToken.ExpiresAt < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invalid or expired reset token." });
        }

        resetToken.Identity!.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        _db.PasswordResetTokens.Remove(resetToken);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password reset successfully." });
    }

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

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("admin-check")]
    public ActionResult AdminCheck()
    {
        return Ok(new { message = "You are an Admin. This proves AdminOnly policy works." });
    }

    private async Task SeedSampleDataForUserAsync(Identity user)
    {
        try
        {
            var defaultSource = await _db.Sources.FirstOrDefaultAsync(s => s.Name == "Referral") ?? await _db.Sources.FirstOrDefaultAsync();
            var defaultStatus = await _db.LeadStatuses.FirstOrDefaultAsync(s => s.Name == "New") ?? await _db.LeadStatuses.FirstOrDefaultAsync();
            var defaultStage = await _db.OpportunityStages.FirstOrDefaultAsync(s => s.Name == "Qualified") ?? await _db.OpportunityStages.FirstOrDefaultAsync();
            var taskPendingStatus = await _db.CrmTaskStatuses.FirstOrDefaultAsync(s => s.Name == "Pending") ?? await _db.CrmTaskStatuses.FirstOrDefaultAsync();

            var company = new Company
            {
                Name = $"{user.Name}'s Client Corp",
                Phone = "+1 555-0199",
                Website = "https://clientcorp.example.com",
                CreatedAt = DateTime.UtcNow
            };
            _db.Companies.Add(company);
            await _db.SaveChangesAsync();

            var customer = new Customer
            {
                FirstName = "Alex",
                LastName = "Rivera",
                Email = $"alex.rivera.{(user.Name ?? "user").ToLower().Replace(" ", "")}@example.com",
                Phone = "+1 555-0123",
                JobTitle = "VP of Operations",
                CompanyId = company.CompanyId,
                AssignedRepId = user.IdentityId,
                SourceId = defaultSource?.SourceId,
                CreatedAt = DateTime.UtcNow
            };
            _db.Customers.Add(customer);

            var lead = new Lead
            {
                FirstName = "Sarah",
                LastName = "Chen",
                CompanyName = "TechStart Innovations",
                Email = $"sarah.chen.{(user.Name ?? "user").ToLower().Replace(" ", "")}@example.com",
                Phone = "+1 555-0188",
                JobTitle = "Chief Technology Officer",
                AssignedRepId = user.IdentityId,
                LeadStatusId = defaultStatus?.LeadStatusId,
                SourceId = defaultSource?.SourceId,
                Notes = "Interested in enterprise CRM integration and cloud workspace setup.",
                CreatedAt = DateTime.UtcNow
            };
            _db.Leads.Add(lead);
            await _db.SaveChangesAsync();

            var opportunity = new Opportunity
            {
                Title = $"{user.Name}'s Enterprise Opportunity",
                Description = "Onboarding deal for CRM deployment & team training.",
                CustomerId = customer.CustomerId,
                OwnerId = user.IdentityId,
                OpportunityStageId = defaultStage?.OpportunityStageId ?? 1,
                EstimatedValue = 3500.00m,
                ExpectedCloseDate = DateTime.UtcNow.AddDays(14),
                CreatedAt = DateTime.UtcNow
            };
            _db.Opportunities.Add(opportunity);
            await _db.SaveChangesAsync();

            var task = new CrmTask
            {
                Title = "Discovery Call with Alex Rivera",
                Description = "Review project scope and confirm CRM requirements.",
                AssignedToId = user.IdentityId,
                CreatedById = user.IdentityId,
                CustomerId = customer.CustomerId,
                OpportunityId = opportunity.OpportunityId,
                CrmTaskStatusId = taskPendingStatus?.CrmTaskStatusId ?? 1,
                DueDate = DateTime.UtcNow.AddDays(2),
                CreatedAt = DateTime.UtcNow
            };
            _db.CrmTasks.Add(task);
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Log but don't fail registration if sample seeding encounters an issue
            Console.WriteLine($"Sample data seeding warning for user {user.IdentityId}: {ex.Message}");
        }
    }
}
