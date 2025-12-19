using ADHDWebApp.Data;
using ADHDWebApp.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ADHDWebApp.Services
{
    public class MessageService : IMessageService
    {
        private readonly AppDbContext _context;

        public MessageService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(bool Success, string Error, int MessageId)> SendMessageAsync(int senderId, int recipientId, string content)
        {
            try
            {
                if (senderId == recipientId) return (false, "You cannot send messages to yourself", 0);
                if (string.IsNullOrWhiteSpace(content)) return (false, "Message content cannot be empty", 0);

                var recipient = await _context.Users.FindAsync(recipientId);
                if (recipient == null) return (false, "Recipient not found", 0);

                var message = new Message
                {
                    SenderId = senderId,
                    RecipientId = recipientId,
                    Content = content,
                    SentAt = DateTime.UtcNow,
                    IsRead = false
                };

                _context.Messages.Add(message);
                await _context.SaveChangesAsync();

                return (true, string.Empty, message.Id);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, 0);
            }
        }

        public async Task<(bool Success, string Error, IEnumerable<object> Messages)> GetMessagesAsync(int userId, int otherUserId)
        {
            try
            {
                if (otherUserId <= 0) return (false, "Invalid user ID", null);

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

                return (true, string.Empty, messages);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error, IEnumerable<object> Conversations)> GetRecentConversationsAsync(int userId)
        {
            try
            {
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

                return (true, string.Empty, conversations);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error)> MarkAsReadAsync(int userId, int[] messageIds)
        {
             try
            {
                var messages = await _context.Messages
                    .Where(m => messageIds.Contains(m.Id) && m.RecipientId == userId)
                    .ToListAsync();

                foreach (var message in messages)
                {
                    message.IsRead = true;
                    message.ReadAt = DateTime.UtcNow;
                }

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
