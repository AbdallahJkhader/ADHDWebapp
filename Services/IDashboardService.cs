using ADHDWebApp.Models;

namespace ADHDWebApp.Services
{
    public interface IDashboardService
    {
        // Progress tracking
        Task<User?> GetUserAsync(int userId);
        Task<(bool Success, string Error, object? Progress)> GetProgressAsync(int userId, int? targetUserId);
        Task<(bool Success, string Error)> RecordFocusSessionAsync(int userId, int duration, string subjectName);
        Task<(bool Success, string Error)> RecordBrowsingSessionAsync(int userId, int duration, string subjectName);
        
        // File operations
        // File operations
        Task<(bool Success, string Error)> DeleteFilesAsync(int userId, List<int> fileIds);
        Task<(bool Success, string Error, int FileId, string FileName)> SaveUserFileAsync(int userId, string fileName, string filePath, string contentType, long fileSize);
        
        // AI & Tools
        Task<(bool Success, string Error, string? Summary)> SummarizeTextAsync(string text, string apiKey, string? model = null, string? baseUrl = null);
        Task<(bool Success, string Error, string? QuizJson)> GenerateQuizAsync(string text, string apiKey, string? model = null, string? baseUrl = null);
        Task<(bool Success, string Error, string? FlashcardsJson)> GenerateFlashcardsAsync(string text, string apiKey, string? model = null, string? baseUrl = null);
        
        // Profile
        Task<(bool Success, string Error)> UpdateAvatarAsync(int userId, string extension, Stream fileStream, string webRootPath);
        Task<(bool Success, string Error)> UpdateDateOfBirthAsync(int userId, DateTime dob);
        Task<(bool Success, string Error)> UpdateFullNameAsync(int userId, string fullName);
        
        // File Content
        Task<(bool Success, string Error, UserFile? File, string? Content, string? DisplayType, bool Truncated)> GetFileContentAsync(int userId, int fileId, string webRootPath);
        Task<(bool Success, string Error, List<UserFile> Files)> GetUserFilesAsync(int userId);
        Task<(bool Success, string Error, List<UserFile> Files)> GetUserFilesByTypeAsync(int userId, string contentTypePrefix);
        Task<(bool Success, string Error, Dictionary<string, List<int>> Groups)> GetFileGroupsAsync(int userId);
        Task<(bool Success, string Error)> SaveFileGroupAsync(int userId, string groupName, List<int> fileIds);
        Task<(bool Success, string Error)> DeleteFileGroupAsync(int userId, string groupName);
    }
}
