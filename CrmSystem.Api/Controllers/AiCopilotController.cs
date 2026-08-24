using System;
using System.Threading.Tasks;
using CrmSystem.Api.Dtos;
using CrmSystem.Api.Services;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/ai/copilot")]
[Authorize]
public class AiCopilotController : ControllerBase
{
    private readonly IAiCopilotService _copilotService;
    private readonly ICurrentUserService _currentUser;

    public AiCopilotController(IAiCopilotService copilotService, ICurrentUserService currentUser)
    {
        _copilotService = copilotService;
        _currentUser = currentUser;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] CopilotChatRequest? request)
    {
        request ??= new CopilotChatRequest { Message = string.Empty };

        if (!_currentUser.UserId.HasValue)
        {
            return Unauthorized();
        }

        try
        {
            var response = await _copilotService.ProcessCopilotChatAsync(request, _currentUser.UserId.Value);
            return Ok(response);
        }
        catch (Exception)
        {
            return Ok(new CopilotChatResponse
            {
                Reply = "I am currently running in offline fallback mode. How can I help you manage your CRM leads, deals, contacts, or invoices today?",
                IsGeminiPowered = false,
                CurrentContextSummary = "AI Assistant (Offline Mode)"
            });
        }
    }

    [AllowAnonymous]
    [HttpPost("public/chat")]
    public async Task<IActionResult> PublicChat([FromBody] CopilotChatRequest? request)
    {
        request ??= new CopilotChatRequest { Message = string.Empty };

        try
        {
            var response = await _copilotService.ProcessPublicVisitorChatAsync(request);
            return Ok(response);
        }
        catch (Exception)
        {
            return Ok(new CopilotChatResponse
            {
                Reply = "Welcome to our Enterprise CRM! Explore our features including visual deal pipelines, AI lead scoring, e-signatures, Stripe checkout, and custom fields.",
                IsGeminiPowered = false,
                CurrentContextSummary = "Public Product Advisor"
            });
        }
    }
}
