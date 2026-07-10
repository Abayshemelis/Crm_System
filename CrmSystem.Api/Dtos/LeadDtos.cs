using System.ComponentModel.DataAnnotations;
using CrmSystem.Domain.Entities;

namespace CrmSystem.Api.Dtos;

public record CreateLeadRequest(
    [Required][MaxLength(100)] string FirstName,
    [Required][MaxLength(100)] string LastName,
    [EmailAddress][MaxLength(255)] string? Email,
    [MaxLength(30)] string? Phone,
    [MaxLength(100)] string? JobTitle,
    [MaxLength(150)] string? CompanyName,
    int? SourceId,
    int? LeadStatusId,
    int? AssignedRepId,
    string? Notes);

public record UpdateLeadRequest(
    [Required][MaxLength(100)] string FirstName,
    [Required][MaxLength(100)] string LastName,
    [EmailAddress][MaxLength(255)] string? Email,
    [MaxLength(30)] string? Phone,
    [MaxLength(100)] string? JobTitle,
    [MaxLength(150)] string? CompanyName,
    int? SourceId,
    int? LeadStatusId,
    int? AssignedRepId,
    string? Notes);

public record ConvertLeadRequest(
    [MaxLength(100)] string? FirstName,
    [MaxLength(100)] string? LastName,
    [EmailAddress][MaxLength(255)] string? Email,
    [MaxLength(30)] string? Phone,
    int? CompanyId,
    bool CreateCompany = false,
    [MaxLength(150)] string? CompanyName = null,
    bool CreateInitialOpportunity = false,
    [MaxLength(150)] string? OpportunityTitle = null);

public record LeadSummaryDto(
    int LeadId,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? JobTitle,
    string? CompanyName,
    int? SourceId,
    string? SourceName,
    int? LeadStatusId,
    string? LeadStatusName,
    int? AssignedRepId,
    string? AssignedRepName,
    DateTime CreatedAt);

public record LeadDetailDto(
    int LeadId,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? JobTitle,
    string? CompanyName,
    int? SourceId,
    string? SourceName,
    int? LeadStatusId,
    string? LeadStatusName,
    int? AssignedRepId,
    string? AssignedRepName,
    int? ConvertedCustomerId,
    string? Notes,
    DateTime CreatedAt);

public record ConvertLeadResponse(
    int LeadId,
    int CustomerId,
    int? CompanyId,
    string Message);

public class LeadListQuery : PaginationQuery
{
    public int? LeadStatusId { get; set; }
    public int? SourceId { get; set; }
    public int? RepId { get; set; }
    public bool ShowConverted { get; set; }
}
