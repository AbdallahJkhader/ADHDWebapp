using System;
using System.Linq;
using System.Threading.Tasks;
using ADHDWebApp.Data;
using ADHDWebApp.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
        public async Task<IActionResult> Create([FromBody] CreateClassDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                var ownerId = sessionUserId.Value;

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

                var list = await _context.ClassMemberships
                    .Where(m => m.UserId == userId)
                    .Include(m => m.Class)
                    .Select(m => new { id = m.ClassId, name = m.Class!.Name, code = m.Class.JoinCode, ownerId = m.Class.OwnerId })
                    .ToListAsync();

                return Json(new { success = true, classes = list });
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
    }
}
