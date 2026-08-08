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
    string? Notes,
    string? Priority = "Medium",
    int LeadScore = 0,
    DateTime? NextFollowUpDate = null,
    string? NextFollowUpType = null,
    string? NextFollowUpNotes = null,
    int? NextFollowUpAssignedToId = null,
    string? CustomFieldsJson = null);

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
    string? Notes,
    string? Priority = "Medium",
    int LeadScore = 0,
    DateTime? NextFollowUpDate = null,
    string? NextFollowUpType = null,
    string? NextFollowUpNotes = null,
    int? NextFollowUpAssignedToId = null,
    string? CustomFieldsJson = null);

public record ScheduleFollowUpRequest(
    [Required] DateTime FollowUpDate,
    [Required][MaxLength(50)] string FollowUpType,
    [MaxLength(2000)] string? Notes,
    int? AssignedToId);

public record MarkLeadLostRequest(
    [Required][MaxLength(1000)] string LostReason);

public record LeadDashboardMetricsDto(
    int TotalLeads,
    int NewLeads,
    int FollowUpTodayCount,
    int OverdueFollowUpCount,
    int QualifiedLeads,
    int ConvertedLeads,
    int LostLeads,
    double ConversionRate);

public record ConvertLeadRequest(
    [MaxLength(100)] string? FirstName,
    [MaxLength(100)] string? LastName,
    [EmailAddress][MaxLength(255)] string? Email,
    [MaxLength(30)] string? Phone,
    int? CompanyId,
    bool CreateCompany = false,
    [MaxLength(150)] string? CompanyName = null,
    bool CreateInitialOpportunity = false,
    [MaxLength(150)] string? OpportunityTitle = null,
    decimal? OpportunityEstimatedValue = null,
    DateTime? OpportunityExpectedCloseDate = null);

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
    string? Priority,
    int LeadScore,
    string? LostReason,
    DateTime? NextFollowUpDate,
    string? NextFollowUpType,
    string? NextFollowUpNotes,
    int? NextFollowUpAssignedToId,
    string? NextFollowUpAssignedToName,
    DateTime? LastActivityAt,
    DateTime CreatedAt,
    string? CustomFieldsJson = null);

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
    int? CreatedById,
    DateTime? ConvertedAt,
    int? ConvertedById,
    int? ConvertedOpportunityId,
    string? Notes,
    string? Priority,
    int LeadScore,
    string? LostReason,
    DateTime? NextFollowUpDate,
    string? NextFollowUpType,
    string? NextFollowUpNotes,
    int? NextFollowUpAssignedToId,
    string? NextFollowUpAssignedToName,
    DateTime? LastActivityAt,
    DateTime CreatedAt,
    string? CustomFieldsJson = null);

public record ConvertLeadResponse(
    int LeadId,
    int CustomerId,
    int? CompanyId,
    int? OpportunityId,
    string Message);

public class LeadListQuery : PaginationQuery
{
    public string? Search { get; set; }
    public int? LeadStatusId { get; set; }
    public int? SourceId { get; set; }
    public int? RepId { get; set; }
    public string? Priority { get; set; }
    public string? FollowUpFilter { get; set; } // "today", "overdue", "upcoming"
    public string? Company { get; set; }
    public bool ShowConverted { get; set; }
    public DateTime? CreatedFrom { get; set; }
    public DateTime? CreatedTo { get; set; }
    public DateTime? LastActivityFrom { get; set; }
    public DateTime? LastActivityTo { get; set; }
}


