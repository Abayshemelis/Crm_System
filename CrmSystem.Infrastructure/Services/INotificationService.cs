using CrmSystem.Domain.Dtos.Notification;

namespace CrmSystem.Infrastructure.Services;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationReadDto>> GetForUserAsync(int identityId);
    Task<int> GetUnreadCountAsync(int identityId);
    Task MarkReadAsync(int notificationId, int identityId);
    Task MarkAllReadAsync(int identityId);
    Task GenerateAsync();
}
