using CrmSystem.Api.Controllers;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Contract;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Xunit;

namespace CrmSystem.Tests;

public class TestContractCurrentUserService : ICurrentUserService
{
    public int? UserId => 1;
    public string? Email => "admin@crm.com";
    public bool IsAuthenticated => true;
    public UserRole? Role => UserRole.Admin;
    public IReadOnlyList<UserRole> Roles => new[] { UserRole.Admin };
    public bool IsAdmin => true;
    public bool IsManagerOrAbove => true;
    public bool CanAccessOwnedRecord(int? ownerRepId) => true;
}

public class TestEmailSender : IEmailSender
{
    public Task SendPasswordResetAsync(string toEmail, string resetUrl, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default) => Task.CompletedTask;
}

public class TestEmailTemplateService : IEmailTemplateService
{
    public string BuildContractSigningRequestHtml(string customerName, string contractTitle, string contractNumber, decimal value, string signUrl, DateTime expiresAt) => "<html></html>";
    public string BuildContractSignedNotificationHtml(string repName, string customerName, string contractTitle, string contractNumber, decimal value, DateTime signedAt, string signedByName) => "<html></html>";
    public string BuildInvoiceIssuedHtml(string customerName, string invoiceNumber, decimal amount, decimal totalAmount, DateTime issueDate, DateTime dueDate, string? contractNumber) => "<html></html>";
    public string BuildInvoiceOverdueHtml(string customerName, string invoiceNumber, decimal totalAmount, DateTime dueDate) => "<html></html>";
    public string BuildInvoicePaymentReceiptHtml(string customerName, string invoiceNumber, decimal totalAmount, DateTime paidAt, string paymentMethod) => "<html></html>";
}

public class ContractsControllerTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task Create_ValidContract_ReturnsCreatedResult()
    {
        // Arrange
        using var context = CreateDbContext();
        var currentUser = new TestContractCurrentUserService();
        var audit = new MockAuditService();
        var emailSender = new TestEmailSender();
        var templateService = new TestEmailTemplateService();

        // Seed a Role and Identity so the re-fetch Include(CreatedBy) succeeds
        var role = new Role { RoleId = 1, Name = "Admin" };
        context.Roles.Add(role);
        var identity = new Identity { IdentityId = 1, Name = "Admin User", Email = "admin@crm.com", PasswordHash = "x", RoleId = 1 };
        context.Identities.Add(identity);
        var customer = new Customer { CustomerId = 1, FirstName = "Jane", LastName = "Doe", Email = "jane@example.com" };
        context.Customers.Add(customer);
        await context.SaveChangesAsync();

        var controller = new ContractsController(context, currentUser, audit, emailSender, templateService);

        var dto = new CreateContractDto
        {
            CustomerId = 1,
            Title = "Enterprise Software & Support Agreement",
            ContractValue = 15000m,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddYears(1)
        };

        // Act
        var result = await controller.Create(dto);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var contractDto = Assert.IsType<ContractReadDto>(createdResult.Value);
        Assert.Equal("Enterprise Software & Support Agreement", contractDto.Title);
        Assert.Equal(15000m, contractDto.ContractValue);
        Assert.StartsWith("CTR-", contractDto.ContractNumber);
    }

    [Fact]
    public async Task SignContract_ValidSignature_UpdatesStatusToSigned()
    {
        // Arrange
        using var context = CreateDbContext();
        var currentUser = new TestContractCurrentUserService();
        var audit = new MockAuditService();

        var contract = new Contract
        {
            ContractId = 1,
            ContractNumber = "CTR-2026-00001",
            CustomerId = 1,
            Title = "Master Services Contract",
            Status = "Draft",
            ContractValue = 25000m,
            CreatedById = 1
        };
        context.Contracts.Add(contract);
        await context.SaveChangesAsync();

        var emailSender = new TestEmailSender();
        var templateService = new TestEmailTemplateService();
        var controller = new ContractsController(context, currentUser, audit, emailSender, templateService);

        var signDto = new SignContractDto
        {
            SignatureDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            SignedByName = "Jane Doe"
        };

        // Act
        var result = await controller.SignContract(1, signDto);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        var updatedContract = await context.Contracts.FindAsync(1);
        Assert.NotNull(updatedContract);
        Assert.Equal("Signed", updatedContract.Status);
        Assert.Equal("Jane Doe", updatedContract.SignedByName);
        Assert.NotNull(updatedContract.SignedAt);
    }
}
