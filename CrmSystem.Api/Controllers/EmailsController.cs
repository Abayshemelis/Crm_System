using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Activity;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RepOrAbove")]
public class EmailsController : ControllerBase
{
    private readonly IEmailSender _emailSender;
    private readonly IActivityService _activityService;
    private readonly ICurrentUserService _currentUser;

    public EmailsController(
        IEmailSender emailSender,
        IActivityService activityService,
        ICurrentUserService currentUser)
    {
        _emailSender = emailSender;
        _activityService = activityService;
        _currentUser = currentUser;
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
}
