using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

namespace CrmSystem.Api.Services;

public interface IEmailSender
{
    Task SendPasswordResetAsync(string toEmail, string resetUrl, CancellationToken cancellationToken = default);
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
        var host = _configuration["Smtp:Host"];
        var port = int.TryParse(_configuration["Smtp:Port"], out var parsedPort) ? parsedPort : 587;
        var username = _configuration["Smtp:Username"];
        var password = _configuration["Smtp:Password"];
        var from = _configuration["Smtp:From"] ?? "noreply@crmtest.local";
        var enableSsl = bool.TryParse(_configuration["Smtp:EnableSsl"], out var sslEnabled) && sslEnabled;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password) ||
            username.Contains("your-mailtrap", StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine($"[Email] Mailtrap credentials not configured. Password reset requested for {toEmail}; preview link: {resetUrl}");
            return;
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(from),
                Subject = "CRM password reset",
                Body = $"Use the following link to reset your password: {resetUrl}",
                IsBodyHtml = false
            };
            message.To.Add(toEmail);

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                Credentials = new NetworkCredential(username, password)
            };

            await client.SendMailAsync(message, cancellationToken);
            Console.WriteLine($"[Email] Reset email sent to {toEmail} via {host}:{port}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Email] Failed to send reset email to {toEmail}: {ex.Message}");
        }
    }
}
