using CrmSystem.Api.Services;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CrmSystem.Tests;

public class LeadScoringServiceTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public void CalculateScore_CompleteLead_ReturnsHotRating()
    {
        // Arrange
        using var context = CreateDbContext();
        var service = new LeadScoringService(context);

        var lead = new Lead
        {
            FirstName = "Alice",
            LastName = "Smith",
            Email = "alice@example.com",
            Phone = "+15550199",
            CompanyName = "Enterprise Tech Inc",
            JobTitle = "CTO",
            Priority = "High",
            CreatedAt = DateTime.UtcNow,
            Source = new Source { Name = "Web Inquiry" },
            Activities = new List<Activity>
            {
                new Activity { Subject = "Discovery Call" },
                new Activity { Subject = "Demo Scheduled" }
            }
        };

        // Act
        var result = service.CalculateScore(lead);

        // Assert
        Assert.True(result.Score >= 70, $"Expected score >= 70, got {result.Score}");
        Assert.Equal("Hot", result.Rating);
        Assert.Equal("OnTrack", result.SlaStatus);
        Assert.NotEmpty(result.ScoreFactors);
    }

    [Fact]
    public void CalculateScore_OldInactiveLead_AppliesSlaPenalty()
    {
        // Arrange
        using var context = CreateDbContext();
        var service = new LeadScoringService(context);

        var lead = new Lead
        {
            FirstName = "Bob",
            LastName = "Doe",
            Email = "bob@example.com",
            CreatedAt = DateTime.UtcNow.AddDays(-15),
            LastActivityAt = DateTime.UtcNow.AddDays(-15)
        };

        // Act
        var result = service.CalculateScore(lead);

        // Assert
        Assert.Equal("Breached", result.SlaStatus);
        Assert.True(result.DaysInactive >= 14);
        Assert.Contains(result.ScoreFactors, f => f.Contains("SLA Breached"));
    }
}
