namespace CrmSystem.Domain.Entities;

public class RefreshToken
{
    public int RefreshTokenId { get; set; }
    public int IdentityId { get; set; }
    public Identity? Identity { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsRevoked { get; set; } = false;
}
