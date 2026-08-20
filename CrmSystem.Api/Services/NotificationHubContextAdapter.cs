using CrmSystem.Api.Hubs;
using CrmSystem.Infrastructure.Services;
using Microsoft.AspNetCore.SignalR;

namespace CrmSystem.Api.Services;

/// <summary>
/// Bridges INotificationHubContext (defined in Infrastructure) to the real SignalR hub
/// (defined in Api), avoiding a circular project reference.
/// </summary>
public class NotificationHubContextAdapter : INotificationHubContext
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationHubContextAdapter(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task PushToUserGroupAsync(string groupName, string message, string type)
    {
        await _hubContext.Clients
            .Group(groupName)
            .SendAsync("ReceiveNotification", new { message, type, title = message });
    }
}
