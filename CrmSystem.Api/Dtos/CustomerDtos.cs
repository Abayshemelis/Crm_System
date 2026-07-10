using System.ComponentModel.DataAnnotations;

namespace CrmSystem.Api.Dtos;

public record CreateCustomerRequest(
    [Required][MaxLength(100)] string FirstName,
    [Required][MaxLength(100)] string LastName,
    [Required][EmailAddress][MaxLength(255)] string Email,
    [MaxLength(30)] string? Phone,
    [MaxLength(100)] string? JobTitle,
    int? CompanyId,
    int? SourceId,
    int? AssignedRepId);

public record UpdateCustomerRequest(
    [Required][MaxLength(100)] string FirstName,
    [Required][MaxLength(100)] string LastName,
    [Required][EmailAddress][MaxLength(255)] string Email,
    [MaxLength(30)] string? Phone,
    [MaxLength(100)] string? JobTitle,
    int? CompanyId,
    int? SourceId,
    int? AssignedRepId);

public record CustomerSummaryDto(
    int CustomerId,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? JobTitle,
    int? CompanyId,
    string? CompanyName,
    int? SourceId,
    string? SourceName,
    int AssignedRepId,
    string AssignedRepName,
    DateTime CreatedAt);

public record CustomerDetailDto(
    int CustomerId,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? JobTitle,
    int? CompanyId,
    string? CompanyName,
    int? SourceId,
    string? SourceName,
    int AssignedRepId,
    string AssignedRepName,
    string AssignedRepEmail,
    DateTime CreatedAt);

public class CustomerListQuery : PaginationQuery
{
    public string? Search { get; set; }
    public int? CompanyId { get; set; }
    public int? RepId { get; set; }
    public int? SourceId { get; set; }
}

