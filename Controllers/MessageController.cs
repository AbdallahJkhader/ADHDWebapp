using System;
using System.Linq;
using System.Threading.Tasks;
using ADHDWebApp.Models;
using ADHDWebApp.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ADHDWebApp.Controllers
{
    [Route("[controller]/[action]")]
    public class MessageController : Controller
    {
        private readonly IMessageService _messageService;

        public MessageController(IMessageService messageService)
        {
            _messageService = messageService;
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            if (dto == null)
                return Json(new { success = false, error = "Invalid data" });

            var result = await _messageService.SendMessageAsync(sessionUserId.Value, dto.RecipientId, dto.Content);
            
            if (result.Success)
                return Json(new { success = true, messageId = result.MessageId });
            
            return Json(new { success = false, error = result.Error });
        }

        [HttpGet]
        public async Task<IActionResult> GetMessages(int? withUserId)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            if (!withUserId.HasValue)
                 return Json(new { success = false, error = "Invalid user ID" });

            var result = await _messageService.GetMessagesAsync(sessionUserId.Value, withUserId.Value);
            
            if (result.Success)
                return Json(new { success = true, messages = result.Messages });
            
            return Json(new { success = false, error = result.Error });
        }

        [HttpGet]
        public async Task<IActionResult> GetRecentConversations()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var result = await _messageService.GetRecentConversationsAsync(sessionUserId.Value);
            
            if (result.Success)
                return Json(new { success = true, conversations = result.Conversations });
            
            return Json(new { success = false, error = result.Error });
        }

        [HttpPost]
        public async Task<IActionResult> MarkAsRead([FromBody] MarkMessageAsReadDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            if (dto?.MessageIds == null || dto.MessageIds.Length == 0)
                 return Json(new { success = true }); // Nothing to mark

            var result = await _messageService.MarkAsReadAsync(sessionUserId.Value, dto.MessageIds);
            
            if (result.Success)
                return Json(new { success = true });
            
            return Json(new { success = false, error = result.Error });
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
