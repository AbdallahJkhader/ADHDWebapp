using Microsoft.AspNetCore.Mvc;
using ADHDWebApp.Models;
using ADHDWebApp.Services;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ADHDWebApp.Controllers
{
    public class StudyPlannerController : Controller
    {
        private readonly IStudyPlannerService _plannerService;

        public StudyPlannerController(IStudyPlannerService plannerService)
        {
            _plannerService = plannerService;
        }

        // GET: Get all study sessions for the current user
        [HttpGet]
        public async Task<IActionResult> GetSessions()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Json(new { success = false, error = "Not authenticated" });
            }

            var result = await _plannerService.GetSessionsAsync(userId.Value);
            
            if (result.Success)
                 return Json(new { success = true, sessions = result.Sessions });
            
            return Json(new { success = false, error = result.Error });
        }

        // POST: Add new study session
        [HttpPost]
        public async Task<IActionResult> AddSession([FromBody] StudySessionRequest request)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Json(new { success = false, error = "Not authenticated" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.Title))
            {
                return Json(new { success = false, error = "Title is required" });
            }

            var result = await _plannerService.AddSessionAsync(userId.Value, request.Title, request.Description, request.SubjectName, request.StartTime, request.EndTime);

            if (result.Success && result.Session != null)
            {
                var session = result.Session;
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

            return Json(new { success = false, error = result.Error });
        }

        // POST: Update study session
        [HttpPost]
        public async Task<IActionResult> UpdateSession([FromBody] StudySessionUpdateRequest request)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Json(new { success = false, error = "Not authenticated" });
            }

            if (request == null)
                 return Json(new { success = false, error = "Invalid data" });

            var result = await _plannerService.UpdateSessionAsync(userId.Value, request.Id, request.Title, request.Description, request.SubjectName, request.StartTime, request.EndTime);

            if (result.Success)
                 return Json(new { success = true, message = "Session updated successfully" });

            return Json(new { success = false, error = result.Error });
        }

        // POST: Delete study session
        [HttpPost]
        public async Task<IActionResult> DeleteSession([FromBody] DeleteSessionRequest request)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Json(new { success = false, error = "Not authenticated" });
            }

            if (request == null)
                 return Json(new { success = false, error = "Invalid data" });

            var result = await _plannerService.DeleteSessionAsync(userId.Value, request.Id);

            if (result.Success)
                 return Json(new { success = true, message = "Session deleted successfully" });

            return Json(new { success = false, error = result.Error });
        }

        // POST: Mark session as complete/incomplete
        [HttpPost]
        public async Task<IActionResult> MarkComplete([FromBody] MarkCompleteRequest request)
        {
             var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Json(new { success = false, error = "Not authenticated" });
            }

            if (request == null)
                 return Json(new { success = false, error = "Invalid data" });

            var result = await _plannerService.MarkCompleteAsync(userId.Value, request.Id, request.IsCompleted);

            if (result.Success)
                 return Json(new { success = true, message = "Session status updated" });

            return Json(new { success = false, error = result.Error });
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
