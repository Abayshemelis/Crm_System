using CrmSystem.Domain.Entities;

namespace CrmSystem.Api.Services;

public interface IEmailTriggerService
{
    Task SendLeadWelcomeEmailAsync(Lead lead, CancellationToken cancellationToken = default);
    Task SendLeadAssignedEmailAsync(Lead lead, Identity user, CancellationToken cancellationToken = default);
    Task SendCustomerAssignedEmailAsync(Customer customer, Identity user, CancellationToken cancellationToken = default);
}

public class EmailTriggerService : IEmailTriggerService
{
    private readonly IEmailSender _emailSender;

    public EmailTriggerService(IEmailSender emailSender)
    {
        _emailSender = emailSender;
    }

    public async Task SendLeadWelcomeEmailAsync(Lead lead, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(lead.Email)) return;

        var subject = "Welcome to Nexus CRM";
        var bodyHtml = $@"
            <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"">
                <h2 style=""color: #4f46e5;"">Hi {lead.FirstName},</h2>
                <p>Thank you for reaching out! We've received your inquiry and a member of our sales team will be in touch with you shortly.</p>
                <p>Best regards,<br/>The Nexus CRM Team</p>
            </div>";

        try
        {
            await _emailSender.SendEmailAsync(lead.Email, subject, bodyHtml, cancellationToken);
        }
        catch (Exception ex)
        {
            // Log but don't fail the request
            Console.WriteLine($"Failed to send welcome email to {lead.Email}: {ex.Message}");
        }
    }

    public async Task SendLeadAssignedEmailAsync(Lead lead, Identity user, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(user.Email)) return;

        var subject = $"New Lead Assigned: {lead.FirstName} {lead.LastName}";
        var bodyHtml = $@"
            <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"">
                <h2 style=""color: #4f46e5;"">Hi {user.Name},</h2>
                <p>A new lead has been assigned to you.</p>
                <div style=""background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;"">
                    <p><strong>Name:</strong> {lead.FirstName} {lead.LastName}</p>
                    <p><strong>Company:</strong> {(string.IsNullOrWhiteSpace(lead.CompanyName) ? "N/A" : lead.CompanyName)}</p>
                    <p><strong>Priority:</strong> {lead.Priority}</p>
                </div>
                <p>Please log in to the CRM to follow up.</p>
            </div>";

        try
        {
            await _emailSender.SendEmailAsync(user.Email, subject, bodyHtml, cancellationToken);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to send assigned email to {user.Email}: {ex.Message}");
        }
    }

    public async Task SendCustomerAssignedEmailAsync(Customer customer, Identity user, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(user.Email)) return;

        var subject = $"Customer Reassigned: {customer.FirstName} {customer.LastName}";
        var bodyHtml = $@"
            <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"">
                <h2 style=""color: #4f46e5;"">Hi {user.Name},</h2>
                <p>An existing customer has been assigned to you.</p>
                <div style=""background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;"">
                    <p><strong>Name:</strong> {customer.FirstName} {customer.LastName}</p>
                    <p><strong>Company:</strong> {(customer.Company != null ? customer.Company.Name : "N/A")}</p>
                </div>
                <p>Please log in to the CRM to review their profile.</p>
            </div>";

        try
        {
            await _emailSender.SendEmailAsync(user.Email, subject, bodyHtml, cancellationToken);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to send customer assigned email to {user.Email}: {ex.Message}");
        }
    }
}
