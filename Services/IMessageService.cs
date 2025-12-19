using ADHDWebApp.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ADHDWebApp.Services
{
    public interface IMessageService
    {
        Task<(bool Success, string Error, int MessageId)> SendMessageAsync(int senderId, int recipientId, string content);
        Task<(bool Success, string Error, IEnumerable<object> Messages)> GetMessagesAsync(int userId, int otherUserId);
        Task<(bool Success, string Error, IEnumerable<object> Conversations)> GetRecentConversationsAsync(int userId);
        Task<(bool Success, string Error)> MarkAsReadAsync(int userId, int[] messageIds);
    }
}
