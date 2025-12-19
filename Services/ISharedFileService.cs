using ADHDWebApp.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ADHDWebApp.Services
{
    public interface ISharedFileService
    {
        Task<(bool Success, string Error, int SharedFileId)> ShareFileAsync(int senderId, int recipientId, int fileId, string? description);
        Task<(bool Success, string Error, IEnumerable<object> SharedFiles)> GetSharedWithMeAsync(int userId);
        Task<(bool Success, string Error, IEnumerable<object> SharedFiles)> GetSharedByMeAsync(int userId);
        Task<(bool Success, string Error)> MarkAsReadAsync(int userId, int sharedFileId);
    }
}
