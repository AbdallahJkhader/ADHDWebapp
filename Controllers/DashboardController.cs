using ADHDWebApp.Models;
using ADHDWebApp.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using System.Net;
using Microsoft.AspNetCore.Hosting;

namespace ADHDWebApp.Controllers
{
    public class DashboardController : Controller
    {
        private readonly IDashboardService _dashboardService;
        private readonly IClassesService _classesService;
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;
        private readonly INotificationService _notificationService;

        public DashboardController(IDashboardService dashboardService, IClassesService classesService, IConfiguration config, IWebHostEnvironment env, INotificationService notificationService)
        {
            _dashboardService = dashboardService;
            _classesService = classesService;
            _config = config;
            _env = env;
            _notificationService = notificationService;
        }

        public class SummarizeRequest { public string? Text { get; set; } }

        [HttpPost]
        [Route("Dashboard/Summarize")]
        public async Task<IActionResult> Summarize([FromBody] SummarizeRequest req)
        {
            try
            {
                var userEmail = HttpContext.Session.GetString("UserEmail");
                if (string.IsNullOrEmpty(userEmail))
                    return Json(new { success = false, error = "Not logged in" });

                if (req == null || string.IsNullOrWhiteSpace(req.Text))
                    return Json(new { success = false, error = "No text provided" });

                var now = DateTime.UtcNow;
                var lastStr = HttpContext.Session.GetString("SummarizeLastAt");
                if (DateTime.TryParse(lastStr, out var lastAt))
                {
                    if (lastAt.Kind == DateTimeKind.Local) lastAt = lastAt.ToUniversalTime();
                    var diff = now - lastAt;
                    if (diff.TotalSeconds >= 0 && diff.TotalSeconds < 5)
                    {
                        var remaining = Math.Ceiling(5 - diff.TotalSeconds);
                        Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
                        return Json(new { success = false, error = $"Please wait {remaining} seconds before trying again." });
                    }
                }
                HttpContext.Session.SetString("SummarizeLastAt", now.ToString("o"));

                var apiKey = _config["Groq:ApiKey"] ?? Environment.GetEnvironmentVariable("GROQ_API_KEY");
                var model = _config["Groq:Model"];
                var baseUrl = _config["Groq:BaseUrl"];

                var result = await _dashboardService.SummarizeTextAsync(req.Text, apiKey, model, baseUrl);
                
                if (result.Success)
                     return Json(new { success = true, summary = result.Summary });
                
                return Json(new { success = false, error = result.Error });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        [Route("Dashboard/GenerateQuiz")]
        public async Task<IActionResult> GenerateQuiz([FromBody] SummarizeRequest req)
        {
            try
            {
                var userEmail = HttpContext.Session.GetString("UserEmail");
                if (string.IsNullOrEmpty(userEmail)) return Json(new { success = false, error = "Not logged in" });

                if (req == null || string.IsNullOrWhiteSpace(req.Text))
                    return Json(new { success = false, error = "No text provided" });

                // Reuse logic for throttling or keep it separate? Let's implement basic throttling.
                var now = DateTime.UtcNow;
                var lastStr = HttpContext.Session.GetString("QuizLastAt");
                if (DateTime.TryParse(lastStr, out var lastAt))
                {
                    if (lastAt.Kind == DateTimeKind.Local) lastAt = lastAt.ToUniversalTime();
                    var diff = now - lastAt;
                    if (diff.TotalSeconds >= 0 && diff.TotalSeconds < 5)
                    {
                         var remaining = Math.Ceiling(5 - diff.TotalSeconds);
                         return Json(new { success = false, error = $"Please wait {remaining} seconds." });
                    }
                }
                HttpContext.Session.SetString("QuizLastAt", now.ToString("o"));

                var apiKey = _config["Groq:ApiKey"] ?? Environment.GetEnvironmentVariable("GROQ_API_KEY");
                var model = _config["Groq:Model"];
                var baseUrl = _config["Groq:BaseUrl"];

                var result = await _dashboardService.GenerateQuizAsync(req.Text, apiKey, model, baseUrl);
                
                if (result.Success)
                     return Json(new { success = true, quizJson = result.QuizJson });
                
                return Json(new { success = false, error = result.Error });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        [Route("Dashboard/GenerateFlashcards")]
        public async Task<IActionResult> GenerateFlashcards([FromBody] SummarizeRequest req)
        {
            try
            {
                var userEmail = HttpContext.Session.GetString("UserEmail");
                if (string.IsNullOrEmpty(userEmail)) return Json(new { success = false, error = "Not logged in" });

                if (req == null || string.IsNullOrWhiteSpace(req.Text))
                    return Json(new { success = false, error = "No text provided" });

                var now = DateTime.UtcNow;
                var lastStr = HttpContext.Session.GetString("FlashcardsLastAt");
                if (DateTime.TryParse(lastStr, out var lastAt))
                {
                     if (lastAt.Kind == DateTimeKind.Local) lastAt = lastAt.ToUniversalTime();
                     var diff = now - lastAt;
                     if (diff.TotalSeconds >= 0 && diff.TotalSeconds < 5)
                     {
                         var remaining = Math.Ceiling(5 - diff.TotalSeconds);
                         return Json(new { success = false, error = $"Please wait {remaining} seconds." });
                     }
                }
                HttpContext.Session.SetString("FlashcardsLastAt", now.ToString("o"));

                var apiKey = _config["Groq:ApiKey"] ?? Environment.GetEnvironmentVariable("GROQ_API_KEY");
                var model = _config["Groq:Model"];
                var baseUrl = _config["Groq:BaseUrl"];

                var result = await _dashboardService.GenerateFlashcardsAsync(req.Text, apiKey, model, baseUrl);
                
                if (result.Success)
                     return Json(new { success = true, flashcardsJson = result.FlashcardsJson });
                
                return Json(new { success = false, error = result.Error });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> UploadAvatar(IFormFile avatar)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return RedirectToAction("Login", "Account");

            if (avatar == null || avatar.Length == 0)
            {
                TempData["Error"] = "No image uploaded.";
                return RedirectToAction("Index");
            }

            var ext = Path.GetExtension(avatar.FileName).ToLowerInvariant();
            var allowed = new HashSet<string> { ".png", ".jpg", ".jpeg", ".webp" };
            if (!allowed.Contains(ext))
            {
                TempData["Error"] = "Unsupported image type.";
                return RedirectToAction("Index");
            }

            using (var stream = avatar.OpenReadStream())
            {
                var result = await _dashboardService.UpdateAvatarAsync(sessionUserId.Value, ext, stream, _env.WebRootPath);
                if (result.Success)
                    TempData["Success"] = "Profile image updated.";
                else
                    TempData["Error"] = result.Error;
            }

            return RedirectToAction("Index");
        }

        public async Task<IActionResult> IndexAsync()
        {
            var userEmail = HttpContext.Session.GetString("UserEmail");
            var fullName = HttpContext.Session.GetString("FullName");
            var sessionUserId = HttpContext.Session.GetInt32("UserId");

            if (string.IsNullOrEmpty(userEmail) || sessionUserId == null)
            {
                TempData["Error"] = "Please log in.";
                return RedirectToAction("Login", "Account");
            }

            if (TempData["UploadedText"] != null)
            {
                ViewBag.ShowLeftPanel = true;
                ViewBag.UploadedText = TempData["UploadedText"];
                ViewBag.FileName = TempData["FileName"];
                ViewBag.FileId = TempData["FileId"];
            }
            if (TempData["ShowLeftPanel"] != null)
                ViewBag.ShowLeftPanel = TempData["ShowLeftPanel"].ToString() == "true";

            ViewBag.UserEmail = userEmail;
            ViewBag.FullName = fullName;
            ViewBag.UserId = sessionUserId.Value;
            ViewBag.Role = HttpContext.Session.GetString("Role");

            var result = await _dashboardService.GetUserFilesAsync(sessionUserId.Value);
            ViewBag.UserFiles = result.Success ? result.Files : new List<UserFile>();
            
            // Avatar URL logic
            var avatarsFolder = Path.Combine(_env.WebRootPath, "avatars");
            string? avatarUrl = null;
            if (Directory.Exists(avatarsFolder))
            {
                var candidates = new[] { ".png", ".jpg", ".jpeg", ".webp" };
                foreach(var ext in candidates) {
                    if (System.IO.File.Exists(Path.Combine(avatarsFolder, $"user_{sessionUserId}{ext}"))) {
                        avatarUrl = $"/avatars/user_{sessionUserId}{ext}";
                        break;
                    }
                }
            }
            // Fetch additional profile data
            var user = await _dashboardService.GetUserAsync(sessionUserId.Value);
            ViewBag.DateOfBirth = user?.DateOfBirth;

            // Fallback: If Role is missing in session (e.g. old login), use the one from DB
            if (string.IsNullOrEmpty(ViewBag.Role as string) && user != null)
            {
                ViewBag.Role = user.Role;
                if (!string.IsNullOrEmpty(user.Role)) HttpContext.Session.SetString("Role", user.Role);
            }

            var progressResult = await _dashboardService.GetProgressAsync(sessionUserId.Value, null);
            if (progressResult.Success && progressResult.Progress != null)
            {
                // Use reflection or dynamic to get Streak if it's an anonymous object
                // Or simplified: just cast to dynamic
                dynamic prog = progressResult.Progress;
                ViewBag.Streak = prog.GetType().GetProperty("streak")?.GetValue(prog, null) ?? 0;
            }
            else
            {
                ViewBag.Streak = 0;
            }

            // Files for count
            var filesResult = await _dashboardService.GetUserFilesAsync(sessionUserId.Value);
            ViewBag.UserFiles = filesResult.Success ? filesResult.Files : new List<UserFile>(); // Used for count and list

            // Classes for count
            var classesResult = await _classesService.GetUserClassesAsync(sessionUserId.Value);
            ViewBag.UserClasses = classesResult.Classes?.Select(c => 
            {
                dynamic d = c;
                return new Class { Id = d.id, Name = d.name };
            }).ToList() ?? new List<Class>();

            ViewBag.AvatarUrl = avatarUrl;
            
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> UpdateDateOfBirth(DateTime dob)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return RedirectToAction("Login", "Account");

            await _dashboardService.UpdateDateOfBirthAsync(sessionUserId.Value, dob);
            TempData["Success"] = "Date of Birth updated.";
            return RedirectToAction("Index");
        }

        [HttpPost]
        public async Task<IActionResult> UpdateFullName(string fullName)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return RedirectToAction("Login", "Account");

            if (string.IsNullOrWhiteSpace(fullName))
            {
                TempData["Error"] = "Name cannot be empty.";
                return RedirectToAction("Index");
            }

            await _dashboardService.UpdateFullNameAsync(sessionUserId.Value, fullName.Trim());
            TempData["Success"] = "Name updated successfully.";
            return RedirectToAction("Index");
        }

        [HttpPost]
        [Route("Dashboard/DeleteFiles")]
        public async Task<IActionResult> DeleteFiles([FromBody] List<int> ids)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
             if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });

            var result = await _dashboardService.DeleteFilesAsync(sessionUserId.Value, ids);
            if (result.Success) return Json(new { success = true, deleted = ids });
            return Json(new { success = false, error = result.Error });
        }

        [HttpPost]
        public async Task<IActionResult> UploadDocument(IFormFile file)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return RedirectToAction("Login", "Account");

             if (file == null || file.Length == 0) {
                TempData["InlineError"] = "No file uploaded.";
                return RedirectToAction("Index");
            }

            var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);
            
