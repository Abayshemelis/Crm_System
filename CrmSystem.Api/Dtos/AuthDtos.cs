namespace CrmSystem.Api.Dtos;

public record RegisterRequest(string Name, string Email, string Password);

public record LoginRequest(string Email, string Password);

public record AuthResponse(int UserId, string Name, string Email, string Role);
