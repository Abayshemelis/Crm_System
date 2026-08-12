using System.Threading.Tasks;
using CrmSystem.Api.Dtos;

namespace CrmSystem.Api.Services;

public interface IAiCopilotService
{
    Task<CopilotChatResponse> ProcessCopilotChatAsync(CopilotChatRequest request, int userId);
    Task<CopilotChatResponse> ProcessPublicVisitorChatAsync(CopilotChatRequest request);
}
