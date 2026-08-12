using System;
using System.Collections.Generic;

namespace CrmSystem.Api.Dtos;

public class CopilotFileAttachmentDto
{
    public string FileName { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty; // "image/png", "image/jpeg", "application/pdf", "text/plain"
    public string Base64Data { get; set; } = string.Empty;
}

public class CopilotChatMessageDto
{
    public string Role { get; set; } = "user"; // "user" or "assistant"
    public string Message { get; set; } = string.Empty;
    public CopilotFileAttachmentDto? Attachment { get; set; }
}

public class CopilotActionDto
{
    public string Label { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty; // "navigate", "draft_email", "suggest"
    public string? TargetUrl { get; set; }
}

public class CopilotChatRequest
{
    public string Message { get; set; } = string.Empty;
    public string Route { get; set; } = "/";
    public string? EntityType { get; set; }
    public int? EntityId { get; set; }
    public CopilotFileAttachmentDto? Attachment { get; set; }
    public List<CopilotChatMessageDto>? History { get; set; }
}

public class CopilotChatResponse
{
    public string Reply { get; set; } = string.Empty;
    public List<CopilotActionDto> SuggestedActions { get; set; } = new();
    public bool IsGeminiPowered { get; set; }
    public string CurrentContextSummary { get; set; } = string.Empty;
}
