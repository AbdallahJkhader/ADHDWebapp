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
    public class SharedFileController : Controller
    {
        private readonly AppDbContext _context;

        public SharedFileController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> ShareFile([FromBody] ShareFileDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var senderId = sessionUserId.Value;
                var recipientId = dto.RecipientId;
                var fileId = dto.FileId;

                // Validate inputs
                if (recipientId <= 0 || fileId <= 0)
                    return Json(new { success = false, error = "Invalid recipient or file ID" });

                if (senderId == recipientId)
                    return Json(new { success = false, error = "You cannot share files with yourself" });

                // Check if file exists and belongs to sender
                var file = await _context.UserFiles.FirstOrDefaultAsync(f => f.Id == fileId && f.UserId == senderId);
                if (file == null)
                    return Json(new { success = false, error = "File not found or not accessible" });

                // Check if users are friends
                var friendship = await _context.FriendRequests.FirstOrDefaultAsync(fr =>
                    fr.Status == FriendRequestStatus.Accepted &&
                    ((fr.RequesterId == senderId && fr.AddresseeId == recipientId) ||
                     (fr.RequesterId == recipientId && fr.AddresseeId == senderId))
                );

                if (friendship == null)
                    return Json(new { success = false, error = "You can only share files with friends" });

                // Check if recipient exists
                var recipient = await _context.Users.FirstOrDefaultAsync(u => u.Id == recipientId);
                if (recipient == null)
                    return Json(new { success = false, error = "Recipient not found" });

                // Create shared file
                var sharedFile = new SharedFile
                {
                    SenderId = senderId,
                    RecipientId = recipientId,
                    OriginalFileId = fileId,
                    SharedFileName = file.FileName,
                    Description = dto.Description,
                    SharedAt = DateTime.UtcNow,
                    IsRead = false
                };

                _context.SharedFiles.Add(sharedFile);
                await _context.SaveChangesAsync();

                return Json(new { success = true, sharedFileId = sharedFile.Id });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> SharedWithMe()
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;

                var sharedFiles = await _context.SharedFiles
                    .Where(sf => sf.RecipientId == userId)
                    .Include(sf => sf.Sender)
                    .Include(sf => sf.OriginalFile)
                    .OrderByDescending(sf => sf.SharedAt)
                    .Select(sf => new
                    {
                        id = sf.Id,
                        senderId = sf.SenderId,
                        senderName = sf.Sender.FullName,
                        fileName = sf.SharedFileName,
                        description = sf.Description,
                        sharedAt = sf.SharedAt,
                        isRead = sf.IsRead,
                        originalFileId = sf.OriginalFileId,
                        originalFileName = sf.OriginalFile.FileName
                    })
                    .ToListAsync();

                return Json(new { success = true, sharedFiles });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> SharedByMe()
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;

                var sharedFiles = await _context.SharedFiles
                    .Where(sf => sf.SenderId == userId)
                    .Include(sf => sf.Recipient)
                    .Include(sf => sf.OriginalFile)
                    .OrderByDescending(sf => sf.SharedAt)
                    .Select(sf => new
                    {
                        id = sf.Id,
                        recipientId = sf.RecipientId,
                        recipientName = sf.Recipient.FullName,
                        fileName = sf.SharedFileName,
                        description = sf.Description,
                        sharedAt = sf.SharedAt,
                        isRead = sf.IsRead,
                        originalFileId = sf.OriginalFileId,
                        originalFileName = sf.OriginalFile.FileName
                    })
                    .ToListAsync();

                return Json(new { success = true, sharedFiles });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> MarkAsRead([FromBody] MarkAsReadDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;
                var sharedFileId = dto.SharedFileId;

                var sharedFile = await _context.SharedFiles.FirstOrDefaultAsync(sf =>
                    sf.Id == sharedFileId && sf.RecipientId == userId);

                if (sharedFile == null)
                    return Json(new { success = false, error = "Shared file not found" });

                sharedFile.IsRead = true;
                sharedFile.ReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        public class ShareFileDto
        {
            public int RecipientId { get; set; }
            public int FileId { get; set; }
            public string? Description { get; set; }
        }

        public class MarkAsReadDto
        {
            public int SharedFileId { get; set; }
        }
    }
}
