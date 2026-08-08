using System;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using CrmSystem.Api.Dtos;
using CrmSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CrmSystem.Api.Controllers
{
    [ApiController]
    [Route("api/import")]
    [Authorize]
    public class ImportController : ControllerBase
    {
        private readonly IImportService _importService;

        public ImportController(IImportService importService)
        {
            _importService = importService;
        }

        [HttpPost("parse")]
        public IActionResult ParseFileHeaders([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("Please upload a valid .csv or .pdf file.");
            }

            var isCsv = file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase);
            var isPdf = file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);

            if (!isCsv && !isPdf)
            {
                return BadRequest("Uploaded file must be in .csv or .pdf format.");
            }

            using var stream = file.OpenReadStream();
            CsvHeaderParseResultDto result;
            if (isPdf)
            {
                result = _importService.ParsePdfHeaders(stream);
            }
            else
            {
                result = _importService.ParseCsvHeaders(stream);
            }

            return Ok(result);
        }

        [HttpPost("execute")]
        public async Task<IActionResult> ExecuteImport([FromBody] CsvImportRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.FileContent))
            {
                return BadRequest("Import request payload or file content is empty.");
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int currentUserId = int.TryParse(userIdClaim, out var id) ? id : 1;

            var result = await _importService.ExecuteImportAsync(request, currentUserId);
            return Ok(result);
        }
    }
}
