using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CrmSystem.Api.Controllers;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Activity;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CrmSystem.Tests;

public class InboundEmailIntegrationTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private sealed class DummyEmailSender : IEmailSender
    {
        public Task SendPasswordResetAsync(string toEmail, string resetUrl, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class DummyActivityService : IActivityService
    {
        public Task<IReadOnlyList<ActivityReadDto>> GetAllAsync() => Task.FromResult<IReadOnlyList<ActivityReadDto>>(new List<ActivityReadDto>());
        public Task<IReadOnlyList<ActivityReadDto>> GetTimelineAsync(int? customerId = null, int? opportunityId = null, int? leadId = null) => Task.FromResult<IReadOnlyList<ActivityReadDto>>(new List<ActivityReadDto>());
        public Task<ActivityReadDto> CreateAsync(ActivityCreateDto dto, int createdById) => Task.FromResult(new ActivityReadDto());
        public Task<bool> DeleteAsync(int activityId, int requestingUserId, bool isAdmin) => Task.FromResult(true);
    }

    private sealed class DummyCurrentUserService : ICurrentUserService
    {
        public int? UserId => 1;
        public string? Email => "test@test.com";
        public IReadOnlyList<UserRole> Roles => new List<UserRole>();
        public UserRole? Role => null;
        public bool IsAuthenticated => true;
        public bool IsAdmin => true;
        public bool IsManagerOrAbove => true;
        public bool CanAccessOwnedRecord(int? ownerRepId) => true;
    }

    [Fact]
    public async Task ReceiveInboundEmail_MatchesLeadByEmail_AndSavesActivityRecord()
    {
        // Arrange
        using var db = CreateDbContext();

        db.Identities.Add(new Identity { IdentityId = 5, Name = "Sales Rep 5", Email = "rep5@cyberdyne.com" });

        var testLead = new Lead
        {
            LeadId = 42,
            FirstName = "Sarah",
            LastName = "Connor",
            Email = "sarah.connor@cyberdyne.com",
            IsDeleted = false,
            AssignedRepId = 5
        };
        db.Leads.Add(testLead);
        await db.SaveChangesAsync();

        var controller = new EmailsController(new DummyEmailSender(), new DummyActivityService(), new DummyCurrentUserService(), db);

        var inboundDto = new InboundEmailDto
        {
            FromEmail = "sarah.connor@cyberdyne.com",
            Subject = "Re: Product Demo Request",
            BodyText = "I am free this Thursday at 2 PM for the software demonstration."
        };

        // Act
        var result = await controller.ReceiveInboundEmail(inboundDto, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var savedActivity = await db.Activities.FirstOrDefaultAsync(a => a.LeadId == 42);
        Assert.NotNull(savedActivity);
        Assert.Equal("[Received Email] Re: Product Demo Request", savedActivity.Subject);
        Assert.Contains("I am free this Thursday", savedActivity.Description);
        Assert.Equal(5, savedActivity.CreatedById);
    }
}