            var fileName = Path.GetFileName(file.FileName);
            var filePath = Path.Combine(uploadsFolder, fileName);
            
            using (var stream = new FileStream(filePath, FileMode.Create)) {
                await file.CopyToAsync(stream);
            }

            var result = await _dashboardService.SaveUserFileAsync(sessionUserId.Value, fileName, "/uploads/" + fileName, file.ContentType, file.Length);
            
            if (result.Success)
                 return RedirectToAction("ReadandDisplayFile", new { fileId = result.FileId });
            
            TempData["Error"] = result.Error;
            return RedirectToAction("Index");
        }

        public async Task<IActionResult> ReadandDisplayFile(int fileId)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return RedirectToAction("Login", "Account");

            var result = await _dashboardService.GetFileContentAsync(sessionUserId.Value, fileId, _env.WebRootPath);

            if (result.Success)
            {
                TempData["FileUploadSuccess"] = "File uploaded successfully!";
                TempData["ShowLeftPanel"] = "true";
                TempData["UploadedText"] = result.Content;
                TempData["FileName"] = result.File!.FileName;
                TempData["FileId"] = result.File.Id.ToString();
            }
            else
            {
                TempData["Error"] = result.Error; // Handle error case if GetFileContentAsync fails
            }
            return RedirectToAction("Index");
        }

        [HttpGet]
        [Route("Dashboard/GetFileContent")]
        public async Task<IActionResult> GetFileContent(int fileId)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });

            var result = await _dashboardService.GetFileContentAsync(sessionUserId.Value, fileId, _env.WebRootPath);
            
            if (!result.Success) return Json(new { success = false, error = result.Error });

            var url = result.File?.FilePath; 
            if (!string.IsNullOrEmpty(url) && !url.StartsWith("/")) url = "/" + url;
            
            var contentToSend = (result.DisplayType == "text") ? result.Content : url;

            return Json(new { 
                success = true, 
                fileName = result.File!.FileName,
                content = contentToSend,
                displayType = result.DisplayType,
                fileSize = result.File.FileSize,
                uploadedAt = result.File.UploadedAt.ToString("MMM dd, yyyy"),
                truncated = result.Truncated
            });
        }
        
        public class SaveTextRequest { public string? FileName { get; set; } public string? Content { get; set; } }

        [HttpPost]
        [Route("Dashboard/SaveText")]
        public async Task<IActionResult> SaveText([FromBody] SaveTextRequest req)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });
            if (req == null) return Json(new { success = false, error = "Invalid request" });

            var fileName = string.IsNullOrWhiteSpace(req.FileName) ? "Untitled.txt" : req.FileName.Trim();
            if (!fileName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase)) fileName += ".txt";
            
            var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);
            
            var targetPath = Path.Combine(uploadsFolder, fileName); // Note: Should ideally ensure uniqueness to avoid overwrite, but simple logic for now
            await System.IO.File.WriteAllTextAsync(targetPath, req.Content ?? "");

            var result = await _dashboardService.SaveUserFileAsync(sessionUserId.Value, fileName, "/uploads/" + fileName, "text/plain", new FileInfo(targetPath).Length);
            
            if (result.Success) return Json(new { success = true, fileId = result.FileId, fileName = fileName });
            return Json(new { success = false, error = result.Error });
        }

        public class SaveVideoRequest { public string? FileName { get; set; } public string? VideoData { get; set; } public string? ContentType { get; set; } }

        [HttpPost]
        [Route("Dashboard/SaveVideo")]
        public async Task<IActionResult> SaveVideo([FromBody] SaveVideoRequest req)
        {
             var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });
            
             if (string.IsNullOrWhiteSpace(req.VideoData)) return Json(new { success = false, error = "No data" });
             
             var fileName = string.IsNullOrWhiteSpace(req.FileName) ? "video.mp4" : req.FileName;
             var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
             if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

             var targetPath = Path.Combine(uploadsFolder, fileName);
             try {
                 var base64Data = req.VideoData.Contains(",") ? req.VideoData.Split(',')[1] : req.VideoData;
                 var videoBytes = Convert.FromBase64String(base64Data);
                 await System.IO.File.WriteAllBytesAsync(targetPath, videoBytes);
                 
                 var mime = string.IsNullOrWhiteSpace(req.ContentType) ? "video/mp4" : req.ContentType;
                 var result = await _dashboardService.SaveUserFileAsync(sessionUserId.Value, fileName, "/uploads/"+fileName, mime, videoBytes.Length);
                 
                 if (result.Success) return Json(new { success = true, fileId = result.FileId });
                 return Json(new { success = false, error = result.Error });
             }
             catch(Exception ex) { return Json(new {success=false, error=ex.Message}); }
        }

        public class SaveVideoLinkRequest { public string? Title { get; set; } public string? Url { get; set; } }

        [HttpPost]
        [Route("Dashboard/SaveVideoLink")]
        public async Task<IActionResult> SaveVideoLink([FromBody] SaveVideoLinkRequest req)
        {
             var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });
            
             if (string.IsNullOrWhiteSpace(req.Url)) return Json(new { success = false, error = "No URL provided" });
             
             var title = string.IsNullOrWhiteSpace(req.Title) ? "YouTube Video" : req.Title;
             
             // Save as a "file" but with persistent Youtube link as path
             var result = await _dashboardService.SaveUserFileAsync(sessionUserId.Value, title, req.Url, "video/youtube", 0);
             
             if (result.Success) return Json(new { success = true, fileId = result.FileId });
             return Json(new { success = false, error = result.Error });
        }



        [HttpPost]
        public async Task<IActionResult> RecordBrowsingSession([FromBody] RecordTimeDto model)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return Json(new { success = false, error = "Not logged in" });

            // model.Duration is in minutes
            var (success, error) = await _dashboardService.RecordBrowsingSessionAsync(userId.Value, model.Duration, model.SubjectName);
            if (!success) return Json(new { success = false, error });

            return Json(new { success = true });
        }

        public class RecordTimeDto
        {
            public int Duration { get; set; }
            public string SubjectName { get; set; }
            public string ActivityType { get; set; } // Optional
        }
        public class SaveAudioRequest { public string? FileName { get; set; } public string? AudioData { get; set; } public string? ContentType { get; set; } }
        
        [HttpPost]
        [Route("Dashboard/SaveAudio")]
        public async Task<IActionResult> SaveAudio([FromBody] SaveAudioRequest req)
        {
             var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });
            
             if (string.IsNullOrWhiteSpace(req.AudioData)) return Json(new { success = false, error = "No data" });
             
             var fileName = string.IsNullOrWhiteSpace(req.FileName) ? "audio.mp3" : req.FileName;
             var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
             if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

             var targetPath = Path.Combine(uploadsFolder, fileName);
             try {
                 var base64Data = req.AudioData.Contains(",") ? req.AudioData.Split(',')[1] : req.AudioData;
                 var audioBytes = Convert.FromBase64String(base64Data);
                 await System.IO.File.WriteAllBytesAsync(targetPath, audioBytes);
                 
                 var mime = string.IsNullOrWhiteSpace(req.ContentType) ? "audio/mpeg" : req.ContentType;
                 var result = await _dashboardService.SaveUserFileAsync(sessionUserId.Value, fileName, "/uploads/"+fileName, mime, audioBytes.Length);
                 
                 if (result.Success) return Json(new { success = true, fileId = result.FileId });
                 return Json(new { success = false, error = result.Error });
             }
             catch(Exception ex) { return Json(new {success=false, error=ex.Message}); }
        }

        [HttpGet]
        [Route("Dashboard/GetVideoFiles")]
        public async Task<IActionResult> GetVideoFiles()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });

            var result = await _dashboardService.GetUserFilesByTypeAsync(sessionUserId.Value, "video/");
            if (!result.Success) return Json(new { success = false, error = result.Error });

            var videoFiles = result.Files.Select(f => new {
                id = f.Id,
                fileName = f.FileName,
                filePath = f.FilePath,
                contentType = f.ContentType,
                fileSize = f.FileSize,
                uploadedAt = f.UploadedAt
            });
            return Json(new { success = true, videos = videoFiles });
        }

        [HttpGet]
        [Route("Dashboard/GetAudioFiles")]
        public async Task<IActionResult> GetAudioFiles()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });

            try
            {
                // Assuming GetUserFilesByTypeAsync can handle int? or has an overload for it
                // The original code used "audio/", the new snippet used "audio". Sticking to original pattern.
                var result = await _dashboardService.GetUserFilesByTypeAsync(sessionUserId.Value, "audio/");
                if (!result.Success) return Json(new { success = false, error = result.Error });

                var audioFiles = result.Files.Select(f => new {
                    id = f.Id,
                    fileName = f.FileName,
                    filePath = f.FilePath, // Added back based on original structure
                    contentType = f.ContentType, // Added back based on original structure
                    fileSize = f.FileSize, // Added back based on original structure
                    uploadedAt = f.UploadedAt // Added back based on original structure
                });
                return Json(new { success = true, audios = audioFiles }); // Changed 'files' to 'audios' for consistency
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        [Route("Dashboard/GetFileStats")] // Added route for consistency
        public async Task<IActionResult> GetFileStats()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });

            try
            {
                // Assuming GetUserFilesAsync and GetFileGroupsAsync can handle int userId
                var filesResult = await _dashboardService.GetUserFilesAsync(sessionUserId.Value);
                var groupsResult = await _dashboardService.GetFileGroupsAsync(sessionUserId.Value);
                
                if (!filesResult.Success) return Json(new { success = false, error = filesResult.Error });
                if (!groupsResult.Success) return Json(new { success = false, error = groupsResult.Error });

                return Json(new { 
                    success = true, 
                    filesCount = filesResult.Files.Count, 
                    foldersCount = groupsResult.Groups.Count 
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        [Route("Dashboard/GetRecentFiles")] // Added route for consistency
        public async Task<IActionResult> GetRecentFiles()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });

            try
            {
                // Assuming GetUserFilesAsync can handle int userId
                var filesResult = await _dashboardService.GetUserFilesAsync(sessionUserId.Value);
                if (!filesResult.Success) return Json(new { success = false, error = filesResult.Error });

                // Assuming files have UploadedAt property (consistent with other file objects)
                var recent = filesResult.Files.OrderByDescending(f => f.UploadedAt).Take(2)
                    .Select(f => new { f.Id, f.FileName });

                return Json(new { success = true, recentFiles = recent });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        // ===== Group Methods =====

        [HttpGet]
        [Route("Dashboard/GetGroups")]
        [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> GetGroups()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });
            
            var result = await _dashboardService.GetFileGroupsAsync(sessionUserId.Value);
            if (!result.Success) return Json(new { success = false, error = result.Error });
            return Json(new { success = true, groups = result.Groups });
        }

        public class SaveGroupRequest { public string? Name { get; set; } public List<int>? FileIds { get; set; } }

        [HttpPost]
        [Route("Dashboard/SaveGroup")]
        public async Task<IActionResult> SaveGroup([FromBody] SaveGroupRequest req)
        {
             var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });

            if (req == null || string.IsNullOrWhiteSpace(req.Name) || req.FileIds == null)
                return Json(new { success = false, error = "Invalid request" });
                
            var result = await _dashboardService.SaveFileGroupAsync(sessionUserId.Value, req.Name.Trim(), req.FileIds);
            if (result.Success) return Json(new { success = true, name = req.Name, fileIds = req.FileIds });
            return Json(new { success = false, error = result.Error });
        }

        public class DeleteGroupRequest { public string? Name { get; set; } }

        [HttpPost]
        [Route("Dashboard/DeleteGroup")]
        public async Task<IActionResult> DeleteGroup([FromBody] DeleteGroupRequest req)
        {
             var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not logged in" });
            
            if (req == null || string.IsNullOrWhiteSpace(req.Name))
                    return Json(new { success = false, error = "Invalid request" });

            var result = await _dashboardService.DeleteFileGroupAsync(sessionUserId.Value, req.Name.Trim());
            if (result.Success) return Json(new { success = true });
            return Json(new { success = false, error = result.Error });
        }

        // ===== Progress/Focus =====

        [HttpGet]
        [Route("Dashboard/GetProgress")]
        public async Task<IActionResult> GetProgress(int? targetUserId)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Json(new { success = false, error = "Not authenticated" });

            var result = await _dashboardService.GetProgressAsync(sessionUserId.Value, targetUserId);
            if (result.Success) return Json(result.Progress);
            return Json(new { success = false, error = result.Error });
        }

        [HttpPost]
        [Route("Dashboard/RecordFocusSession")]
        public async Task<IActionResult> RecordFocusSession([FromBody] UserActivity request)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return Json(new { success = false, error = "Not authenticated" });

            var result = await _dashboardService.RecordFocusSessionAsync(userId.Value, request.Duration, request.SubjectName);
            if (result.Success) return Json(new { success = true, message = "Focus session recorded" });
            return Json(new { success = false, error = result.Error });
        }

        [HttpPost]
        [Route("Dashboard/MarkNotificationAsRead")]
        public async Task<IActionResult> MarkNotificationAsRead([FromBody] MarkNotificationDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return Json(new { success = false, error = "Not authenticated" });

            var result = await _notificationService.MarkAsReadAsync(dto.NotificationId, userId.Value);
            return Json(new { success = result.Success, error = result.Error });
        }

        [HttpGet]
        [Route("Dashboard/GetNotifications")]
        public async Task<IActionResult> GetNotifications()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return Json(new { success = false, error = "Not authenticated" });

            var result = await _notificationService.GetUserNotificationsAsync(userId.Value);
            if (!result.Success) return Json(new { success = false, error = result.Error });

            return Json(new { success = true, notifications = result.Notifications });
        }

        [HttpGet]
        [Route("Dashboard/Help")]
        public IActionResult Help()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return Json(new { success = false, error = "Not authenticated" });

            var result = await _notificationService.DeleteNotificationAsync(id, userId.Value);
            if (!result.Success) return Json(new { success = false, error = result.Error });

            return Json(new { success = true });
        }

        public class MarkNotificationDto { public int NotificationId { get; set; } }

        [HttpPost]
        [Route("Dashboard/BroadcastNotification")]
        public async Task<IActionResult> BroadcastNotification([FromBody] BroadcastNotificationRequest req)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return Json(new { success = false, error = "Not authenticated" });

            // Only allow admin or specific role to broadcast (optional security check)
            // var userRole = HttpContext.Session.GetString("Role");
            // if (userRole != "Teacher") return Json(new { success = false, error = "Not authorized" });

            if (req == null || string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Message))
                return Json(new { success = false, error = "Title and message are required" });

            var result = await _notificationService.CreateNotificationForAllUsersAsync(
                req.Type ?? "announcement",
                req.Title,
                req.Message,
                req.RelatedId
            );

            if (!result.Success)
                return Json(new { success = false, error = result.Error });

            return Json(new { success = true, count = result.NotificationCount, message = $"Notification sent to {result.NotificationCount} users" });
        }

        public class BroadcastNotificationRequest
        {
            public string? Type { get; set; }
            public string? Title { get; set; }
            public string? Message { get; set; }
            public int? RelatedId { get; set; }
        }
    }
}
