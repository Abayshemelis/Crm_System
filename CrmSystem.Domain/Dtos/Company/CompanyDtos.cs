using System.ComponentModel.DataAnnotations;

namespace CrmSystem.Domain.Dtos.Company;

// ── Read ────────────────────────────────────────────────────────────────────
public record CompanyReadDto(
    int CompanyId,
    string Name,
    string? Industry,
    string? CompanySize,
    string? Website,
    string? Address,
    string? Phone,
    string? Email,
    int? SourceId,
    string? SourceName,
    int? AssignedRepId,
    string? AssignedRepName,
    string? ContactPersonName,
    int? ContactPersonCustomerId,
    DateTime CreatedAt,
    decimal TotalPipelineValue,
    IEnumerable<CompanyContactDto> Contacts
);

public record CompanyContactDto(
    int CustomerId,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? JobTitle
);

public record CompanySummaryDto(
    int CompanyId,
    string Name,
    string? Industry,
    string? CompanySize,
    int? AssignedRepId,
    string? AssignedRepName
);

// ── Create ──────────────────────────────────────────────────────────────────
public record CompanyCreateDto(
    [Required, StringLength(100)] string Name,
    string? Industry,
    string? CompanySize,
    [Url] string? Website,
    string? Address,
    string? Phone,
    [EmailAddress] string? Email,
    int? SourceId,
    int? AssignedRepId,
    string? ContactPersonName,
    int? ContactPersonCustomerId
);

// ── Update ──────────────────────────────────────────────────────────────────
public record CompanyUpdateDto(
    [Required, StringLength(100)] string Name,
    string? Industry,
    string? CompanySize,
    [Url] string? Website,
    string? Address,
    string? Phone,
    [EmailAddress] string? Email,
    int? SourceId,
    int? AssignedRepId,
    string? ContactPersonName,
    int? ContactPersonCustomerId
);
