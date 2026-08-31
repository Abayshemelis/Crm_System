namespace CrmSystem.Domain.Entities;

public class RefreshToken
{
    public int RefreshTokenId { get; set; }
    public int IdentityId { get; set; }
    public Identity? Identity { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public string? DeviceInfo { get; set; }
    public string? IpAddress { get; set; }
    public DateTime? LastActiveAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsRevoked { get; set; } = false;
}
