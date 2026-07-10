using System.ComponentModel.DataAnnotations;

namespace CrmSystem.Api.Dtos;

public record CreateCompanyRequest(
    [Required][MaxLength(150)] string Name,
    [MaxLength(100)] string? Industry,
    [MaxLength(255)] string? Website,
    [MaxLength(255)] string? Address,
    int? AssignedRepId);

public record UpdateCompanyRequest(
    [Required][MaxLength(150)] string Name,
    [MaxLength(100)] string? Industry,
    [MaxLength(255)] string? Website,
    [MaxLength(255)] string? Address,
    int? AssignedRepId);

public record CompanySummaryDto(
    int CompanyId,
    string Name,
    string? Industry,
    string? Website,
    int? AssignedRepId,
    string? AssignedRepName,
    int ContactCount);

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
    string? Website,
    string? Address,
    int? AssignedRepId,
    string? AssignedRepName,
    string? AssignedRepEmail,
    decimal TotalOpenPipelineValue,
    IReadOnlyList<CompanyContactDto> Contacts);

public class CompanyListQuery : PaginationQuery
{
    public string? Search { get; set; }
    public int? RepId { get; set; }
}
