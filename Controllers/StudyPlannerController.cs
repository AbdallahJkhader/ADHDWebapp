using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ADHDWebApp.Data;
using ADHDWebApp.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ADHDWebApp.Controllers
{
    public class StudyPlannerController : Controller
    {
        private readonly AppDbContext _context;

        public StudyPlannerController(AppDbContext context)
        {
            _context = context;
        }

        // GET: Get all study sessions for the current user
        [HttpGet]
        public async Task<IActionResult> GetSessions()
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UserId");
                if (userId == null)
                {
                    return Json(new { success = false, error = "Not authenticated" });
                }

                var sessions = await _context.StudySessions
                    .Where(s => s.UserId == userId.Value)
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

                return Json(new { success = true, sessions });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        // POST: Add new study session
        [HttpPost]
        public async Task<IActionResult> AddSession([FromBody] StudySessionRequest request)
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UserId");
                if (userId == null)
                {
                    return Json(new { success = false, error = "Not authenticated" });
                }

                if (string.IsNullOrWhiteSpace(request.Title))
                {
                    return Json(new { success = false, error = "Title is required" });
                }

                var session = new StudySession
                {
                    UserId = userId.Value,
                    Title = request.Title,
                    Description = request.Description,
                    SubjectName = request.SubjectName,
                    StartTime = request.StartTime,
                    EndTime = request.EndTime,
                    IsCompleted = false,
                    CreatedAt = DateTime.Now
                };

                _context.StudySessions.Add(session);
                await _context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    session = new
                    {
                        session.Id,
                        session.Title,
                        session.Description,
                        session.SubjectName,
                        StartTime = session.StartTime.ToString("yyyy-MM-ddTHH:mm"),
                        EndTime = session.EndTime.ToString("yyyy-MM-ddTHH:mm"),
                        session.IsCompleted
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        // POST: Update study session
        [HttpPost]
        public async Task<IActionResult> UpdateSession([FromBody] StudySessionUpdateRequest request)
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UserId");
                if (userId == null)
                {
                    return Json(new { success = false, error = "Not authenticated" });
                }

                var session = await _context.StudySessions
                    .FirstOrDefaultAsync(s => s.Id == request.Id && s.UserId == userId.Value);

                if (session == null)
                {
                    return Json(new { success = false, error = "Session not found" });
                }

                session.Title = request.Title;
                session.Description = request.Description;
                session.SubjectName = request.SubjectName;
                session.StartTime = request.StartTime;
                session.EndTime = request.EndTime;

                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Session updated successfully" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        // POST: Delete study session
        [HttpPost]
        public async Task<IActionResult> DeleteSession([FromBody] DeleteSessionRequest request)
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UserId");
                if (userId == null)
                {
                    return Json(new { success = false, error = "Not authenticated" });
                }

                var session = await _context.StudySessions
                    .FirstOrDefaultAsync(s => s.Id == request.Id && s.UserId == userId.Value);

                if (session == null)
                {
                    return Json(new { success = false, error = "Session not found" });
                }

                _context.StudySessions.Remove(session);
                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Session deleted successfully" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        // POST: Mark session as complete/incomplete
        [HttpPost]
        public async Task<IActionResult> MarkComplete([FromBody] MarkCompleteRequest request)
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UserId");
                if (userId == null)
                {
                    return Json(new { success = false, error = "Not authenticated" });
                }

                var session = await _context.StudySessions
                    .FirstOrDefaultAsync(s => s.Id == request.Id && s.UserId == userId.Value);

                if (session == null)
                {
                    return Json(new { success = false, error = "Session not found" });
                }

                session.IsCompleted = request.IsCompleted;
                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Session status updated" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        // Request classes
        public class StudySessionRequest
        {
            public string Title { get; set; }
            public string Description { get; set; }
            public string SubjectName { get; set; }
            public DateTime StartTime { get; set; }
            public DateTime EndTime { get; set; }
        }

        public class StudySessionUpdateRequest
        {
            public int Id { get; set; }
            public string Title { get; set; }
            public string Description { get; set; }
            public string SubjectName { get; set; }
            public DateTime StartTime { get; set; }
            public DateTime EndTime { get; set; }
        }

        public class DeleteSessionRequest
        {
            public int Id { get; set; }
        }

        public class MarkCompleteRequest
        {
            public int Id { get; set; }
            public bool IsCompleted { get; set; }
        }
    }
}
