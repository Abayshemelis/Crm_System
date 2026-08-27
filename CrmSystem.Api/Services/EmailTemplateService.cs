namespace CrmSystem.Api.Services;

public interface IEmailTemplateService
{
    string BuildContractSigningRequestHtml(string customerName, string contractTitle, string contractNumber, decimal value, string signUrl, DateTime expiresAt);
    string BuildContractSignedNotificationHtml(string repName, string customerName, string contractTitle, string contractNumber, decimal value, DateTime signedAt, string signedByName);
    string BuildInvoiceIssuedHtml(string customerName, string invoiceNumber, decimal amount, decimal totalAmount, DateTime issueDate, DateTime dueDate, string? contractNumber);
    string BuildInvoiceOverdueHtml(string customerName, string invoiceNumber, decimal totalAmount, DateTime dueDate);
    string BuildInvoicePaymentReceiptHtml(string customerName, string invoiceNumber, decimal totalAmount, DateTime paidAt, string paymentMethod);
    string BuildInvoicePaymentRequestHtml(string customerName, string invoiceNumber, decimal totalAmount, decimal balanceDue, DateTime dueDate, string payUrl, string? customMessage);
}

public class EmailTemplateService : IEmailTemplateService
{
    private const string PrimaryColor = "#6366f1";
    private const string AccentColor = "#4f46e5";
    private const string DarkBg = "#0f172a";

