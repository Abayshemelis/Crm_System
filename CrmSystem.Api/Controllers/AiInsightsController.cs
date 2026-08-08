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
