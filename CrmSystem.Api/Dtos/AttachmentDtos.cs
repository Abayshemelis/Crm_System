using Microsoft.AspNetCore.Http;

namespace CrmSystem.Api.Dtos;

public sealed record AttachmentUploadDto(
    IFormFile? File,
    int? CustomerId,
    int? CompanyId,
    int? OpportunityId
);
