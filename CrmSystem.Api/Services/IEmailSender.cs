using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

namespace CrmSystem.Api.Services;

public interface IEmailSender
{
    Task SendPasswordResetAsync(string toEmail, string resetUrl, CancellationToken cancellationToken = default);
    Task SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default);
}

public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;

    public SmtpEmailSender(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendPasswordResetAsync(string toEmail, string resetUrl, CancellationToken cancellationToken = default)
    {
        await SendEmailInternalAsync(toEmail, "CRM password reset", $"Use the following link to reset your password: {resetUrl}", isHtml: false, cancellationToken);
    }

    public async Task SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default)
    {
        await SendEmailInternalAsync(toEmail, subject, bodyHtml, isHtml: true, cancellationToken);
    }

    private async Task SendEmailInternalAsync(string toEmail, string subject, string body, bool isHtml, CancellationToken cancellationToken)
    {
        var host = _configuration["Smtp:Host"];
        var port = int.TryParse(_configuration["Smtp:Port"], out var parsedPort) ? parsedPort : 587;
        var username = _configuration["Smtp:Username"];
        var password = _configuration["Smtp:Password"]?.Replace(" ", "").Trim();
        var from = _configuration["Smtp:From"] ?? "noreply@crmtest.local";
        var enableSsl = bool.TryParse(_configuration["Smtp:EnableSsl"], out var sslEnabled) ? sslEnabled : true;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password) ||
            username.Contains("your-mailtrap", StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine($"[Email] Dev Mode / Credentials missing. Email to {toEmail} with subject '{subject}' logged locally.");
            return;
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(from),
                Subject = subject,
                Body = body,
                IsBodyHtml = isHtml
            };
            message.To.Add(toEmail);

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(username, password),
                Timeout = 3500
            };

            await client.SendMailAsync(message, cancellationToken);
            Console.WriteLine($"[Email SUCCESS] Sent to {toEmail} via {host}:{port}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Email ERROR] Failed to send email to {toEmail}: {ex.Message} | Inner: {ex.InnerException?.Message}");
            throw new InvalidOperationException($"SMTP Error ({host}:{port}): {ex.Message}", ex);
        }
    }
}

