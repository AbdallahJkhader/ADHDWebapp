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
    public class SharedFileController : Controller
    {
        private readonly ISharedFileService _sharedFileService;

        public SharedFileController(ISharedFileService sharedFileService)
        {
            _sharedFileService = sharedFileService;
        }

        [HttpPost]
        public async Task<IActionResult> ShareFile([FromBody] ShareFileDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            if (dto == null)
                 return Json(new { success = false, error = "Invalid data" });

            var result = await _sharedFileService.ShareFileAsync(sessionUserId.Value, dto.RecipientId, dto.FileId, dto.Description);
            
            if (result.Success)
                return Json(new { success = true, sharedFileId = result.SharedFileId });
            
            return Json(new { success = false, error = result.Error });
        }

        [HttpGet]
        public async Task<IActionResult> SharedWithMe()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var result = await _sharedFileService.GetSharedWithMeAsync(sessionUserId.Value);
            
            if (result.Success)
                return Json(new { success = true, sharedFiles = result.SharedFiles });
            
            return Json(new { success = false, error = result.Error });
        }

        [HttpGet]
        public async Task<IActionResult> SharedByMe()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            var result = await _sharedFileService.GetSharedByMeAsync(sessionUserId.Value);
            
            if (result.Success)
                return Json(new { success = true, sharedFiles = result.SharedFiles });
            
            return Json(new { success = false, error = result.Error });
        }

        [HttpPost]
        public async Task<IActionResult> MarkAsRead([FromBody] MarkAsReadDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
                return Json(new { success = false, error = "Not logged in" });

            if (dto == null || dto.SharedFileId <= 0)
                  return Json(new { success = false, error = "Invalid shared file ID" });

            var result = await _sharedFileService.MarkAsReadAsync(sessionUserId.Value, dto.SharedFileId);
            
            if (result.Success)
                return Json(new { success = true });
            
            return Json(new { success = false, error = result.Error });
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
