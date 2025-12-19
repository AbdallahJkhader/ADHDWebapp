using ADHDWebApp.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ADHDWebApp.Services
{
    public interface INotificationService
    {
        Task<(bool Success, string Error, int? NotificationId)> CreateNotificationAsync(int userId, string type, string title, string message, int? relatedId = null);
        Task<(bool Success, string Error, List<object>? Notifications)> GetUserNotificationsAsync(int userId, bool unreadOnly = false);
        Task<(bool Success, string Error)> MarkAsReadAsync(int notificationId, int userId);
        Task<(bool Success, string Error)> MarkAllAsReadAsync(int userId);
    }
}
