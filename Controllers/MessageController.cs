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
    public class MessageController : Controller
    {
        private readonly AppDbContext _context;

        public MessageController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var senderId = sessionUserId.Value;
                var recipientId = dto.RecipientId;

                if (senderId == recipientId)
                    return Json(new { success = false, error = "You cannot send messages to yourself" });

                if (string.IsNullOrWhiteSpace(dto.Content))
                    return Json(new { success = false, error = "Message content cannot be empty" });

                // Check if users are friends
                var friendship = await _context.FriendRequests.FirstOrDefaultAsync(fr =>
                    fr.Status == FriendRequestStatus.Accepted &&
                    ((fr.RequesterId == senderId && fr.AddresseeId == recipientId) ||
                     (fr.RequesterId == recipientId && fr.AddresseeId == senderId))
                );

                if (friendship == null)
                    return Json(new { success = false, error = "You can only send messages to friends" });

                // Check if recipient exists
                var recipient = await _context.Users.FirstOrDefaultAsync(u => u.Id == recipientId);
                if (recipient == null)
                    return Json(new { success = false, error = "Recipient not found" });

                // Create message
                var message = new Message
                {
                    SenderId = senderId,
                    RecipientId = recipientId,
                    Content = dto.Content,
                    SentAt = DateTime.UtcNow,
                    IsRead = false
                };

                _context.Messages.Add(message);
                await _context.SaveChangesAsync();

                return Json(new { success = true, messageId = message.Id });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetMessages(int? withUserId)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;

                if (!withUserId.HasValue || withUserId.Value <= 0)
                    return Json(new { success = false, error = "Invalid user ID" });

                var otherUserId = withUserId.Value;

                // Check if users are friends
                var friendship = await _context.FriendRequests.FirstOrDefaultAsync(fr =>
                    fr.Status == FriendRequestStatus.Accepted &&
                    ((fr.RequesterId == userId && fr.AddresseeId == otherUserId) ||
                     (fr.RequesterId == otherUserId && fr.AddresseeId == userId))
                );

                if (friendship == null)
                    return Json(new { success = false, error = "You can only view messages with friends" });

                var messages = await _context.Messages
                    .Where(m =>
                        (m.SenderId == userId && m.RecipientId == otherUserId) ||
                        (m.SenderId == otherUserId && m.RecipientId == userId))
                    .Include(m => m.Sender)
                    .Include(m => m.Recipient)
                    .OrderBy(m => m.SentAt)
                    .Select(m => new
                    {
                        id = m.Id,
                        senderId = m.SenderId,
                        senderName = m.Sender.FullName,
                        recipientId = m.RecipientId,
                        recipientName = m.Recipient.FullName,
                        content = m.Content,
                        sentAt = m.SentAt,
                        isRead = m.IsRead,
                        isFromMe = m.SenderId == userId
                    })
                    .ToListAsync();

                return Json(new { success = true, messages });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetRecentConversations()
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;

                var conversations = await _context.Messages
                    .Where(m => m.SenderId == userId || m.RecipientId == userId)
                    .Include(m => m.Sender)
                    .Include(m => m.Recipient)
                    .GroupBy(m => m.SenderId == userId ? m.RecipientId : m.SenderId)
                    .Select(g => new
                    {
                        userId = g.Key,
                        userName = g.FirstOrDefault(m => m.SenderId == g.Key || m.RecipientId == g.Key).SenderId == g.Key
                            ? g.FirstOrDefault(m => m.SenderId == g.Key || m.RecipientId == g.Key).Sender.FullName
                            : g.FirstOrDefault(m => m.SenderId == g.Key || m.RecipientId == g.Key).Recipient.FullName,
                        lastMessage = g.OrderByDescending(m => m.SentAt).FirstOrDefault().Content,
                        lastMessageTime = g.OrderByDescending(m => m.SentAt).FirstOrDefault().SentAt,
                        unreadCount = g.Count(m => !m.IsRead && m.RecipientId == userId)
                    })
                    .OrderByDescending(c => c.lastMessageTime)
                    .Take(20)
                    .ToListAsync();

                return Json(new { success = true, conversations });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> MarkAsRead([FromBody] MarkMessageAsReadDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;

                var messages = await _context.Messages
                    .Where(m => dto.MessageIds.Contains(m.Id) && m.RecipientId == userId)
                    .ToListAsync();

                foreach (var message in messages)
                {
                    message.IsRead = true;
                    message.ReadAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        public class SendMessageDto
        {
            public int RecipientId { get; set; }
            public string Content { get; set; }
        }

        public class MarkMessageAsReadDto
        {
            public int[] MessageIds { get; set; }
        }
    }
}
