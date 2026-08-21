using CrmSystem.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Stripe;
using Stripe.Checkout;

namespace CrmSystem.Api.Services;

public interface IStripePaymentService
{
    Task<string> CreateCheckoutSessionAsync(CrmSystem.Domain.Entities.Invoice invoice, string successUrl, string cancelUrl);
    Task<int?> VerifyCheckoutSessionAsync(string sessionId);
    Task<int?> ProcessWebhookEventAsync(string json, string stripeSignatureHeader);
    Task<bool> CheckInvoicePaidInStripeAsync(CrmSystem.Domain.Entities.Invoice invoice);
}

public class StripePaymentService : IStripePaymentService
{
    private readonly string _apiKey;
    private readonly string _webhookSecret;

    public StripePaymentService(IConfiguration configuration)
    {
        _apiKey = configuration["Stripe:SecretKey"] ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(_apiKey) && _apiKey != "sk_test_default")
        {
            StripeConfiguration.ApiKey = _apiKey;
        }
        _webhookSecret = configuration["Stripe:WebhookSecret"] ?? "whsec_default";
    }

    public async Task<string> CreateCheckoutSessionAsync(CrmSystem.Domain.Entities.Invoice invoice, string successUrl, string cancelUrl)
    {
        var rawAmount = invoice.TotalAmount > 0 ? invoice.TotalAmount : invoice.Amount;
        var amountInCents = (long)Math.Max(100, Math.Round(rawAmount * 100));

        // If no live Stripe key is configured or default placeholder is used, generate an automatic test checkout URL
        if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey == "sk_test_default")
        {
            var simulatedSessionId = $"demo_session_inv_{invoice.InvoiceId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
            var directReturnUrl = successUrl.Replace("{CHECKOUT_SESSION_ID}", simulatedSessionId);
            return directReturnUrl;
        }

        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        UnitAmount = amountInCents,
                        Currency = "usd",
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"Invoice #{invoice.InvoiceNumber}"
                        },
                    },
                    Quantity = 1,
                },
            },
            Mode = "payment",
            SuccessUrl = successUrl,
            CancelUrl = cancelUrl,
            ClientReferenceId = invoice.InvoiceId.ToString(),
            Metadata = new Dictionary<string, string>
            {
                { "InvoiceId", invoice.InvoiceId.ToString() },
                { "InvoiceNumber", invoice.InvoiceNumber }
            }
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);

        return session.Url;
    }

    public async Task<int?> VerifyCheckoutSessionAsync(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId)) return null;

        // Support demo/simulated test session ID
        if (sessionId.StartsWith("demo_session_inv_") || sessionId.StartsWith("test_session_inv_"))
        {
            var parts = sessionId.Split('_');
            if (parts.Length >= 4 && int.TryParse(parts[3], out int simInvoiceId))
            {
                return simInvoiceId;
            }
        }

        if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey == "sk_test_default")
        {
            return null;
        }

        try
        {
            var service = new SessionService();
            var session = await service.GetAsync(sessionId);

            Console.WriteLine($"[Stripe] Verifying session {sessionId} | PaymentStatus: {session?.PaymentStatus} | Status: {session?.Status} | ClientRefId: {session?.ClientReferenceId}");

            if (session != null && (session.PaymentStatus == "paid" || session.Status == "complete" || session.PaymentStatus == "no_payment_required"))
            {
                if (!string.IsNullOrWhiteSpace(session.ClientReferenceId) && int.TryParse(session.ClientReferenceId, out int invId))
                {
                    return invId;
                }
                if (session.Metadata != null && session.Metadata.TryGetValue("InvoiceId", out var metaIdStr) && int.TryParse(metaIdStr, out int metaInvId))
                {
                    return metaInvId;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Stripe] Error verifying checkout session: {ex.Message}");
        }

        return null;
    }

    public async Task<int?> ProcessWebhookEventAsync(string json, string stripeSignatureHeader)
    {
        try
        {
            var stripeEvent = EventUtility.ConstructEvent(json, stripeSignatureHeader, _webhookSecret);

            if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted)
            {
                var session = stripeEvent.Data.Object as Session;

                if (session != null && (session.PaymentStatus == "paid" || session.Status == "complete"))
                {
                    if (!string.IsNullOrWhiteSpace(session.ClientReferenceId) && int.TryParse(session.ClientReferenceId, out int invId))
                    {
                        return invId;
                    }
                    if (session.Metadata != null && session.Metadata.TryGetValue("InvoiceId", out var metaIdStr) && int.TryParse(metaIdStr, out int metaInvId))
                    {
                        return metaInvId;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Stripe] Error processing webhook event: {ex.Message}");
        }

        return null;
    }

    public async Task<bool> CheckInvoicePaidInStripeAsync(CrmSystem.Domain.Entities.Invoice invoice)
    {
        if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey == "sk_test_default")
        {
            return false;
        }

        try
        {
            var sessionService = new SessionService();
            var sessions = await sessionService.ListAsync(new SessionListOptions
            {
                Limit = 50,
            });

            foreach (var session in sessions)
            {
                var isMatch = false;
                if (!string.IsNullOrWhiteSpace(session.ClientReferenceId) && session.ClientReferenceId == invoice.InvoiceId.ToString())
                {
                    isMatch = true;
                }
                else if (session.Metadata != null && session.Metadata.TryGetValue("InvoiceId", out var metaInvId) && metaInvId == invoice.InvoiceId.ToString())
                {
                    isMatch = true;
                }
                else if (session.Metadata != null && session.Metadata.TryGetValue("InvoiceNumber", out var metaInvNum) && metaInvNum.Equals(invoice.InvoiceNumber, StringComparison.OrdinalIgnoreCase))
                {
                    isMatch = true;
                }

                if (isMatch && (session.PaymentStatus == "paid" || session.Status == "complete" || session.PaymentStatus == "no_payment_required"))
                {
                    return true;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Stripe] Error checking invoice payment status: {ex.Message}");
        }

        return false;
    }
}
