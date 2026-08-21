// ==============================================================================
// CRM SYSTEM DATA TRANSFER OBJECTS: AUTHENTICATION (AuthDtos.cs)
// ==============================================================================
// Immutable records defining the request and response contracts for the auth system.
// ==============================================================================

namespace CrmSystem.Api.Dtos;

// User self-registration payload
public record RegisterRequest(string Name, string Email, string Password);

// Standard email/password login payload
public record LoginRequest(string Email, string Password);

// Google OAuth ID Token payload
public record GoogleLoginRequest(string IdToken);

// Token rotation request payload
public record RefreshRequest(string RefreshToken);

// Password recovery initiation payload
public record ForgotPasswordRequest(string Email);

// Password reset completion payload
public record ResetPasswordRequest(string Token, string NewPassword);

// Authenticated session response containing user details, assigned roles, and JWT tokens
public record AuthResponse(
    int UserId,
    string Name,
    string Email,
    string Role,
    string[] Roles,
    string? AccessToken,
    string? RefreshToken);
