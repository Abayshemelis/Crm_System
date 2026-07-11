using System.ComponentModel.DataAnnotations;

namespace CrmSystem.Api.Dtos;

public record CustomerTagDto(int TagId, string Name);

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

public record PatchCustomerRequest(
    [MaxLength(100)] string? FirstName,
    [MaxLength(100)] string? LastName,
    [EmailAddress][MaxLength(255)] string? Email,
    [MaxLength(30)] string? Phone,
    [MaxLength(100)] string? JobTitle,
    int? CompanyId,
    int? SourceId);

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
    DateTime CreatedAt,
    IReadOnlyList<CustomerTagDto> Tags);

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
    DateTime CreatedAt,
    IReadOnlyList<CustomerTagDto> Tags);

public record BulkCustomerActionRequest(
    [Required] IEnumerable<int> CustomerIds,
    [Required] string Action,
    int? TagId,
    int? NewRepId);

public record CustomerActivityDto(
    int ActivityId,
    string ActivityTypeName,
    string Subject,
    string? Description,
    DateTime ActivityDate,
    int DurationMinutes,
    string CreatedByName);

public record CustomerTaskDto(
    int CrmTaskId,
    string Title,
    string? Description,
    DateTime? DueDate,
    string StatusName,
    string? AssignedToName);

public record AuditLogEntryDto(
    int AuditLogId,
    string ActionName,
    string? FieldName,
    string? OldValue,
    string? NewValue,
    string ChangedByName,
    DateTime ChangedAt);

public class CustomerListQuery : PaginationQuery
{
    public string? Search { get; set; }
    public int? CompanyId { get; set; }
    public int? RepId { get; set; }
    public int? SourceId { get; set; }
    public List<int>? TagIds { get; set; }
}
