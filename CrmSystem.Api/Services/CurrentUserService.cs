using System.Security.Claims;
using CrmSystem.Domain.Entities;

namespace CrmSystem.Api.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated == true;

    public int? UserId
    {
        get
        {
            var value = User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User?.FindFirstValue("sub");

            return int.TryParse(value, out var userId) ? userId : null;
        }
    }

    public string? Email => User?.FindFirstValue(ClaimTypes.Email);

    public IReadOnlyList<UserRole> Roles
    {
        get
        {
            var headerRole = _httpContextAccessor.HttpContext?.Request.Headers["X-Selected-Role"].FirstOrDefault()
                ?? _httpContextAccessor.HttpContext?.Request.Headers["X-Role-Override"].FirstOrDefault();

            var values = User?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList() ?? new List<string>();
            var parsedRoles = values
                .Select(v => Enum.TryParse<UserRole>(v, out var role) ? role : (UserRole?)null)
                .Where(r => r.HasValue)
                .Select(r => r!.Value)
                .ToList();

            if (!string.IsNullOrWhiteSpace(headerRole) && Enum.TryParse<UserRole>(headerRole, true, out var selectedRole))
            {
                // If user is Admin or has that role, allow role simulation/selection
                if (parsedRoles.Contains(UserRole.Admin) || parsedRoles.Contains(selectedRole))
                {
                    return new List<UserRole> { selectedRole };
                }
            }

            return parsedRoles;
        }
    }

    public UserRole? Role => Roles.FirstOrDefault();

    public bool IsAdmin => Roles.Contains(UserRole.Admin);

    public bool IsManagerOrAbove => Roles.Contains(UserRole.Manager) || Roles.Contains(UserRole.Admin);

    public bool CanAccessOwnedRecord(int? ownerRepId)
    {
        if (!IsAuthenticated || UserId is null)
        {
            return false;
        }

        if (IsManagerOrAbove)
        {
            return true;
        }

        return ownerRepId == null || ownerRepId == UserId;
    }
}
