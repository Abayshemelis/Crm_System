using CrmSystem.Domain.Entities;

namespace CrmSystem.Api.Services;

public interface ICurrentUserService
{
    int? UserId { get; }
    string? Email { get; }
    IReadOnlyList<UserRole> Roles { get; }
    UserRole? Role { get; }
    bool IsAuthenticated { get; }
    bool IsAdmin { get; }
    bool IsManagerOrAbove { get; }
    bool CanAccessOwnedRecord(int? ownerRepId);
}
