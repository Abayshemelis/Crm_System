using System.IO;
using System.Threading.Tasks;
using CrmSystem.Api.Dtos;

namespace CrmSystem.Api.Services
{
    public interface IImportService
    {
        CsvHeaderParseResultDto ParseCsvHeaders(Stream csvStream);
        CsvHeaderParseResultDto ParsePdfHeaders(Stream pdfStream);
        Task<CsvImportResultDto> ExecuteImportAsync(CsvImportRequestDto request, int currentUserId);
    }
}
