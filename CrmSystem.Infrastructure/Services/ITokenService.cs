using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CrmSystem.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CrmSystem.Infrastructure.Services;

public interface ITokenService
{
    string GenerateAccessToken(Identity identity);
    string GenerateRefreshToken();
    string HashRefreshToken(string rawToken);
    int RefreshTokenExpiryDays { get; }
}

public class JwtTokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public int RefreshTokenExpiryDays => 7;

    public string GenerateAccessToken(Identity identity)
    {
        var signingKey = _configuration["Jwt:SigningKey"]!;
        var issuer = _configuration["Jwt:Issuer"]!;
        var expiryMinutes = int.Parse(_configuration["Jwt:AccessTokenExpiryMinutes"]!);

        var roleNames = new List<string>();
        if (!string.IsNullOrWhiteSpace(identity.Role?.Name))
        {
            roleNames.Add(identity.Role.Name);
        }
        roleNames.AddRange(identity.IdentityRoles
            .Where(ir => !string.IsNullOrWhiteSpace(ir.Role?.Name))
            .Select(ir => ir.Role!.Name));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, identity.IdentityId.ToString()),
            new(ClaimTypes.Email, identity.Email),
            new(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64)
        };

        claims.AddRange(roleNames.Distinct().Select(role => new Claim(ClaimTypes.Role, role)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public string HashRefreshToken(string rawToken)
    {
        var bytes = Encoding.UTF8.GetBytes(rawToken);
        var hashBytes = SHA256.HashData(bytes);
        return Convert.ToBase64String(hashBytes);
    }
}
