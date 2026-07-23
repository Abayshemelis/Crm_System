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
            var values = User?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList() ?? new List<string>();
            return values
                .Select(v => Enum.TryParse<UserRole>(v, out var role) ? role : (UserRole?)null)
                .Where(r => r.HasValue)
                .Select(r => r!.Value)
                .ToList();
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

        return ownerRepId == UserId;
    }
}
