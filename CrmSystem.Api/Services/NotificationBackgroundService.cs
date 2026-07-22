using CrmSystem.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CrmSystem.Api.Services;

/// <summary>
/// Runs every 5 minutes to generate TaskDue/TaskOverdue/OpportunityStalled notifications.
/// Uses a scoped service factory because NotificationService depends on AppDbContext (scoped).
/// </summary>
public class NotificationBackgroundService : BackgroundService
{
    private static readonly TimeSpan _interval = TimeSpan.FromMinutes(5);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NotificationBackgroundService> _logger;

    public NotificationBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<NotificationBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Notification background service started.");

        // Run once at startup, then every 5 minutes
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var svc = scope.ServiceProvider.GetRequiredService<INotificationService>();
                await svc.GenerateAsync();
                _logger.LogDebug("Notification generation pass completed.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during notification generation.");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }
}
