using System.Threading.Tasks;
using CrmSystem.Api.Dtos;

namespace CrmSystem.Api.Services;

public interface IGeminiService
{
    bool IsConfigured { get; }
    Task<string?> GenerateTextAsync(string prompt, CopilotFileAttachmentDto? attachment = null);
    Task<string?> GenerateSalesEmailAsync(string leadName, string? company, string? jobTitle, string? priority, string? status, string? notes);
}
