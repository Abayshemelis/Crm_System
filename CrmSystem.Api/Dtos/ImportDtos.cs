using System.Collections.Generic;

namespace CrmSystem.Api.Dtos
{
    public class CsvHeaderParseResultDto
    {
        public List<string> Headers { get; set; } = new();
        public List<Dictionary<string, string>> PreviewRows { get; set; } = new();
        public int TotalRows { get; set; }
    }

    public class CsvImportRequestDto
    {
        public string EntityType { get; set; } = "lead"; // "lead", "customer", "product"
        public Dictionary<string, string> ColumnMappings { get; set; } = new(); // CSV Header -> CRM Field Name
        public string FileContent { get; set; } = string.Empty; // Raw CSV text or Base64 string
    }

    public class CsvImportResultDto
    {
        public int TotalRecordsProcessed { get; set; }
        public int SuccessCount { get; set; }
        public int FailureCount { get; set; }
        public List<string> ErrorMessages { get; set; } = new();
    }
}
