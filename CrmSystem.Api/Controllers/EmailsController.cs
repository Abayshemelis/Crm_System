using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Activity;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

public class SendEmailRequestDto
{
    public string ToEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public int? LeadId { get; set; }
    public int? CustomerId { get; set; }
    public int? OpportunityId { get; set; }
}

public class InboundEmailDto
{
    public string FromEmail { get; set; } = string.Empty;
    public string ToEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyText { get; set; } = string.Empty;
    public string? BodyHtml { get; set; }
    public int? LeadId { get; set; }
    public int? CustomerId { get; set; }
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RepOrAbove")]
public class EmailsController : ControllerBase
{
    private readonly IEmailSender _emailSender;
    private readonly IActivityService _activityService;
    private readonly ICurrentUserService _currentUser;
    private readonly AppDbContext _db;

    public EmailsController(
        IEmailSender emailSender,
        IActivityService activityService,
        ICurrentUserService currentUser,
        AppDbContext db)
    {
        _emailSender = emailSender;
        _activityService = activityService;
        _currentUser = currentUser;
        _db = db;
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendEmail([FromBody] SendEmailRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ToEmail))
            return BadRequest(new { message = "Recipient email address is required." });

        if (string.IsNullOrWhiteSpace(request.Subject))
            return BadRequest(new { message = "Email subject is required." });

        if (!_currentUser.UserId.HasValue)
            return Unauthorized();

        // 1. Dispatch Email via IEmailSender
        try
        {
            await _emailSender.SendEmailAsync(request.ToEmail, request.Subject, request.BodyHtml, cancellationToken);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Email delivery failed: {ex.Message}" });
        }

        // 2. Automatically log an Email Activity into the Timeline
        try
        {
            var activityDto = new ActivityCreateDto
            {
                ActivityTypeId = 2, // Email activity type
                Subject = $"[Sent Email] {request.Subject}",
                Description = $"To: {request.ToEmail}\n\n{request.BodyHtml}",
                ActivityDate = DateTime.UtcNow,
                CustomerId = request.CustomerId,
                OpportunityId = request.OpportunityId,
                LeadId = request.LeadId
            };

            await _activityService.CreateAsync(activityDto, _currentUser.UserId.Value);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Email] Warning: Failed to log activity for sent email to {request.ToEmail}: {ex.Message}");
        }

        return Ok(new { success = true, message = $"Email successfully sent to {request.ToEmail}" });
    }

    /// <summary>
    /// POST /api/emails/inbound
    /// Public webhook for external email services (SendGrid, Mailgun, Postmark, AWS SES, or custom hooks)
    /// to push incoming emails/replies from leads into the CRM database automatically.
    /// </summary>
    [HttpPost("inbound")]
    [AllowAnonymous]
    public async Task<IActionResult> ReceiveInboundEmail([FromBody] InboundEmailDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FromEmail))
            return BadRequest(new { message = "FromEmail is required." });

        if (string.IsNullOrWhiteSpace(request.Subject))
            request.Subject = "(No Subject)";

        var bodyContent = !string.IsNullOrWhiteSpace(request.BodyText)
            ? request.BodyText
            : (!string.IsNullOrWhiteSpace(request.BodyHtml) ? request.BodyHtml : "(No content)");

        // 1. Safely resolve ActivityTypeId for Email
        var emailType = await _db.ActivityTypes
            .FirstOrDefaultAsync(at => at.Name.ToLower() == "email", cancellationToken)
            ?? await _db.ActivityTypes.FirstOrDefaultAsync(cancellationToken);

        int activityTypeId = emailType?.ActivityTypeId ?? 2;

        // 2. Safely resolve CreatedById from Identities
        var firstUser = await _db.Identities.FirstOrDefaultAsync(cancellationToken);
        int defaultUserId = firstUser?.IdentityId ?? 1;
        int createdById = defaultUserId;

        // 3. Match Lead or Customer by ID or Email address
        int? leadId = request.LeadId;
        int? customerId = request.CustomerId;

        if (!leadId.HasValue && !customerId.HasValue)
        {
            var lead = await _db.Leads
                .FirstOrDefaultAsync(l => !l.IsDeleted && l.Email.ToLower() == request.FromEmail.Trim().ToLower(), cancellationToken);

            if (lead != null)
            {
                leadId = lead.LeadId;
                if (lead.AssignedRepId.HasValue && lead.AssignedRepId.Value > 0)
                    createdById = lead.AssignedRepId.Value;
            }
            else
            {
                var customer = await _db.Customers
                    .FirstOrDefaultAsync(c => !c.IsDeleted && c.Email != null && c.Email.ToLower() == request.FromEmail.Trim().ToLower(), cancellationToken);

                if (customer != null)
                {
                    customerId = customer.CustomerId;
                    if (customer.AssignedRepId > 0)
                        createdById = customer.AssignedRepId;
                }
            }
        }
        else if (leadId.HasValue)
        {
            var lead = await _db.Leads.FirstOrDefaultAsync(l => l.LeadId == leadId.Value, cancellationToken);
            if (lead?.AssignedRepId.HasValue == true && lead.AssignedRepId.Value > 0)
                createdById = lead.AssignedRepId.Value;
        }

        // Ensure createdById exists in Identities table to prevent FK constraint exception
        var userExists = await _db.Identities.AnyAsync(i => i.IdentityId == createdById, cancellationToken);
        if (!userExists)
        {
            createdById = defaultUserId;
        }

        // 4. Insert new Activity for the received response
        var activity = new Activity
        {
            ActivityTypeId = activityTypeId,
            Subject = $"[Received Email] {request.Subject}",
            Description = $"From: {request.FromEmail}\n\n{bodyContent}",
            ActivityDate = DateTime.UtcNow,
            LeadId = leadId,
            CustomerId = customerId,
            CreatedById = createdById,
            CreatedAt = DateTime.UtcNow
        };

        _db.Activities.Add(activity);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            activityId = activity.ActivityId,
            matchedLeadId = leadId,
            matchedCustomerId = customerId,
            message = $"Inbound email from {request.FromEmail} successfully recorded to timeline."
        });
    }
}
