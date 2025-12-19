using ADHDWebApp.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ADHDWebApp.Services
{
    public interface IStudyPlannerService
    {
        Task<(bool Success, string Error, IEnumerable<object> Sessions)> GetSessionsAsync(int userId);
        Task<(bool Success, string Error, StudySession? Session)> AddSessionAsync(int userId, string title, string description, string subjectName, DateTime startTime, DateTime endTime);
        Task<(bool Success, string Error)> UpdateSessionAsync(int userId, int sessionId, string title, string description, string subjectName, DateTime startTime, DateTime endTime);
        Task<(bool Success, string Error)> DeleteSessionAsync(int userId, int sessionId);
        Task<(bool Success, string Error)> MarkCompleteAsync(int userId, int sessionId, bool isCompleted);
    }
}
