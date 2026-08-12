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
    public async Task<IActionResult> Chat([FromBody] CopilotChatRequest request)
    {
        if (!_currentUser.UserId.HasValue)
        {
            return Unauthorized();
        }

        try
        {
            var response = await _copilotService.ProcessCopilotChatAsync(request, _currentUser.UserId.Value);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("public/chat")]
    public async Task<IActionResult> PublicChat([FromBody] CopilotChatRequest request)
    {
        try
        {
            var response = await _copilotService.ProcessPublicVisitorChatAsync(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
