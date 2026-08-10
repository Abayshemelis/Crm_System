using CrmSystem.Api.Controllers;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

using CrmSystem.Api.Services;

namespace CrmSystem.Tests;

public class MockAuditService : IAuditService
{
    public List<string> LoggedActions { get; } = new();

    public Task LogFieldChangeAsync(int entityTypeId, int entityId, string fieldName, string? oldValue, string? newValue, string actionTypeName, int changedById)
    {
        LoggedActions.Add($"{actionTypeName}:{entityTypeId}:{entityId}:{fieldName}");
        return Task.CompletedTask;
    }

    public Task LogFieldChangesAsync(int entityTypeId, int entityId, IEnumerable<(string Field, string? OldValue, string? NewValue)> changes, string actionTypeName, int changedById)
    {
        return Task.CompletedTask;
    }

    public Task LogAssignmentAsync(int entityTypeId, int entityId, int? oldRepId, int? newRepId, int changedById)
    {
        return Task.CompletedTask;
    }

    public Task LogDeletionAsync(int entityTypeId, int entityId, int changedById, string? entitySummary = null)
    {
        return Task.CompletedTask;
    }

    public Task ClearHistoryAsync(int entityTypeId, int entityId, int changedById)
    {
        return Task.CompletedTask;
    }
}

public class MockEmailTriggerService : IEmailTriggerService
{
    public Task SendLeadWelcomeEmailAsync(Lead lead, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task SendLeadAssignedEmailAsync(Lead lead, Identity user, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task SendCustomerAssignedEmailAsync(Customer customer, Identity user, CancellationToken cancellationToken = default) => Task.CompletedTask;
}

public class PublicLeadsControllerTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CaptureLead_CreatesNewLead_WhenPayloadIsValid()
    {
        await using var db = CreateDbContext();

        db.LeadStatuses.Add(new LeadStatus { LeadStatusId = 1, Name = "New", SortOrder = 1 });
        db.Identities.Add(new Identity { IdentityId = 1, Name = "Sales Rep", Email = "rep@test.com", RoleId = 1, IsActive = true, PasswordHash = "hash" });
        await db.SaveChangesAsync();

        var mockAudit = new MockAuditService();
        var mockEmail = new MockEmailTriggerService();
        var controller = new PublicLeadsController(db, mockAudit, mockEmail);

        var dto = new PublicLeadCaptureDto
        {
            FirstName = "John",
            LastName = "Doe",
            Email = "john.doe@example.com",
            Phone = "555-0199",
            CompanyName = "Acme Corp",
            Notes = "Web contact form submission"
        };

        var result = await controller.CaptureLead(dto, CancellationToken.None);

        Assert.NotNull(result);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var createdLead = await db.Leads.FirstOrDefaultAsync(l => l.Email == "john.doe@example.com");
        Assert.NotNull(createdLead);
        Assert.Equal("John", createdLead.FirstName);
        Assert.Equal("Doe", createdLead.LastName);
        Assert.Equal("Acme Corp", createdLead.CompanyName);
        Assert.Equal(1, createdLead.LeadStatusId);
        Assert.NotEmpty(mockAudit.LoggedActions);
    }

    [Fact]
    public async Task CaptureLead_ReturnsBadRequest_WhenNamesAreMissing()
    {
        await using var db = CreateDbContext();
        var mockAudit = new MockAuditService();
        var mockEmail = new MockEmailTriggerService();
        var controller = new PublicLeadsController(db, mockAudit, mockEmail);

        var dto = new PublicLeadCaptureDto
        {
            FirstName = "",
            LastName = "",
            Email = "invalid@example.com"
        };

        var result = await controller.CaptureLead(dto, CancellationToken.None);

        Assert.NotNull(result);
        Assert.IsType<BadRequestObjectResult>(result);
    }
}
