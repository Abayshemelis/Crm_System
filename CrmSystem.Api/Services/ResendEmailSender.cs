using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace CrmSystem.Api.Services;

public class ResendEmailSender : IEmailSender
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly SmtpEmailSender _fallbackSmtp;

    public ResendEmailSender(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _fallbackSmtp = new SmtpEmailSender(configuration);
    }

    public async Task SendPasswordResetAsync(string toEmail, string resetUrl, CancellationToken cancellationToken = default)
    {
        var html = $@"
            <div style=""font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;"">
                <h2 style=""color: #4f46e5;"">Password Reset Request</h2>
                <p>You recently requested to reset your password for the CRM System. Click the button below to proceed:</p>
                <div style=""text-align: center; margin: 25px 0;"">
                    <a href=""{resetUrl}"" style=""background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;"">Reset Password</a>
                </div>
                <p style=""font-size: 12px; color: #64748b;"">If you did not request a password reset, please ignore this email.</p>
            </div>";

        await SendEmailAsync(toEmail, "CRM Password Reset Request", html, cancellationToken);
    }

    public async Task SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["Resend:ApiKey"]?.Trim();
        var from = _configuration["Resend:From"]?.Trim() ?? "CRM System <onboarding@resend.dev>";

        // Fallback to SMTP if Resend API key is not provided
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            Console.WriteLine("[Email] Resend API key not configured. Falling back to standard SMTP...");
            await _fallbackSmtp.SendEmailAsync(toEmail, subject, bodyHtml, cancellationToken);
            return;
        }

        try
        {
            // Strip HTML to generate clean plain text fallback for maximum inbox score
            var plainText = System.Text.RegularExpressions.Regex.Replace(bodyHtml, @"<style[^>]*>[\s\S]*?</style>", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            plainText = System.Text.RegularExpressions.Regex.Replace(plainText, @"<[^>]+>", " ");
            plainText = System.Text.RegularExpressions.Regex.Replace(plainText, @"\s+", " ")
                .Replace("&amp;", "&")
                .Replace("&nbsp;", " ")
                .Trim();

            var payload = new
            {
                from = from,
                to = new[] { toEmail.Trim() },
                subject = subject.Trim(),
                html = bodyHtml,
                text = plainText
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                Console.WriteLine($"[Resend SUCCESS] Email sent to {toEmail} (Subject: '{subject}'). Response: {responseJson}");
            }
            else
            {
                Console.WriteLine($"[Resend WARNING] Failed to send via Resend ({response.StatusCode}): {responseJson}. Attempting SMTP fallback...");
                await _fallbackSmtp.SendEmailAsync(toEmail, subject, bodyHtml, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Resend ERROR] Exception sending via Resend: {ex.Message}. Falling back to SMTP...");
            await _fallbackSmtp.SendEmailAsync(toEmail, subject, bodyHtml, cancellationToken);
        }
    }
}
