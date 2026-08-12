using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CrmSystem.Api.Dtos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CrmSystem.Api.Services;

public class GeminiService : IGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _apiKey = configuration["Gemini:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? Environment.GetEnvironmentVariable("GOOGLE_GEMINI_API_KEY");

        // Trim quotes or whitespace if present
        if (!string.IsNullOrWhiteSpace(_apiKey))
        {
            _apiKey = _apiKey.Trim('"', '\'', ' ');
        }
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey) && _apiKey.Length > 10;

    public async Task<string?> GenerateTextAsync(string prompt, CopilotFileAttachmentDto? attachment = null)
    {
        if (!IsConfigured)
        {
            return null;
        }

        // Direct call to active Google Gemini Flash & Pro models
        return await DirectCallGeminiAsync("gemini-2.5-flash", prompt, attachment)
            ?? await DirectCallGeminiAsync("gemini-1.5-flash", prompt, attachment)
            ?? await DirectCallGeminiAsync("gemini-2.0-flash", prompt, attachment)
            ?? await DirectCallGeminiAsync("gemini-flash-latest", prompt, attachment);
    }

    private async Task<string?> DirectCallGeminiAsync(string model, string prompt, CopilotFileAttachmentDto? attachment)
    {
        try
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_apiKey}";

            var partsList = new List<object>
            {
                new { text = prompt }
            };

            if (attachment != null && !string.IsNullOrWhiteSpace(attachment.Base64Data))
            {
                var rawBase64 = attachment.Base64Data;
                if (rawBase64.Contains(","))
                {
                    rawBase64 = rawBase64.Split(',')[1];
                }

                var mimeType = string.IsNullOrWhiteSpace(attachment.FileType) ? "application/octet-stream" : attachment.FileType;
                partsList.Add(new
                {
                    inline_data = new
                    {
                        mime_type = mimeType,
                        data = rawBase64
                    }
                });
            }

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = partsList.ToArray()
                    }
                }
            };

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, jsonContent, cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync(cts.Token);
                _logger.LogWarning("Gemini API call ({Model}) returned {StatusCode}: {Error}", model, response.StatusCode, errorText);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync(cts.Token);
            using var doc = JsonDocument.Parse(responseJson);

            if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                candidates.ValueKind == JsonValueKind.Array &&
                candidates.GetArrayLength() > 0)
            {
                var firstCandidate = candidates[0];
                if (firstCandidate.TryGetProperty("content", out var content) &&
                    content.TryGetProperty("parts", out var parts) &&
                    parts.ValueKind == JsonValueKind.Array &&
                    parts.GetArrayLength() > 0)
                {
                    var text = parts[0].GetProperty("text").GetString()?.Trim();
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        return text;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini API call ({Model}) timed out or failed.", model);
        }

        return null;
    }

    public async Task<string?> GenerateSalesEmailAsync(string leadName, string? company, string? jobTitle, string? priority, string? status, string? notes)
    {
        var prompt = $"""
            You are an expert sales executive assistant. Write a professional, personalized 3-paragraph outreach email to a sales prospect with the following details:
            - Prospect Name: {leadName}
            - Company: {company ?? "N/A"}
            - Job Title: {jobTitle ?? "N/A"}
            - Lead Priority: {priority ?? "Medium"}
            - Current Status: {status ?? "New"}
            - Context Notes: {notes ?? "Interested in enterprise CRM services"}

            Guidelines:
            - Provide a subject line starting with 'Subject: ' on the first line.
            - Write a warm, professional, high-converting outreach email.
            - Focus on solving operational challenges and scheduling a quick introductory demo call.
            - Do not include place-holder brackets like [Your Name]; sign off as 'The Account Sales Team'.
            """;

        return await GenerateTextAsync(prompt);
    }
}
