using GurkanApi.DTOs.Notifications;
using GurkanApi.Entities;

namespace GurkanApi.Services;

public interface INotificationComputeService
{
    Task<List<NotificationItem>> ComputeNotificationsAsync(Guid userId, UserRole role);
}
