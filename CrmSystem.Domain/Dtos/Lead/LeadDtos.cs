namespace CrmSystem.Domain.Dtos.Lead;

// ── Read ────────────────────────────────────────────────────────────────────
public record LeadReadDto(
    int LeadId,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? CompanyName,
    string? JobTitle,
    int? SourceId,
    string? SourceName,
    int LeadStatusId,
    string LeadStatusName,
    int? AssignedRepId,
    string? AssignedRepName,
    int? ConvertedCustomerId,
    string? Notes,
    DateTime CreatedAt
);

// ── Create ──────────────────────────────────────────────────────────────────
public record LeadCreateDto(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? CompanyName,
    string? JobTitle,
    int? SourceId,
    int? AssignedRepId,
    string? Notes
);

// ── Update ──────────────────────────────────────────────────────────────────
public record LeadUpdateDto(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? CompanyName,
    string? JobTitle,
    int? SourceId,
    int LeadStatusId,
    int? AssignedRepId,
    string? Notes
);

// ── Convert ─────────────────────────────────────────────────────────────────
public record LeadConvertDto(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    int? AssignedRepId,

    // Optional: link to (or create) a company
    int? ExistingCompanyId,
    string? NewCompanyName,

    // Optional: create an initial opportunity
    bool CreateInitialOpportunity,
    string? OpportunityTitle,
    decimal? OpportunityValue,
    int? OpportunityStageId
);
