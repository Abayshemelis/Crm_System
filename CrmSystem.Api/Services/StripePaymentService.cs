using CrmSystem.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Stripe;
using Stripe.Checkout;

namespace CrmSystem.Api.Services;

public interface IStripePaymentService
{
    Task<string> CreateCheckoutSessionAsync(CrmSystem.Domain.Entities.Invoice invoice, string successUrl, string cancelUrl);
    Task ProcessWebhookEventAsync(string json, string stripeSignatureHeader);
}

public class StripePaymentService : IStripePaymentService
{
    private readonly string _webhookSecret;

    public StripePaymentService(IConfiguration configuration)
    {
        StripeConfiguration.ApiKey = configuration["Stripe:SecretKey"] ?? "sk_test_default";
        _webhookSecret = configuration["Stripe:WebhookSecret"] ?? "whsec_default";
    }

    public async Task<string> CreateCheckoutSessionAsync(CrmSystem.Domain.Entities.Invoice invoice, string successUrl, string cancelUrl)
    {
        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        UnitAmount = (long)(invoice.TotalAmount * 100), // Convert to cents
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
            ClientReferenceId = invoice.InvoiceId.ToString()
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);

        return session.Url;
    }

    public async Task ProcessWebhookEventAsync(string json, string stripeSignatureHeader)
    {
        var stripeEvent = EventUtility.ConstructEvent(json, stripeSignatureHeader, _webhookSecret);

        if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted)
        {
            var session = stripeEvent.Data.Object as Session;

            if (session != null && int.TryParse(session.ClientReferenceId, out int invoiceId))
            {
                // This will be picked up by the controller to mark the invoice as paid
                // We'll throw an event or handle DB here.
                // But typically, the Controller handles DB operations, so we might want to return the invoiceId.
            }
        }
    }
}
