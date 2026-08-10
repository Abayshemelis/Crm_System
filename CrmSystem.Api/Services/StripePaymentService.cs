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
}

public class StripePaymentService : IStripePaymentService
{
    private readonly string _webhookSecret;

    public StripePaymentService(IConfiguration configuration)
    {
        var apiKey = configuration["Stripe:SecretKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            apiKey = "sk_test_default";
        }
        StripeConfiguration.ApiKey = apiKey;
        _webhookSecret = configuration["Stripe:WebhookSecret"] ?? "whsec_default";
    }

    public async Task<string> CreateCheckoutSessionAsync(CrmSystem.Domain.Entities.Invoice invoice, string successUrl, string cancelUrl)
    {
        var rawAmount = invoice.TotalAmount > 0 ? invoice.TotalAmount : invoice.Amount;
        var amountInCents = (long)Math.Max(100, Math.Round(rawAmount * 100));

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

        try
        {
            var service = new SessionService();
            var session = await service.GetAsync(sessionId);

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
}
