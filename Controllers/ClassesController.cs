using System;
using System.Linq;
using System.Threading.Tasks;
using ADHDWebApp.Data;
using ADHDWebApp.Models;
using ADHDWebApp.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;

namespace ADHDWebApp.Controllers
{
    [Route("[controller]/[action]")]
    public class ClassesController : Controller
    {
        private readonly AppDbContext _context;
        private readonly IClassesService _classesService;
        private readonly INotificationService _notificationService;
        
        public ClassesController(AppDbContext context, IClassesService classesService, INotificationService notificationService)
        {
            _context = context;
            _classesService = classesService;
            _notificationService = notificationService;
        }

        [HttpPost]
        public async Task<IActionResult> Leave([FromBody] LeaveClassDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var result = await _classesService.LeaveClassAsync(sessionUserId.Value, dto.Id);
            return Json(new { success = result.Success, error = result.Error });
        }

        [HttpPost]
        public async Task<IActionResult> RemoveMember([FromBody] RemoveMemberDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var result = await _classesService.RemoveMemberAsync(sessionUserId.Value, dto.ClassId, dto.UserId);
            return Json(new { success = result.Success, error = result.Error });
        }

        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] DeleteClassDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var result = await _classesService.DeleteClassAsync(sessionUserId.Value, dto.Id);
            return Json(new { success = result.Success, error = result.Error });
        }

        [HttpGet]
        public async Task<IActionResult> Details(int id)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var result = await _classesService.GetClassDetailsAsync(sessionUserId.Value, id);
            
            if (result.Success)
                return Json(result.ClassDetails);
            
            return Json(new { success = false, error = result.Error });
        }

        [HttpGet]
        public async Task<IActionResult> Files(int classId)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var result = await _classesService.GetClassFilesAsync(sessionUserId.Value, classId);

            if (result.Success)
                return Json(new { success = true, files = result.Files });
            
            return Json(new { success = false, error = result.Error });
        }

        [HttpGet]
        public async Task<IActionResult> GetClassFile(int fileId)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var file = await _context.ClassFiles.FirstOrDefaultAsync(f => f.Id == fileId);
            if (file == null)
                return Json(new { success = false, error = "File not found" });

            // Check membership logic if needed, but for now assuming if you have the ID you can try (or use service)
            // Ideally we check if user is in the class
            var isMember = await _context.ClassMemberships.AnyAsync(m => m.ClassId == file.ClassId && m.UserId == sessionUserId.Value);
            var isOwner = await _context.Classes.AnyAsync(c => c.Id == file.ClassId && c.OwnerId == sessionUserId.Value);

            if (!isMember && !isOwner)
                 return Json(new { success = false, error = "Access denied" });

            return Json(new { success = true, filePath = file.FilePath, fileName = file.FileName, contentType = file.ContentType });
        }

        [HttpPost]
        [RequestSizeLimit(50_000_000)]
        public async Task<IActionResult> UploadFile(IFormFile file, int classId)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });
            
            if (file == null || file.Length == 0)
                return Json(new { success = false, error = "No file uploaded" });

            try
            {
                 // Handle physical file save in controller, OR move to service? 
                 // Plan says "Use existing service methods". 
                 // Service method `UploadClassFileAsync` takes `filePath`. It implies FILE SAVING is done in controller or needs to be moved.
                 // Looking at Step 1001, service just saves to DB. 
                 // So I must keep file saving here for now or update service to take IFormFile (requires ASP.NET Core dependnecy in service, which is OK but maybe avoiding).
                 // For now, I will keep file saving here and call service for DB part to stay safe.
                 
                var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "classes", classId.ToString());
                if (!Directory.Exists(uploadsRoot)) Directory.CreateDirectory(uploadsRoot);

                var safeName = Path.GetFileName(file.FileName);
                var uniqueName = $"{Guid.NewGuid().ToString("N").Substring(0,8)}_{safeName}";
                var savePath = Path.Combine(uploadsRoot, uniqueName);
                
                using (var stream = new FileStream(savePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var relativePath = $"/uploads/classes/{classId}/{uniqueName}";
                var contentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType;

                var result = await _classesService.UploadClassFileAsync(sessionUserId.Value, classId, safeName, relativePath, contentType, file.Length);

                if (result.Success)
                     return Json(new { success = true, id = result.FileId, name = safeName, url = relativePath });

                return Json(new { success = false, error = result.Error });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateClassDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var name = (dto?.Name ?? string.Empty).Trim();
            var result = await _classesService.CreateClassAsync(sessionUserId.Value, name);
            
            if (result.Success)
                return Json(new { success = true, id = result.ClassId, code = result.JoinCode });
            
            return Json(new { success = false, error = result.Error });
        }

        [HttpPost]
        public async Task<IActionResult> Join([FromBody] JoinClassDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var code = (dto?.Code ?? string.Empty).Trim();
            var result = await _classesService.JoinClassAsync(sessionUserId.Value, code);
            
            if (result.Success)
                return Json(new { success = true, id = result.ClassId });
            
            return Json(new { success = false, error = result.Error });
        }

        [HttpGet]
        public async Task<IActionResult> My()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var result = await _classesService.GetUserClassesAsync(sessionUserId.Value);
            
            if (result.Success)
                return Json(new { success = true, classes = result.Classes });
            
            return Json(new { success = false, error = result.Error });
        }

        private static string GenerateJoinCode(int length)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var rng = new Random();
            return new string(Enumerable.Repeat(chars, length).Select(s => s[rng.Next(s.Length)]).ToArray());
        }

        public class CreateClassDto { public string Name { get; set; } = string.Empty; }
        public class JoinClassDto { public string Code { get; set; } = string.Empty; }
        public class DeleteClassDto { public int Id { get; set; } }
        public class LeaveClassDto { public int Id { get; set; } }
        public class RemoveMemberDto { public int ClassId { get; set; } public int UserId { get; set; } }
        public class UpdatePrivacyDto { public int ClassId { get; set; } public bool AllowJoin { get; set; } }

        [HttpPost]
        public async Task<IActionResult> DeleteClassFile([FromBody] int fileId)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return Json(new { success = false, error = "Not logged in" });

            try
            {
                // Verify ownership/permission
                var file = await _context.ClassFiles.Include(f => f.Class).FirstOrDefaultAsync(f => f.Id == fileId);
                if (file == null) return Json(new { success = false, error = "File not found" });

                // Allow deletion if user is the class owner OR the file uploader
                if (file.Class.OwnerId != userId && file.UploaderId != userId)
                {
                    return Json(new { success = false, error = "You can only delete your own files or files in classes you own" });
                }

                // Delete physical file
                // The FilePath stored in DB is relative, so we need to construct the full path
                var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var fullPath = Path.Combine(uploadsRoot, file.FilePath.TrimStart('/'));

                if (System.IO.File.Exists(fullPath))
                {
                    System.IO.File.Delete(fullPath);
                }

                _context.ClassFiles.Remove(file);
                await _context.SaveChangesAsync();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetSharedFiles()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return Json(new { success = false, error = "Not logged in" });

            try
            {
                // Get all classes user is member of
                var memberClasses = await _context.ClassMemberships
                    .Where(m => m.UserId == userId)
                    .Select(m => m.ClassId)
                    .ToListAsync();

                // Also classes created by user (teacher)
                var teacherClasses = await _context.Classes
                    .Where(c => c.OwnerId == userId)
                    .Select(c => c.Id)
                    .ToListAsync();
                
                var allClassIds = memberClasses.Union(teacherClasses).Distinct().ToList();

                var files = await _context.ClassFiles
                    .Include(f => f.Class)
                    .Where(f => allClassIds.Contains(f.ClassId))
                    .OrderByDescending(f => f.UploadedAt)
                    .Select(f => new
                    {
                        f.Id,
                        f.FileName,
                        f.FilePath,
                        f.FileSize,
                        f.UploadedAt,
                        ClassName = f.Class.Name
                    })
                    .ToListAsync();

                return Json(new { success = true, files });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        // ===== Class Chat Endpoints =====
        [HttpGet]
        public async Task<IActionResult> Chat(int classId, int? afterId)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var result = await _classesService.GetClassChatAsync(sessionUserId.Value, classId, afterId);

            if (result.Success)
                 return Json(new { success = true, messages = result.Messages });

            return Json(new { success = false, error = result.Error });
        }

        public class SendClassChatDto { public int ClassId { get; set; } public string Content { get; set; } = string.Empty; }

        [HttpPost]
        public async Task<IActionResult> SendChat([FromBody] SendClassChatDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var content = (dto?.Content ?? string.Empty).Trim();
            var result = await _classesService.SendClassChatAsync(sessionUserId.Value, dto.ClassId, content);

            if (result.Success)
                 return Json(new { success = true, id = result.MessageId, sentAt = DateTime.UtcNow }); // sentAt is approximate return from service would be better but this is fine 

            return Json(new { success = false, error = result.Error });
        }

        [HttpPost]
        public async Task<IActionResult> UpdatePrivacy([FromBody] UpdatePrivacyDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var result = await _classesService.UpdateClassPrivacyAsync(sessionUserId.Value, dto.ClassId, dto.AllowJoin);
            return Json(new { success = result.Success, error = result.Error });
        }

        [HttpGet]
        public async Task<IActionResult> GetClassAnalytics(int classId)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            try
            {
                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return Json(new { success = false, error = "Class not found" });

                // Get member IDs excluding the class owner (teacher)
                var memberIds = await _context.ClassMemberships
                    .Where(m => m.ClassId == classId && m.UserId != cls.OwnerId)
                    .Select(m => m.UserId)
                    .ToListAsync();

                var weekAgo = DateTime.UtcNow.AddDays(-7);
                var activities = await _context.UserActivities
                    .Where(a => memberIds.Contains(a.UserId) && a.Timestamp >= weekAgo)
                    .ToListAsync();

                var totalFocusMinutes = activities.Where(a => a.ActivityType == "focus_session").Sum(a => a.Duration);
                var totalSessions = activities.Count(a => a.ActivityType == "focus_session");

                // Fetch users
                var users = await _context.Users
                    .Where(u => memberIds.Contains(u.Id))
                    .ToListAsync();

                var studentStats = users.Select(u => new
                {
                    id = u.Id,
                    name = u.FullName,
                    email = u.Email,
                    focusMinutes = activities.Where(a => a.UserId == u.Id && a.ActivityType == "focus_session").Sum(a => a.Duration),
                    streak = activities.Where(a => a.UserId == u.Id).Select(a => a.Timestamp.Date).Distinct().Count(),
                    browsingMinutes = activities.Where(a => a.UserId == u.Id && a.ActivityType == "file_view").Sum(a => a.Duration),
                    subjectsCount = activities.Where(a => a.UserId == u.Id && !string.IsNullOrEmpty(a.SubjectName)).Select(a => a.SubjectName).Distinct().Count()
                }).ToList();

                // Calculate averages/totals
                var avgStreak = studentStats.Any() ? (int)studentStats.Average(s => s.streak) : 0;
                var avgSubjects = studentStats.Any() ? Math.Round(studentStats.Average(s => s.subjectsCount), 1) : 0;
                var totalBrowsingMinutes = studentStats.Sum(s => s.browsingMinutes);

                return Json(new
                {
                    success = true,
                    totalStudents = memberIds.Count,
                    totalFocusMinutes,
                    totalSessions,
                    avgStreak,
                    avgSubjects,
                    totalBrowsingMinutes,
                    students = studentStats
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> SearchUsers(string email)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            if (string.IsNullOrWhiteSpace(email))
                return Json(new { success = false, error = "Email is required" });

            try
            {
                var users = await _context.Users
                    .Where(u => u.Email.Contains(email))
                    .Take(10)
                    .Select(u => new { id = u.Id, name = u.FullName, email = u.Email })
                    .ToListAsync();

                return Json(new { success = true, users });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SendInvite([FromBody] SendInviteDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            try
            {
                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == dto.ClassId);
                if (cls == null)
                    return Json(new { success = false, error = "Class not found" });

                if (cls.OwnerId != sessionUserId.Value)
                    return Json(new { success = false, error = "Only class owner can send invites" });

                var result = await _notificationService.CreateNotificationAsync(
                    dto.UserId,
                    "class_invite",
                    $"Class Invitation: {cls.Name}",
                    $"You have been invited to join {cls.Name}. Join code: {cls.JoinCode}",
                    cls.Id
                );

                return Json(new { success = result.Success, error = result.Error });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        public class SendInviteDto { public int ClassId { get; set; } public int UserId { get; set; } }
    }
}