    private static string WrapContainer(string title, string contentHtml)
    {
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{title}</title>
    <style>
        body {{ font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #334155; }}
        .email-card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01); border: 1px solid #e2e8f0; }}
        .email-header {{ background: linear-gradient(135deg, {PrimaryColor} 0%, {AccentColor} 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
        .email-header h1 {{ margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }}
        .email-header p {{ margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; }}
        .email-body {{ padding: 32px 24px; line-height: 1.6; font-size: 15px; }}
        .info-box {{ background: #f1f5f9; border-left: 4px solid {PrimaryColor}; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }}
        .info-row {{ display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #cbd5e1; font-size: 14px; }}
        .info-row:last-child {{ border-bottom: none; }}
        .cta-btn {{ display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; padding: 14px 32px; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 10px; margin: 24px 0; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35); text-align: center; }}
        .email-footer {{ background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
    </style>
</head>
<body>
    <div class=""email-card"">
        <div class=""email-header"">
            <h1>⚡ CRM System</h1>
            <p>{title}</p>
        </div>
        <div class=""email-body"">
            {contentHtml}
        </div>
        <div class=""email-footer"">
            <p>This is an automated notification from your CRM System.</p>
            <p>© {DateTime.UtcNow.Year} CRM System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
    }

    public string BuildContractSigningRequestHtml(string customerName, string contractTitle, string contractNumber, decimal value, string signUrl, DateTime expiresAt)
    {
        var content = $@"
            <p>Hello <strong>{customerName}</strong>,</p>
            <p>You have received a new contract document ready for electronic signature:</p>
            
            <div class=""info-box"">
                <div class=""info-row""><span>Contract Title:</span> <strong>{contractTitle}</strong></div>
                <div class=""info-row""><span>Contract Ref #:</span> <strong>{contractNumber}</strong></div>
                <div class=""info-row""><span>Contract Value:</span> <strong>${value:N2}</strong></div>
                <div class=""info-row""><span>Expires On:</span> <strong>{expiresAt:MMMM dd, yyyy}</strong></div>
            </div>

            <p>Please review and sign the document by clicking the button below:</p>
            
            <div style=""text-align: center;"">
                <a href=""{signUrl}"" class=""cta-btn"" target=""_blank"" style=""background: linear-gradient(135deg, {PrimaryColor} 0%, {AccentColor} 100%); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);"">🖋️ Review &amp; Sign Contract</a>
            </div>

            <p style=""font-size: 13px; color: #64748b;"">If the button doesn't work, copy and paste this link into your web browser:<br><a href=""{signUrl}"" style=""color: #6366f1;"">{signUrl}</a></p>
";
        return WrapContainer("Contract Signing Invitation", content);
    }

    public string BuildContractSignedNotificationHtml(string repName, string customerName, string contractTitle, string contractNumber, decimal value, DateTime signedAt, string signedByName)
    {
        var content = $@"
            <p>Hello <strong>{repName}</strong>,</p>
            <p>Great news! Contract <strong>{contractNumber}</strong> has been officially signed by the customer.</p>
            
            <div class=""info-box"" style=""border-left-color: #10b981;"">
                <div class=""info-row""><span>Customer:</span> <strong>{customerName}</strong></div>
                <div class=""info-row""><span>Contract Title:</span> <strong>{contractTitle}</strong></div>
                <div class=""info-row""><span>Contract Value:</span> <strong>${value:N2}</strong></div>
                <div class=""info-row""><span>Signed By:</span> <strong>{signedByName}</strong></div>
                <div class=""info-row""><span>Signed Date:</span> <strong>{signedAt:MMMM dd, yyyy HH:mm UTC}</strong></div>
            </div>

            <p>The contract status is now updated to <strong>Signed</strong> in your CRM dashboard.</p>
";
        return WrapContainer("Contract Signed Successfully", content);
    }

    public string BuildInvoiceIssuedHtml(string customerName, string invoiceNumber, decimal amount, decimal totalAmount, DateTime issueDate, DateTime dueDate, string? contractNumber)
    {
        var content = $@"
            <p>Dear <strong>{customerName}</strong>,</p>
            <p>A new invoice <strong>#{invoiceNumber}</strong> has been issued for your account:</p>

            <div class=""info-box"">
                <div class=""info-row""><span>Invoice #:</span> <strong>{invoiceNumber}</strong></div>
                <div class=""info-row""><span>Issue Date:</span> <strong>{issueDate:MMMM dd, yyyy}</strong></div>
                <div class=""info-row""><span>Due Date:</span> <strong>{dueDate:MMMM dd, yyyy}</strong></div>
                {(string.IsNullOrEmpty(contractNumber) ? "" : $"<div class=\"info-row\"><span>Contract Ref:</span> <strong>{contractNumber}</strong></div>")}
                <div class=""info-row"" style=""font-size: 16px; font-weight: 700; color: #6366f1;""><span>Total Amount Due:</span> <span>${totalAmount:N2}</span></div>
            </div>

            <p>Thank you for your business. Please ensure payment is remitted by the due date.</p>
";
        return WrapContainer($"Invoice #{invoiceNumber}", content);
    }

    public string BuildInvoiceOverdueHtml(string customerName, string invoiceNumber, decimal totalAmount, DateTime dueDate)
    {
        var content = $@"
            <p>Dear <strong>{customerName}</strong>,</p>
            <p>This is a friendly reminder that invoice <strong>#{invoiceNumber}</strong> is currently overdue.</p>

            <div class=""info-box"" style=""border-left-color: #ef4444;"">
                <div class=""info-row""><span>Invoice #:</span> <strong>{invoiceNumber}</strong></div>
                <div class=""info-row""><span>Original Due Date:</span> <strong>{dueDate:MMMM dd, yyyy}</strong></div>
                <div class=""info-row"" style=""font-size: 16px; font-weight: 700; color: #ef4444;""><span>Overdue Amount:</span> <span>${totalAmount:N2}</span></div>
            </div>

            <p>Please arrange payment at your earliest convenience. If you have already remitted payment, please disregard this notice.</p>
";
        return WrapContainer($"Payment Reminder: Overdue Invoice #{invoiceNumber}", content);
    }

    public string BuildInvoicePaymentReceiptHtml(string customerName, string invoiceNumber, decimal totalAmount, DateTime paidAt, string paymentMethod)
    {
        var content = $@"
            <p>Dear <strong>{customerName}</strong>,</p>
            <p>Thank you! We have received and processed your payment for invoice <strong>#{invoiceNumber}</strong>.</p>

            <div class=""info-box"" style=""border-left-color: #10b981;"">
                <div class=""info-row""><span>Invoice #:</span> <strong>{invoiceNumber}</strong></div>
                <div class=""info-row""><span>Amount Paid:</span> <strong>${totalAmount:N2}</strong></div>
                <div class=""info-row""><span>Payment Method:</span> <strong>{paymentMethod}</strong></div>
                <div class=""info-row""><span>Date Received:</span> <strong>{paidAt:MMMM dd, yyyy}</strong></div>
                <div class=""info-row""><span>Status:</span> <strong style=""color: #10b981;"">PAID &amp; SETTLED</strong></div>
            </div>

            <p>Your account has been updated accordingly. Thank you for your continued partnership!</p>
";
        return WrapContainer($"Payment Receipt for Invoice #{invoiceNumber}", content);
    }

    public string BuildInvoicePaymentRequestHtml(string customerName, string invoiceNumber, decimal totalAmount, decimal balanceDue, DateTime dueDate, string payUrl, string? customMessage)
    {
        var content = $@"
            <p>Dear <strong>{customerName}</strong>,</p>
            <p>Please find your payment request for Invoice <strong>#{invoiceNumber}</strong>.</p>

            {(!string.IsNullOrWhiteSpace(customMessage) ? $"<div style=\"background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-style: italic; color: #475569;\">\"{customMessage}\"</div>" : "")}

            <div class=""info-box"">
                <div class=""info-row""><span>Invoice Number:</span> <strong>{invoiceNumber}</strong></div>
                <div class=""info-row""><span>Invoice Total:</span> <strong>${totalAmount:N2}</strong></div>
                <div class=""info-row"" style=""font-size: 16px; font-weight: 700; color: #10b981;""><span>Remaining Balance Due:</span> <span>${balanceDue:N2}</span></div>
                <div class=""info-row""><span>Due Date:</span> <strong>{dueDate:MMMM dd, yyyy}</strong></div>
                <div class=""info-row""><span>Payment Options:</span> <strong>Credit/Debit Card, Stripe, Bank Wire</strong></div>
            </div>

            <p>To view your invoice details and remit payment securely online, click the button below:</p>

            <div style=""text-align: center;"">
                <a href=""{payUrl}"" class=""cta-btn"" target=""_blank"">💳 Pay Invoice Online</a>
            </div>

            <p style=""font-size: 13px; color: #64748b;"">Direct link: <a href=""{payUrl}"" style=""color: #6366f1;"">{payUrl}</a></p>
";
        return WrapContainer($"Payment Request for Invoice #{invoiceNumber}", content);
    }
}
