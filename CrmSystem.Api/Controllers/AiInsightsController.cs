using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CrmSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmSystem.Api.Controllers
{
    [ApiController]
    [Route("api/ai")]
    [Authorize]
    public class AiInsightsController : ControllerBase
    {
        private readonly IAiInsightService _aiService;

        public AiInsightsController(IAiInsightService aiService)
        {
            _aiService = aiService;
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            return Ok(_aiService.GetStatus());
        }

        [HttpPost("leads/{id}/analyze")]
        public async Task<IActionResult> AnalyzeLead(int id)
        {
            try
            {
                var result = await _aiService.AnalyzeLeadAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("leads/{id}/generate-email")]
        public async Task<IActionResult> GenerateSalesEmail(int id)
        {
            try
            {
                var draft = await _aiService.GenerateSalesEmailAsync(id);
                return Ok(new { leadId = id, draft });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("opportunities/{id}/predict-win")]
        public async Task<IActionResult> PredictOpportunityWin(int id)
        {
            try
            {
                var result = await _aiService.PredictOpportunityWinAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
