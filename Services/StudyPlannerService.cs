using ADHDWebApp.Data;
using ADHDWebApp.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ADHDWebApp.Services
{
    public class StudyPlannerService : IStudyPlannerService
    {
        private readonly AppDbContext _context;

        public StudyPlannerService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(bool Success, string Error, IEnumerable<object> Sessions)> GetSessionsAsync(int userId)
        {
            try
            {
                var sessions = await _context.StudySessions
                    .Where(s => s.UserId == userId)
                    .OrderBy(s => s.StartTime)
                    .Select(s => new
                    {
                        s.Id,
                        s.Title,
                        s.Description,
                        s.SubjectName,
                        StartTime = s.StartTime.ToString("yyyy-MM-ddTHH:mm"),
                        EndTime = s.EndTime.ToString("yyyy-MM-ddTHH:mm"),
                        s.IsCompleted,
                        s.CreatedAt
                    })
                    .ToListAsync();

                return (true, string.Empty, sessions);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error, StudySession? Session)> AddSessionAsync(int userId, string title, string description, string subjectName, DateTime startTime, DateTime endTime)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(title)) return (false, "Title is required", null);

                var session = new StudySession
                {
                    UserId = userId,
                    Title = title,
                    Description = description,
                    SubjectName = subjectName,
                    StartTime = startTime,
                    EndTime = endTime,
                    IsCompleted = false,
                    CreatedAt = DateTime.Now
                };

                _context.StudySessions.Add(session);
                await _context.SaveChangesAsync();

                return (true, string.Empty, session);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error)> UpdateSessionAsync(int userId, int sessionId, string title, string description, string subjectName, DateTime startTime, DateTime endTime)
        {
            try
            {
                var session = await _context.StudySessions
                    .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

                if (session == null) return (false, "Session not found");

                session.Title = title;
                session.Description = description;
                session.SubjectName = subjectName;
                session.StartTime = startTime;
                session.EndTime = endTime;

                await _context.SaveChangesAsync();

                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Error)> DeleteSessionAsync(int userId, int sessionId)
        {
            try
            {
                var session = await _context.StudySessions
                    .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

                if (session == null) return (false, "Session not found");

                _context.StudySessions.Remove(session);
                await _context.SaveChangesAsync();

                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Error)> MarkCompleteAsync(int userId, int sessionId, bool isCompleted)
        {
            try
            {
                var session = await _context.StudySessions
                    .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

                if (session == null) return (false, "Session not found");

                session.IsCompleted = isCompleted;
                await _context.SaveChangesAsync();

                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }
    }
}
