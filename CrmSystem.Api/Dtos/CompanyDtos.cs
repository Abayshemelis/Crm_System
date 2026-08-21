using System.ComponentModel.DataAnnotations;

namespace CrmSystem.Api.Dtos;

public record CreateCompanyRequest(
    [Required][MaxLength(150)] string Name,
    [MaxLength(100)] string? Industry,
    [MaxLength(50)] string? CompanySize,
    [MaxLength(255)] string? Website,
    [MaxLength(255)] string? Address,
    [MaxLength(30)] string? Phone,
    [EmailAddress][MaxLength(255)] string? Email,
    int? SourceId,
    int? AssignedRepId,
    string? CustomFieldsJson = null);

public record UpdateCompanyRequest(
    [Required][MaxLength(150)] string Name,
    [MaxLength(100)] string? Industry,
    [MaxLength(50)] string? CompanySize,
    [MaxLength(255)] string? Website,
    [MaxLength(255)] string? Address,
    [MaxLength(30)] string? Phone,
    [EmailAddress][MaxLength(255)] string? Email,
    int? SourceId,
    int? AssignedRepId,
    string? CustomFieldsJson = null);

public record CompanySummaryDto(
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
    int ContactCount,
    bool IsDeleted,
    string? CustomFieldsJson = null);

public record CompanyContactDto(
    int CustomerId,
    string FirstName,
    string LastName,
    string Email,
    string? Phone);

public record CompanyDetailDto(
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
    string? AssignedRepEmail,
    decimal TotalOpenPipelineValue,
    IReadOnlyList<CompanyContactDto> Contacts,
    bool IsDeleted,
    string? CustomFieldsJson = null);

public class CompanyListQuery : PaginationQuery
{
    public string? Search { get; set; }
    public int? RepId { get; set; }
    public DateTime? CreatedFrom { get; set; }
    public DateTime? CreatedTo { get; set; }
    public bool IncludeDeleted { get; set; }
}

