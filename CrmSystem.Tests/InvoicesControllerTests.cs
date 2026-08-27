using CrmSystem.Api.Controllers;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Invoice;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Xunit;

namespace CrmSystem.Tests;

public class TestStripePaymentService : IStripePaymentService
{
    public Task<string> CreateCheckoutSessionAsync(Invoice invoice, string successUrl, string cancelUrl) => Task.FromResult("https://checkout.stripe.com/test");
    public Task<int?> VerifyCheckoutSessionAsync(string sessionId) => Task.FromResult<int?>(null);
    public Task<bool> CheckInvoicePaidInStripeAsync(Invoice invoice) => Task.FromResult(false);
    public Task<int?> ProcessWebhookEventAsync(string json, string stripeSignatureHeader) => Task.FromResult<int?>(null);
}

public class TestNotificationService : INotificationService
{
    public Task<IReadOnlyList<CrmSystem.Domain.Dtos.Notification.NotificationReadDto>> GetForUserAsync(int identityId) => Task.FromResult<IReadOnlyList<CrmSystem.Domain.Dtos.Notification.NotificationReadDto>>(Array.Empty<CrmSystem.Domain.Dtos.Notification.NotificationReadDto>());
    public Task<int> GetUnreadCountAsync(int identityId) => Task.FromResult(0);
    public Task MarkReadAsync(int notificationId, int identityId) => Task.CompletedTask;
    public Task MarkUnreadAsync(int notificationId, int identityId) => Task.CompletedTask;
    public Task DeleteNotificationAsync(int notificationId, int identityId) => Task.CompletedTask;
    public Task MarkAllReadAsync(int identityId) => Task.CompletedTask;
    public Task CreateNotificationAsync(int identityId, string typeName, string message, int? taskId = null, int? opportunityId = null) => Task.CompletedTask;
    public Task GenerateAsync() => Task.CompletedTask;
    public Task PushToUserAsync(int identityId, string message, string type = "info") => Task.CompletedTask;
}

public class InvoicesControllerTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private InvoicesController CreateController(AppDbContext context)
    {
        var currentUser = new TestContractCurrentUserService();
        var audit = new MockAuditService();
        var emailSender = new TestEmailSender();
        var templateService = new TestEmailTemplateService();
        var notificationService = new TestNotificationService();
        var stripeService = new TestStripePaymentService();

        var controller = new InvoicesController(
            context,
            currentUser,
            audit,
            emailSender,
            templateService,
            notificationService,
            stripeService
        );

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim(ClaimTypes.Email, "admin@crm.com")
        }, "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        return controller;
    }

    [Fact]
    public async Task Create_WhenNoInvoiceExists_CreatesNewInvoice()
    {
        // Arrange
        using var context = CreateDbContext();
        var customer = new Customer { CustomerId = 1, FirstName = "John", LastName = "Doe", Email = "john@example.com" };
        var opp = new Opportunity { OpportunityId = 1, CustomerId = 1, Title = "Enterprise License", EstimatedValue = 5000 };
        context.Customers.Add(customer);
        context.Opportunities.Add(opp);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var dto = new CreateInvoiceDto
        {
            CustomerId = 1,
            OpportunityId = 1,
            Amount = 5000,
            TaxRate = 10,
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            Notes = "First invoice"
        };

        var result = await controller.Create(dto);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var readDto = Assert.IsType<InvoiceReadDto>(createdResult.Value);
        Assert.Equal(5000, readDto.Amount);
        Assert.Equal(5500, readDto.TotalAmount);
        Assert.Single(context.Invoices.Where(i => !i.IsDeleted));
    }

    [Fact]
    public async Task Create_WhenOpportunityAlreadyHasInvoice_ReusesAndUpdatesExistingInvoice()
    {
        // Arrange
        using var context = CreateDbContext();
        var customer = new Customer { CustomerId = 1, FirstName = "John", LastName = "Doe", Email = "john@example.com" };
        var opp = new Opportunity { OpportunityId = 1, CustomerId = 1, Title = "Enterprise License", EstimatedValue = 5000 };
        var existingInvoice = new Invoice
        {
            InvoiceId = 1,
            InvoiceNumber = "INV-20260822-0001",
            CustomerId = 1,
            OpportunityId = 1,
            Amount = 5000,
            TaxRate = 0,
            TaxAmount = 0,
            TotalAmount = 5000,
            Status = "Draft",
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };
        context.Customers.Add(customer);
        context.Opportunities.Add(opp);
        context.Invoices.Add(existingInvoice);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act: Attempt to create an invoice for the same deal with updated value
        var dto = new CreateInvoiceDto
        {
            CustomerId = 1,
            OpportunityId = 1,
            Amount = 7500,
            TaxRate = 10,
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(45),
            Notes = "Updated billing amount"
        };

        var result = await controller.Create(dto);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var readDto = Assert.IsType<InvoiceReadDto>(okResult.Value);
        Assert.Equal("INV-20260822-0001", readDto.InvoiceNumber);
        Assert.Equal(7500, readDto.Amount);
        Assert.Equal(8250, readDto.TotalAmount);

        // Crucial: No duplicate record created in database
        Assert.Single(context.Invoices.Where(i => !i.IsDeleted && i.OpportunityId == 1));
    }

    [Fact]
    public async Task RecordPayment_MarksInvoiceAsPaid()
    {
        // Arrange
        using var context = CreateDbContext();
        var customer = new Customer { CustomerId = 1, FirstName = "Alice", LastName = "Smith", Email = "alice@example.com" };
        var invoice = new Invoice
        {
            InvoiceId = 1,
            InvoiceNumber = "INV-20260822-0002",
            CustomerId = 1,
            Amount = 2000,
            TotalAmount = 2000,
            Status = "Sent",
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(15),
            CreatedAt = DateTime.UtcNow
        };
        context.Customers.Add(customer);
        context.Invoices.Add(invoice);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var payDto = new PayInvoiceDto
        {
            PaymentMethod = "Bank Transfer",
            Notes = "Wire Ref #99281"
        };
        var result = await controller.RecordPayment(1, payDto);

        // Assert
        Assert.NotNull(result);
        var updated = await context.Invoices.FindAsync(1);
        Assert.NotNull(updated);
        Assert.Equal("Paid", updated.Status);
        Assert.NotNull(updated.PaidAt);
        Assert.Equal("Bank Transfer", updated.PaymentMethod);
    }

    [Fact]
    public async Task Delete_SoftDeletesInvoice()
    {
        // Arrange
        using var context = CreateDbContext();
        var customer = new Customer { CustomerId = 1, FirstName = "Bob", LastName = "Jones", Email = "bob@example.com" };
        var invoice = new Invoice
        {
            InvoiceId = 1,
            InvoiceNumber = "INV-20260822-0003",
            CustomerId = 1,
            Amount = 1500,
            TotalAmount = 1500,
            Status = "Draft",
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(15),
            CreatedAt = DateTime.UtcNow
        };
        context.Customers.Add(customer);
        context.Invoices.Add(invoice);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.Delete(1);

        // Assert
        Assert.IsType<NoContentResult>(result);
        var deleted = await context.Invoices.FindAsync(1);
        Assert.NotNull(deleted);
        Assert.True(deleted.IsDeleted);
    }
}
