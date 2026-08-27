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
                .Select(v => {
                    if (string.Equals(v, "Administrator", StringComparison.OrdinalIgnoreCase) || string.Equals(v, "Admin", StringComparison.OrdinalIgnoreCase) || string.Equals(v, "SuperAdmin", StringComparison.OrdinalIgnoreCase)) return UserRole.Admin;
                    if (string.Equals(v, "SalesManager", StringComparison.OrdinalIgnoreCase) || string.Equals(v, "Manager", StringComparison.OrdinalIgnoreCase) || string.Equals(v, "TeamLead", StringComparison.OrdinalIgnoreCase)) return UserRole.Manager;
                    if (string.Equals(v, "SalesRep", StringComparison.OrdinalIgnoreCase) || string.Equals(v, "Sales Representative", StringComparison.OrdinalIgnoreCase) || string.Equals(v, "Representative", StringComparison.OrdinalIgnoreCase) || string.Equals(v, "User", StringComparison.OrdinalIgnoreCase)) return UserRole.SalesRep;
                    return Enum.TryParse<UserRole>(v, true, out var role) ? role : (UserRole?)null;
                })
                .Where(r => r.HasValue)
                .Select(r => r!.Value)
                .ToList();

            if (!string.IsNullOrWhiteSpace(headerRole))
            {
                UserRole? selectedRole = null;
                if (string.Equals(headerRole, "Administrator", StringComparison.OrdinalIgnoreCase) || string.Equals(headerRole, "Admin", StringComparison.OrdinalIgnoreCase)) selectedRole = UserRole.Admin;
                else if (string.Equals(headerRole, "SalesManager", StringComparison.OrdinalIgnoreCase) || string.Equals(headerRole, "Manager", StringComparison.OrdinalIgnoreCase)) selectedRole = UserRole.Manager;
                else if (string.Equals(headerRole, "SalesRep", StringComparison.OrdinalIgnoreCase)) selectedRole = UserRole.SalesRep;
                else if (Enum.TryParse<UserRole>(headerRole, true, out var r)) selectedRole = r;

                if (selectedRole.HasValue && (parsedRoles.Contains(UserRole.Admin) || parsedRoles.Contains(selectedRole.Value)))
                {
                    return new List<UserRole> { selectedRole.Value };
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
