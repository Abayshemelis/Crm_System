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

    public bool IsConfigured
    {
        get
        {
            var host = _configuration["Smtp:Host"];
            var username = _configuration["Smtp:Username"];
            var password = _configuration["Smtp:Password"]?.Replace(" ", "").Trim();
            return !string.IsNullOrWhiteSpace(host) &&
                   !string.IsNullOrWhiteSpace(username) &&
                   !string.IsNullOrWhiteSpace(password) &&
                   !username.Contains("your-mailtrap", StringComparison.OrdinalIgnoreCase);
        }
    }

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
            Console.WriteLine($"[Email] Credentials missing. Email to {toEmail} with subject '{subject}' logged locally.");
            throw new InvalidOperationException("Email provider (SMTP / Resend) credentials are not configured in appsettings.json. Please configure your SMTP server or Resend API key to deliver real emails.");
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(from, "CRM System"),
                Subject = subject
            };
            message.To.Add(toEmail);
            message.ReplyToList.Add(new MailAddress(from, "CRM System"));

            if (isHtml)
            {
                // Create plain text alternative to satisfy spam filter multipart/alternative requirements
                var plainText = System.Text.RegularExpressions.Regex.Replace(body, @"<style[^>]*>[\s\S]*?</style>", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                plainText = System.Text.RegularExpressions.Regex.Replace(plainText, @"<[^>]+>", " ");
                plainText = System.Text.RegularExpressions.Regex.Replace(plainText, @"\s+", " ")
                    .Replace("&amp;", "&")
                    .Replace("&nbsp;", " ")
                    .Trim();

                var plainView = AlternateView.CreateAlternateViewFromString(plainText, System.Text.Encoding.UTF8, "text/plain");
                var htmlView = AlternateView.CreateAlternateViewFromString(body, System.Text.Encoding.UTF8, "text/html");

                message.AlternateViews.Add(plainView);
                message.AlternateViews.Add(htmlView);
            }
            else
            {
                message.Body = body;
                message.IsBodyHtml = false;
            }

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(username, password),
                Timeout = 20000
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

