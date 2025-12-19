using ADHDWebApp.Models;

namespace ADHDWebApp.Services
{
    public interface IClassesService
    {
        Task<(bool Success, string Error)> LeaveClassAsync(int userId, int classId);
        Task<(bool Success, string Error)> RemoveMemberAsync(int ownerId, int classId, int targetUserId);
        Task<(bool Success, string Error)> DeleteClassAsync(int userId, int classId);
        Task<(bool Success, string Error, object? ClassDetails)> GetClassDetailsAsync(int userId, int classId);
        Task<(bool Success, string Error, int? ClassId, string? JoinCode)> CreateClassAsync(int ownerId, string className);
        Task<(bool Success, string Error, int? ClassId)> JoinClassAsync(int userId, string joinCode);
        Task<(bool Success, string Error, List<object>? Classes)> GetUserClassesAsync(int userId);
        Task<(bool Success, string Error, List<object>? Files)> GetClassFilesAsync(int userId, int classId);
        Task<(bool Success, string Error, int? FileId)> UploadClassFileAsync(int userId, int classId, string fileName, string filePath, string contentType, long fileSize);
        Task<(bool Success, string Error, List<object>? Messages)> GetClassChatAsync(int userId, int classId, int? afterId);
        Task<(bool Success, string Error, int? MessageId)> SendClassChatAsync(int userId, int classId, string content);
        Task<(bool Success, string Error)> UpdateClassPrivacyAsync(int userId, int classId, bool allowJoin);
    }
}
