namespace CrmSystem.Domain.Dtos.Customer;

// ── Read ────────────────────────────────────────────────────────────────────
public record CustomerReadDto(
    int CustomerId,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? JobTitle,
    int? SourceId,
    string? SourceName,
    int? CompanyId,
    string? CompanyName,
    int? AssignedRepId,
    string? AssignedRepName,
    DateTime CreatedAt,
    IEnumerable<TagDto> Tags
);

public record TagDto(int TagId, string Name);

// ── Create ──────────────────────────────────────────────────────────────────
public record CustomerCreateDto(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? JobTitle,
    int? SourceId,
    int? CompanyId,
    int? AssignedRepId
);

// ── Update ──────────────────────────────────────────────────────────────────
public record CustomerUpdateDto(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? JobTitle,
    int? SourceId,
    int? CompanyId,
    int? AssignedRepId
);

// ── Bulk action ─────────────────────────────────────────────────────────────
public record BulkCustomerActionDto(
    IEnumerable<int> CustomerIds,
    string Action,      // "tag" | "reassign" | "export"
    int? TagId,
    int? NewRepId
);
