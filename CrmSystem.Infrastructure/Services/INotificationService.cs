using CrmSystem.Domain.Dtos.Notification;

namespace CrmSystem.Infrastructure.Services;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationReadDto>> GetForUserAsync(int identityId);
    Task<int> GetUnreadCountAsync(int identityId);
    Task MarkReadAsync(int notificationId, int identityId);
    Task MarkUnreadAsync(int notificationId, int identityId);
    Task DeleteNotificationAsync(int notificationId, int identityId);
    Task MarkAllReadAsync(int identityId);
    Task CreateNotificationAsync(int identityId, string typeName, string message, int? taskId = null, int? opportunityId = null);
    Task GenerateAsync();
    /// <summary>Push a real-time SignalR message to a specific user group.</summary>
    Task PushToUserAsync(int identityId, string message, string type = "info");
}
