namespace CrmSystem.Api.Services;

public record GoogleUserInfo(string Email, string Name, string Sub, bool IsEmailVerified);

public interface IGoogleAuthService
{
    Task<GoogleUserInfo?> ValidateIdTokenAsync(string idToken, CancellationToken cancellationToken = default);
}
