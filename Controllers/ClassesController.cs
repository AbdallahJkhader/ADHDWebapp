using System;
using System.Linq;
using System.Threading.Tasks;
using ADHDWebApp.Data;
using ADHDWebApp.Models;
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
        public ClassesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> Leave([FromBody] LeaveClassDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                var userId = sessionUserId.Value;

                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == dto.Id);
                if (cls == null)
                    return Json(new { success = false, error = "Class not found" });

                if (cls.OwnerId == userId)
                    return Json(new { success = false, error = "Owner cannot leave their own class" });

                var membership = await _context.ClassMemberships.FirstOrDefaultAsync(m => m.UserId == userId && m.ClassId == cls.Id);
                if (membership == null)
                    return Json(new { success = false, error = "You are not a member of this class" });

                _context.ClassMemberships.Remove(membership);
                await _context.SaveChangesAsync();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> RemoveMember([FromBody] RemoveMemberDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                var userId = sessionUserId.Value;

                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == dto.ClassId);
                if (cls == null)
                    return Json(new { success = false, error = "Class not found" });

                if (cls.OwnerId != userId)
                    return Json(new { success = false, error = "Only the class owner can remove members" });

                if (dto.UserId == cls.OwnerId)
                    return Json(new { success = false, error = "Cannot remove the class owner" });

                var membership = await _context.ClassMemberships.FirstOrDefaultAsync(m => m.UserId == dto.UserId && m.ClassId == cls.Id);
                if (membership == null)
                    return Json(new { success = false, error = "User is not a member of this class" });

                _context.ClassMemberships.Remove(membership);
                await _context.SaveChangesAsync();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Delete([FromBody] DeleteClassDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                var userId = sessionUserId.Value;

                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == dto.Id);
                if (cls == null)
                    return Json(new { success = false, error = "Class not found" });
                if (cls.OwnerId != userId)
                    return Json(new { success = false, error = "Only the class owner can delete this class" });

                var memberships = _context.ClassMemberships.Where(m => m.ClassId == cls.Id);
                _context.ClassMemberships.RemoveRange(memberships);
                _context.Classes.Remove(cls);
                await _context.SaveChangesAsync();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> Details(int id)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == id);
                if (cls == null)
                    return Json(new { success = false, error = "Class not found" });

                var owner = await _context.Users.FirstOrDefaultAsync(u => u.Id == cls.OwnerId);
                var memberships = await _context.ClassMemberships
                    .Where(m => m.ClassId == id)
                    .Include(m => m.User)
                    .ToListAsync();

                var students = memberships
                    .Where(m => m.UserId != cls.OwnerId)
                    .Select(m => new { id = m.UserId, name = m.User!.FullName, email = m.User.Email })
                    .ToList();

                return Json(new
                {
                    success = true,
                    Class = new { id = cls.Id, name = cls.Name, code = cls.JoinCode },
                    Teacher = owner != null ? new { id = owner.Id, name = owner.FullName, email = owner.Email } : null,
                    Students = students
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> Files(int classId)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return Json(new { success = false, error = "Class not found" });

                var files = await _context.ClassFiles
                    .Where(f => f.ClassId == classId)
                    .OrderByDescending(f => f.UploadedAt)
                    .Select(f => new
                    {
                        id = f.Id,
                        name = f.FileName,
                        url = f.FilePath,
                        size = f.FileSize,
                        contentType = f.ContentType,
                        uploadedAt = f.UploadedAt,
                        uploaderId = f.UploaderId
                    })
                    .ToListAsync();

                return Json(new { success = true, files });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        [RequestSizeLimit(50_000_000)]
        public async Task<IActionResult> UploadFile(IFormFile file, int classId)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                var userId = sessionUserId.Value;

                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return Json(new { success = false, error = "Class not found" });
                if (cls.OwnerId != userId)
                    return Json(new { success = false, error = "Only the class owner can upload files" });

                if (file == null || file.Length == 0)
                    return Json(new { success = false, error = "No file uploaded" });

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

                var entity = new ClassFile
                {
                    ClassId = classId,
                    UploaderId = userId,
                    FileName = safeName,
                    FilePath = relativePath,
                    ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
                    FileSize = file.Length,
                    UploadedAt = DateTime.UtcNow
                };
                _context.ClassFiles.Add(entity);
                await _context.SaveChangesAsync();

                return Json(new { success = true, id = entity.Id, name = entity.FileName, url = entity.FilePath });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateClassDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                var ownerId = sessionUserId.Value;

                // Block students from creating classes
                var owner = await _context.Users.FirstOrDefaultAsync(u => u.Id == ownerId);
                if (owner == null)
                    return Json(new { success = false, error = "User not found" });
                if (string.Equals(owner.Role, "Student", StringComparison.OrdinalIgnoreCase))
                    return Json(new { success = false, error = "Students are not allowed to create classes" });

                var name = (dto?.Name ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(name))
                    return Json(new { success = false, error = "Class name is required" });

                string joinCode;
                // generate unique join code
                do
                {
                    joinCode = GenerateJoinCode(8);
                } while (await _context.Classes.AnyAsync(c => c.JoinCode == joinCode));

                var cls = new Class
                {
                    Name = name,
                    JoinCode = joinCode,
                    OwnerId = ownerId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Classes.Add(cls);
                await _context.SaveChangesAsync();

                // auto-join owner
                if (!await _context.ClassMemberships.AnyAsync(m => m.UserId == ownerId && m.ClassId == cls.Id))
                {
                    _context.ClassMemberships.Add(new ClassMembership { UserId = ownerId, ClassId = cls.Id, JoinedAt = DateTime.UtcNow });
                    await _context.SaveChangesAsync();
                }

                return Json(new { success = true, id = cls.Id, name = cls.Name, code = cls.JoinCode });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Join([FromBody] JoinClassDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                var userId = sessionUserId.Value;

                var code = (dto?.Code ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(code))
                    return Json(new { success = false, error = "Join code is required" });

                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.JoinCode == code);
                if (cls == null)
                    return Json(new { success = false, error = "Invalid join code" });

                var exists = await _context.ClassMemberships.AnyAsync(m => m.UserId == userId && m.ClassId == cls.Id);
                if (!exists)
                {
                    _context.ClassMemberships.Add(new ClassMembership { UserId = userId, ClassId = cls.Id, JoinedAt = DateTime.UtcNow });
                    await _context.SaveChangesAsync();
                }

                return Json(new { success = true, id = cls.Id, name = cls.Name });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> My()
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                var userId = sessionUserId.Value;

                var memberClasses = await _context.ClassMemberships
                    .Where(m => m.UserId == userId)
                    .Include(m => m.Class)
                    .Select(m => new { id = m.ClassId, name = m.Class!.Name, code = m.Class.JoinCode, ownerId = m.Class.OwnerId })
                    .ToListAsync();

                var ownedClasses = await _context.Classes
                    .Where(c => c.OwnerId == userId)
                    .Select(c => new { id = c.Id, name = c.Name, code = c.JoinCode, ownerId = c.OwnerId })
                    .ToListAsync();

                var combined = memberClasses
                    .Concat(ownedClasses)
                    .GroupBy(x => x.id)
                    .Select(g => g.First())
                    .ToList();

                return Json(new { success = true, classes = combined });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
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

        // ===== Class Chat Endpoints =====
        [HttpGet]
        public async Task<IActionResult> Chat(int classId, int? afterId)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                var userId = sessionUserId.Value;

                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return Json(new { success = false, error = "Class not found" });

                // Membership or ownership required
                var isMember = await _context.ClassMemberships.AnyAsync(m => m.UserId == userId && m.ClassId == classId) || cls.OwnerId == userId;
                if (!isMember)
                    return Json(new { success = false, error = "You are not a member of this class" });

                var query = _context.ClassChatMessages
                    .Where(m => m.ClassId == classId)
                    .Include(m => m.Sender)
                    .OrderBy(m => m.Id)
                    .AsQueryable();

                if (afterId.HasValue && afterId.Value > 0)
                {
                    query = query.Where(m => m.Id > afterId.Value);
                }

                var msgs = await query
                    .Take(200)
                    .Select(m => new {
                        id = m.Id,
                        senderId = m.SenderId,
                        senderName = m.Sender.FullName,
                        content = m.Content,
                        sentAt = m.SentAt
                    })
                    .ToListAsync();

                return Json(new { success = true, messages = msgs });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        public class SendClassChatDto { public int ClassId { get; set; } public string Content { get; set; } = string.Empty; }

        [HttpPost]
        public async Task<IActionResult> SendChat([FromBody] SendClassChatDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                var userId = sessionUserId.Value;

                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == dto.ClassId);
                if (cls == null)
                    return Json(new { success = false, error = "Class not found" });

                // Membership or ownership required
                var isMember = await _context.ClassMemberships.AnyAsync(m => m.UserId == userId && m.ClassId == dto.ClassId) || cls.OwnerId == userId;
                if (!isMember)
                    return Json(new { success = false, error = "You are not a member of this class" });

                var content = (dto.Content ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(content))
                    return Json(new { success = false, error = "Message cannot be empty" });

                var msg = new ClassChatMessage
                {
                    ClassId = dto.ClassId,
                    SenderId = userId,
                    Content = content,
                    SentAt = DateTime.UtcNow
                };

                _context.ClassChatMessages.Add(msg);
                await _context.SaveChangesAsync();

                return Json(new { success = true, id = msg.Id, sentAt = msg.SentAt });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }
    }
}
