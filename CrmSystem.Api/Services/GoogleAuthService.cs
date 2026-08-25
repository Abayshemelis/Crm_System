using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CrmSystem.Api.Services;

public class GoogleAuthService : IGoogleAuthService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GoogleAuthService> _logger;
    private readonly string? _expectedClientId;

    public GoogleAuthService(HttpClient httpClient, ILogger<GoogleAuthService> logger, IConfiguration? configuration = null)
    {
        _httpClient = httpClient;
        _logger = logger;
        _expectedClientId = configuration?["Google:ClientId"] ?? configuration?["Authentication:Google:ClientId"];
    }

    public async Task<GoogleUserInfo?> ValidateIdTokenAsync(string idToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idToken))
        {
            return null;
        }



        try
        {
            var response = await _httpClient.GetAsync(
                $"https://oauth2.googleapis.com/tokeninfo?id_token={Uri.EscapeDataString(idToken)}",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var userInfoRequest = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v3/userinfo");
                userInfoRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", idToken);
                response = await _httpClient.SendAsync(userInfoRequest, cancellationToken);
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Google token validation failed with status code {StatusCode}", response.StatusCode);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var jsonDoc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = jsonDoc.RootElement;

            if (!root.TryGetProperty("email", out var emailProp) || string.IsNullOrWhiteSpace(emailProp.GetString()))
            {
                _logger.LogWarning("Google ID Token missing email claim.");
                return null;
            }

            string email = emailProp.GetString()!;

            bool isVerified = false;
            if (root.TryGetProperty("email_verified", out var verifiedProp))
            {
                if (verifiedProp.ValueKind == JsonValueKind.True)
                {
                    isVerified = true;
                }
                else if (verifiedProp.ValueKind == JsonValueKind.False)
                {
                    isVerified = false;
                }
                else if (verifiedProp.ValueKind == JsonValueKind.String)
                {
                    isVerified = string.Equals(verifiedProp.GetString(), "true", StringComparison.OrdinalIgnoreCase);
                }
            }

            if (!isVerified)
            {
                _logger.LogWarning("Google ID Token email {Email} is not verified.", email);
                return null;
            }

            // Validate Audience / Client ID if configured
            if (!string.IsNullOrWhiteSpace(_expectedClientId))
            {
                var audMatches = false;
                if (root.TryGetProperty("aud", out var audProp) && string.Equals(audProp.GetString(), _expectedClientId, StringComparison.Ordinal))
                {
                    audMatches = true;
                }
                else if (root.TryGetProperty("azp", out var azpProp) && string.Equals(azpProp.GetString(), _expectedClientId, StringComparison.Ordinal))
                {
                    audMatches = true;
                }

                if (!audMatches)
                {
                    _logger.LogWarning("Google token audience mismatch for email {Email}", email);
                    return null;
                }
            }

            string name = root.TryGetProperty("name", out var nameProp) && !string.IsNullOrWhiteSpace(nameProp.GetString())
                ? nameProp.GetString()!
                : email.Split('@')[0];

            string sub = root.TryGetProperty("sub", out var subProp) && subProp.GetString() != null
                ? subProp.GetString()!
                : string.Empty;

            return new GoogleUserInfo(email, name, sub, true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating Google ID Token");
            return null;
        }
    }
}
