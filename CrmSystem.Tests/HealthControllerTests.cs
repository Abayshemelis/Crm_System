using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrmSystem.Api.Controllers;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Xunit;

namespace CrmSystem.Tests;

public class HealthControllerTests
{
    private AppDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetHealthStatus_ReturnsHealthy_WhenDbIsConnected()
    {
        // Arrange
        using var db = GetInMemoryDbContext();
        db.Customers.Add(new Customer { FirstName = "Acme", LastName = "Test Corp", Email = "acme@test.com" });
        await db.SaveChangesAsync();

        var controller = new HealthController(db);

        // Act
        var result = await controller.GetHealthStatus();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);

        dynamic data = okResult.Value!;
        Assert.NotNull(data);
    }
}
