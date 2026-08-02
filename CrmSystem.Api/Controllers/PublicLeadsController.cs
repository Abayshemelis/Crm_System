using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

public class PublicLeadCaptureDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? CompanyName { get; set; }
    public string? JobTitle { get; set; }
    public string? Notes { get; set; }
    public string? SourceName { get; set; }
}

[AllowAnonymous]
[ApiController]
[Route("api/public/leads")]
public class PublicLeadsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _auditService;

    public PublicLeadsController(AppDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    /// <summary>
    /// POST /api/public/leads/capture
    /// Public endpoint for website contact forms and inbound webhooks.
    /// </summary>
    [HttpPost("capture")]
    public async Task<IActionResult> CaptureLead([FromBody] PublicLeadCaptureDto dto, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.FirstName) || string.IsNullOrWhiteSpace(dto.LastName))
        {
            return BadRequest(new { message = "First name and last name are required." });
        }

        // 1. Resolve Lead Status (Default to New status)
        var newStatus = await _db.LeadStatuses.FirstOrDefaultAsync(s => s.Name == "New", cancellationToken)
                        ?? await _db.LeadStatuses.FirstOrDefaultAsync(cancellationToken);

        if (newStatus == null)
        {
            return StatusCode(500, new { message = "System lead statuses are not configured." });
        }

        // 2. Resolve or Create Source (Default to Website Form)
        var sourceName = string.IsNullOrWhiteSpace(dto.SourceName) ? "Website Form" : dto.SourceName.Trim();
        var source = await _db.Sources.FirstOrDefaultAsync(s => s.Name == sourceName, cancellationToken);
        if (source == null)
        {
            source = new Source { Name = sourceName, IsActive = true };
            _db.Sources.Add(source);
            await _db.SaveChangesAsync(cancellationToken);
        }

        // 3. Assign Default Rep (First active sales rep or admin identity)
        var defaultRep = await _db.Identities.FirstOrDefaultAsync(u => u.IsActive, cancellationToken);

        // 4. Create Lead Record
        var lead = new Lead
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = dto.Email?.Trim(),
            Phone = dto.Phone?.Trim(),
            CompanyName = dto.CompanyName?.Trim(),
            JobTitle = dto.JobTitle?.Trim(),
            Notes = dto.Notes?.Trim(),
            LeadStatusId = newStatus.LeadStatusId,
            SourceId = source.SourceId,
            AssignedRepId = defaultRep?.IdentityId,
            Priority = "Medium",
            LeadScore = 10,
            CreatedAt = DateTime.UtcNow
        };

        _db.Leads.Add(lead);
        await _db.SaveChangesAsync(cancellationToken);

        // 5. Audit Log Entry (Lead entity type ID = 1)
        try
        {
            await _auditService.LogFieldChangeAsync(
                entityTypeId: 1,
                entityId: lead.LeadId,
                fieldName: "LeadSource",
                oldValue: null,
                newValue: sourceName,
                actionTypeName: "Create",
                changedById: defaultRep?.IdentityId ?? 1
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PublicLeads] Audit logging warning: {ex.Message}");
        }

        return Ok(new
        {
            success = true,
            leadId = lead.LeadId,
            message = "Lead successfully captured via public web form."
        });
    }
}
