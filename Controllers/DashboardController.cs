using ADHDWebApp.Data;
using ADHDWebApp.Models;
using DocumentFormat.OpenXml.Packaging; 
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using OpenAI;
using OpenAI.Chat;



namespace ADHDWebApp.Controllers
{
    public class DashboardController : Controller
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public DashboardController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
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
                    var diff = now - lastAt;
                    const int CooldownSeconds = 15;
                    if (diff.TotalSeconds < CooldownSeconds)
                    {
                        var remaining = Math.Ceiling(CooldownSeconds - diff.TotalSeconds);
                        Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
                        return Json(new { success = false, error = $"Please wait {remaining} seconds before trying again." });
                    }
                }
                HttpContext.Session.SetString("SummarizeLastAt", now.ToString("o"));

                // Prefer appsettings (OpenAI:ApiKey), fall back to environment variable only if not set.
                var apiKey = _config["OpenAI:ApiKey"]
                             ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY");
                if (string.IsNullOrWhiteSpace(apiKey))
                    return Json(new { success = false, error = "OpenAI API key not configured" });

                var text = req.Text;
                const int MAX_CHARS = 12000; 
                if (text.Length > MAX_CHARS) text = text.Substring(0, MAX_CHARS);

                var http = new HttpClient();
                http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

                var payload = new
                {
                    model = _config["OpenAI:Model"] ?? "gpt-4o-mini",
                    temperature = 0.3,
                    messages = new object[]
                    {
                        new { role = "system", content = "You are a helpful assistant that writes concise, clear summaries." },
                        new { role = "user", content = "Summarize the following text in bullet points and keep it concise:\n\n" + text }
                    }
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                HttpResponseMessage? resp = null;
                string? respBody = null;
                const int maxAttempts = 3;
                for (int attempt = 1; attempt <= maxAttempts; attempt++)
                {
                    resp = await http.PostAsync("https://api.openai.com/v1/chat/completions", content);
                    if (resp.StatusCode == HttpStatusCode.TooManyRequests || resp.StatusCode == HttpStatusCode.ServiceUnavailable)
                    {
                        var retryAfter = resp.Headers.RetryAfter?.Delta ?? TimeSpan.Zero;
                        var delay = retryAfter > TimeSpan.Zero ? retryAfter : TimeSpan.FromMilliseconds(Math.Pow(2, attempt - 1) * 1000);
                        await Task.Delay(delay);
                        content = new StringContent(json, Encoding.UTF8, "application/json");
                        continue;
                    }
                    break;
                }

                respBody = await (resp?.Content.ReadAsStringAsync() ?? Task.FromResult(string.Empty));
                if (resp == null || !resp.IsSuccessStatusCode)
                {
                    var is429 = resp?.StatusCode == HttpStatusCode.TooManyRequests;
                    var msg = is429
                        ? "Rate limit exceeded. Please wait a few seconds and try again."
                        : $"OpenAI error: {(int)(resp?.StatusCode ?? 0)} {resp?.ReasonPhrase}";
                    return Json(new { success = false, error = msg, body = respBody });
                }
                using var doc = JsonDocument.Parse(respBody);
                var root = doc.RootElement;
                string? summary = null;
                try
                {
                    summary = root.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
                }
                catch { summary = null; }
                if (string.IsNullOrWhiteSpace(summary)) summary = "No summary produced.";
                return Json(new { success = true, summary });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> UploadAvatar(IFormFile avatar)
        {
            var userEmail = HttpContext.Session.GetString("UserEmail");
            if (string.IsNullOrEmpty(userEmail))
            {
                TempData["Error"] = "Please log in to update your profile.";
                return RedirectToAction("Login", "Account");
            }

            if (avatar == null || avatar.Length == 0)
            {
                TempData["Error"] = "No image uploaded.";
                return RedirectToAction("Index");
            }

            var ext = Path.GetExtension(avatar.FileName).ToLowerInvariant();
            var allowed = new HashSet<string> { ".png", ".jpg", ".jpeg", ".webp" };
            if (!allowed.Contains(ext))
            {
                TempData["Error"] = "Unsupported image type. Allowed: PNG, JPG, JPEG, WEBP.";
                return RedirectToAction("Index");
            }

            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                if (user == null)
                {
                    TempData["Error"] = "User not found.";
                    return RedirectToAction("Index");
                }

                var avatarsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "avatars");
                if (!Directory.Exists(avatarsFolder)) Directory.CreateDirectory(avatarsFolder);

                foreach (var e in new[] { ".png", ".jpg", ".jpeg", ".webp" })
                {
                    var existing = Path.Combine(avatarsFolder, $"user_{user.Id}{e}");
                    if (System.IO.File.Exists(existing)) System.IO.File.Delete(existing);
                }

                var targetPath = Path.Combine(avatarsFolder, $"user_{user.Id}{ext}");
                using (var fs = new FileStream(targetPath, FileMode.Create))
                {
                    await avatar.CopyToAsync(fs);
                }

                TempData["Success"] = "Profile image updated.";
                return RedirectToAction("Index");
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Error uploading image: {ex.Message}";
                return RedirectToAction("Index");
            }
        }

        public async Task<IActionResult> IndexAsync()
        {
            try
            {
                var userEmail = HttpContext.Session.GetString("UserEmail");
                var fullName = HttpContext.Session.GetString("FullName");

                if (string.IsNullOrEmpty(userEmail) || string.IsNullOrEmpty(fullName))
                {
                    TempData["Error"] = "Please log in to access the dashboard.";
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
                {
                    ViewBag.ShowLeftPanel = TempData["ShowLeftPanel"].ToString() == "true";
                }

                ViewBag.UserEmail = userEmail;
                ViewBag.FullName = fullName;

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                List<UserFile> userFiles = new List<UserFile>();
                
                if (user != null)
                {
                    userFiles = await _context.UserFiles
                        .Where(f => f.UserId == user.Id)
                        .OrderByDescending(f => f.UploadedAt)
                        .ToListAsync();
                }
                
                ViewBag.UserFiles = userFiles;
                ViewBag.UserId = user?.Id ?? 0;
                ViewBag.Role = user?.Role;

                string? avatarUrl = null;
                if (user != null)
                {
                    var avatarsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "avatars");
                    if (!Directory.Exists(avatarsFolder)) Directory.CreateDirectory(avatarsFolder);
                    var candidates = new[] { 
                        Path.Combine(avatarsFolder, $"user_{user.Id}.png"),
                        Path.Combine(avatarsFolder, $"user_{user.Id}.jpg"),
                        Path.Combine(avatarsFolder, $"user_{user.Id}.jpeg"),
                        Path.Combine(avatarsFolder, $"user_{user.Id}.webp")
                    };
                    var found = candidates.FirstOrDefault(System.IO.File.Exists);
                    if (found != null)
                    {
                        avatarUrl = "/avatars/" + Path.GetFileName(found);
                    }
                }
                ViewBag.AvatarUrl = avatarUrl;

                return View();
            }
            catch (Exception)
            {
                TempData["Error"] = "An error occurred while accessing the dashboard. Please try logging in again.";
                return RedirectToAction("Login", "Account");
            }
        }

        [HttpPost]
        [Route("Dashboard/DeleteFiles")]
        public async Task<IActionResult> DeleteFiles([FromBody] List<int> ids)
        {
            try
            {
                var userEmail = HttpContext.Session.GetString("UserEmail");
                if (string.IsNullOrEmpty(userEmail))
                    return Json(new { success = false, error = "Not logged in" });

                if (ids == null || ids.Count == 0)
                    return Json(new { success = false, error = "No files selected" });

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                if (user == null)
                    return Json(new { success = false, error = "User not found" });

                var files = await _context.UserFiles
                    .Where(f => f.UserId == user.Id && ids.Contains(f.Id))
                    .ToListAsync();

                foreach (var file in files)
                {
                    try
                    {
                        var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", file.FilePath.TrimStart('/'));
                        if (System.IO.File.Exists(fullPath))
                        {
                            System.IO.File.Delete(fullPath);
                        }
                        _context.UserFiles.Remove(file);
                    }
                    catch (Exception)
                    {
                    }
                }

                await _context.SaveChangesAsync();
                return Json(new { success = true, deleted = files.Select(f => f.Id).ToList() });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }
      

        [HttpPost]
        public async Task<IActionResult> UploadDocument(IFormFile file)
        {
            var userEmail = HttpContext.Session.GetString("UserEmail");
            if (string.IsNullOrEmpty(userEmail))
            {
                TempData["Error"] = "Please log in to upload documents.";
                return RedirectToAction("Login", "Account");
            }

            if (file == null || file.Length == 0)
            {
                TempData["InlineError"] = "No file uploaded.";
                return RedirectToAction("Index");
            }

            var ext = Path.GetExtension(file.FileName).ToLower();
            var allowed = new HashSet<string> { ".txt", ".docx", ".pdf", ".png", ".jpg", ".jpeg", ".gif" };
            if (!allowed.Contains(ext))
            {
                TempData["InlineError"] = "Unsupported file type. Allowed: PDF, DOCX, TXT, PNG, JPG, JPEG, GIF.";
                return RedirectToAction("Index");
            }

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var filePath = Path.Combine(uploadsFolder, file.FileName);

            try
            {
                // احضار المستخدم من قاعدة البيانات
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                if (user == null)
                {
                    TempData["Error"] = "User not found.";
                    return RedirectToAction("Index");
                }

                // التحقق إذا الملف موجود مسبقًا لنفس المستخدم
                var existingFile = await _context.UserFiles
                    .FirstOrDefaultAsync(f => f.UserId == user.Id && f.FileName == file.FileName);

                if (existingFile != null)
                {
                    return RedirectToAction("ReadandDisplayFile", new { fileId = existingFile.Id });
                }

                // حفظ الملف على السيرفر
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // إنشاء سجل UserFile
                var userFile = new UserFile
                {
                    FileName = file.FileName,
                    FilePath = "/uploads/" + file.FileName,  // رابط للعرض
                    ContentType = file.ContentType,
                    FileSize = file.Length,
                    UploadedAt = DateTime.Now,
                    UserId = user.Id,
                    User = user // <-- Fix: Set the required User property
                };

                _context.UserFiles.Add(userFile);
                await _context.SaveChangesAsync();

                return RedirectToAction("ReadandDisplayFile", new { fileId = userFile.Id });
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Error uploading file: {ex.Message}";
                return RedirectToAction("Index");
            }
        }

        public async Task<IActionResult> ReadandDisplayFile(int fileId)
        {
            // التحقق من تسجيل دخول المستخدم
            var userEmail = HttpContext.Session.GetString("UserEmail");
            if (string.IsNullOrEmpty(userEmail))
                return RedirectToAction("Login", "Account");

            // جلب الملف من قاعدة البيانات وربطه بالمستخدم الحالي
            var file = await _context.UserFiles
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.Id == fileId && f.User.Email == userEmail);

            if (file == null)
                return NotFound();

            // المسار الفعلي للملف
            var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", file.FilePath.TrimStart('/'));
            if (!System.IO.File.Exists(fullPath))
                return NotFound();

            // تحديد نوع العرض
            var extension = Path.GetExtension(file.FileName).ToLower();
            string contentText = null;
            string displayType = "other";

            switch (extension)
            {
                case ".txt":
                    using (var reader = new StreamReader(fullPath))
                        contentText = await reader.ReadToEndAsync();
                    break;

                case ".pdf": 
                    using (var pdfReader = new PdfReader(fullPath))
                    using (var pdfDoc = new PdfDocument(pdfReader))
                    {
                        contentText = "";
                        for (int i = 1; i <= pdfDoc.GetNumberOfPages(); i++)
                            contentText += PdfTextExtractor.GetTextFromPage(pdfDoc.GetPage(i)) + "\n";
                    }
                    displayType = "text";
                    break;

                case ".docx":
                    using (var wordDoc = WordprocessingDocument.Open(fullPath, false))
                        contentText = wordDoc.MainDocumentPart.Document.Body.InnerText;
                    displayType = "text";
                    break;

                case ".jpg":
                case ".jpeg":
                case ".png":
                case ".gif":
                    displayType = "image";
                    break;

                default:
                    displayType = "other";
                    break;
            }

            // Set TempData to show the file in the main dashboard
            TempData["ShowLeftPanel"] = "true";
            TempData["UploadedText"] = contentText;
            TempData["FileName"] = file.FileName;
            TempData["FileId"] = file.Id.ToString();

            // Redirect to the main dashboard with file data
            return RedirectToAction("Index");
        }

        // New method to return file content as JSON for AJAX calls
        [HttpGet]
        [Route("Dashboard/GetFileContent")]
        [Route("Dashboard/GetFileContent/{fileId}")]
        public async Task<IActionResult> GetFileContent(int fileId)
        {
            // التحقق من تسجيل دخول المستخدم
            var userEmail = HttpContext.Session.GetString("UserEmail");
            if (string.IsNullOrEmpty(userEmail))
                return Json(new { success = false, error = "Not logged in" });

            // جلب الملف من قاعدة البيانات وربطه بالمستخدم الحالي
            var file = await _context.UserFiles
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.Id == fileId && f.User.Email == userEmail);

            if (file == null)
                return Json(new { success = false, error = "File not found" });

            // المسار الفعلي للملف
            var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", file.FilePath.TrimStart('/'));
            if (!System.IO.File.Exists(fullPath))
                return Json(new { success = false, error = "File not found on disk" });

            // تحديد نوع العرض
            var extension = Path.GetExtension(file.FileName).ToLower();
            string contentText = null;
            string displayType = "other";
            bool truncated = false;

            try
            {
                switch (extension)
                {
                    case ".txt":
                        using (var reader = new StreamReader(fullPath))
                        {
                            contentText = await reader.ReadToEndAsync();
                            // Truncate very large text for performance (~200KB)
                            const int MAX_CHARS = 200_000;
                            if (contentText?.Length > MAX_CHARS)
                            {
                                contentText = contentText.Substring(0, MAX_CHARS);
                                truncated = true;
                            }
                        }
                        displayType = "text";
                        break;

                    case ".pdf":
                        // Return the URL to allow inline PDF viewing in the browser
                        contentText = Url.Content(file.FilePath);
                        displayType = "pdf";
                        break;

                    case ".docx":
                        using (var wordDoc = WordprocessingDocument.Open(fullPath, false))
                            contentText = wordDoc.MainDocumentPart.Document.Body.InnerText;
                        displayType = "text";
                        break;

                    case ".jpg":
                    case ".jpeg":
                    case ".png":
                    case ".gif":
                        displayType = "image";
                        // Return app-resolved URL so it works under virtual directories
                        contentText = Url.Content(file.FilePath);
                        break;

                    default:
                        displayType = "other";
                        contentText = "File type not supported for preview";
                        break;
                }

                return Json(new { 
                    success = true, 
                    fileName = file.FileName,
                    content = contentText,
                    displayType = displayType,
                    fileSize = file.FileSize,
                    uploadedAt = file.UploadedAt.ToString("MMM dd, yyyy"),
                    truncated = truncated
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = $"Error reading file: {ex.Message}" });
            }
        }

        // Helper method to format file size
        private string FormatFileSize(long bytes)
        {
            string[] sizes = { "B", "KB", "MB", "GB" };
            double len = bytes;
            int order = 0;
            while (len >= 1024 && order < sizes.Length - 1)
            {
                order++;
                len = len / 1024;
            }
            return $"{len:0.##} {sizes[order]}";
        }

        // Save plain text content as a new file for the current user
        [HttpPost]
        [Route("Dashboard/SaveText")]
        public async Task<IActionResult> SaveText([FromBody] SaveTextRequest req)
        {
            try
            {
                var userEmail = HttpContext.Session.GetString("UserEmail");
                if (string.IsNullOrEmpty(userEmail))
                    return Json(new { success = false, error = "Not logged in" });

                if (req == null)
                    return Json(new { success = false, error = "Invalid request" });

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                if (user == null)
                    return Json(new { success = false, error = "User not found" });

                var fileName = string.IsNullOrWhiteSpace(req.FileName) ? "Untitled.txt" : req.FileName.Trim();
                if (!fileName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
                {
                    fileName += ".txt";
                }

                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                // Ensure unique filename for this user folder (global uploads for now)
                string MakeSafeName(string name)
                {
                    foreach (var c in Path.GetInvalidFileNameChars()) name = name.Replace(c, '_');
                    return name;
                }

                fileName = MakeSafeName(fileName);
                var targetPath = Path.Combine(uploadsFolder, fileName);
                if (System.IO.File.Exists(targetPath))
                {
                    var baseName = Path.GetFileNameWithoutExtension(fileName);
                    var ext = Path.GetExtension(fileName);
                    int i = 1;
                    do
                    {
                        fileName = $"{baseName} ({i++}){ext}";
                        targetPath = Path.Combine(uploadsFolder, fileName);
                    } while (System.IO.File.Exists(targetPath));
                }

                // Write text content
                var content = req.Content ?? string.Empty;
                await System.IO.File.WriteAllTextAsync(targetPath, content);

                var userFile = new UserFile
                {
                    FileName = fileName,
                    FilePath = "/uploads/" + fileName,
                    ContentType = "text/plain",
                    FileSize = new FileInfo(targetPath).Length,
                    UploadedAt = DateTime.Now,
                    UserId = user.Id,
                    User = user
                };
                _context.UserFiles.Add(userFile);
                await _context.SaveChangesAsync();

                return Json(new { success = true, fileId = userFile.Id, fileName = userFile.FileName });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        // Save video file for the current user
        [HttpPost]
        [Route("Dashboard/SaveVideo")]
        public async Task<IActionResult> SaveVideo([FromBody] SaveVideoRequest req)
        {
            try
            {
                var userEmail = HttpContext.Session.GetString("UserEmail");
                if (string.IsNullOrEmpty(userEmail))
                    return Json(new { success = false, error = "Not logged in" });

                if (req == null)
                    return Json(new { success = false, error = "Invalid request" });

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                if (user == null)
                    return Json(new { success = false, error = "User not found" });

                var fileName = string.IsNullOrWhiteSpace(req.FileName) ? "video.mp4" : req.FileName.Trim();
                if (!fileName.Contains('.', StringComparison.OrdinalIgnoreCase))
                {
                    fileName += ".mp4";
                }

                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                // Ensure unique filename for this user folder
                string MakeSafeName(string name)
                {
                    foreach (var c in Path.GetInvalidFileNameChars()) name = name.Replace(c, '_');
                    return name;
                }

                fileName = MakeSafeName(fileName);
                var targetPath = Path.Combine(uploadsFolder, fileName);
                if (System.IO.File.Exists(targetPath))
                {
                    var baseName = Path.GetFileNameWithoutExtension(fileName);
                    var ext = Path.GetExtension(fileName);
                    int i = 1;
                    do
                    {
                        fileName = $"{baseName} ({i++}){ext}";
                        targetPath = Path.Combine(uploadsFolder, fileName);
                    } while (System.IO.File.Exists(targetPath));
                }

                // Convert base64 to video file
                if (!string.IsNullOrWhiteSpace(req.VideoData))
                {
                    var videoBytes = Convert.FromBase64String(req.VideoData.Split(',')[1] ?? req.VideoData);
                    await System.IO.File.WriteAllBytesAsync(targetPath, videoBytes);
                }
                else
                {
                    return Json(new { success = false, error = "No video data provided" });
                }

                var userFile = new UserFile
                {
                    FileName = fileName,
                    FilePath = "/uploads/" + fileName,
                    ContentType = req.ContentType ?? "video/mp4",
                    FileSize = new FileInfo(targetPath).Length,
                    UploadedAt = DateTime.Now,
                    UserId = user.Id,
                    User = user
                };
                _context.UserFiles.Add(userFile);
                await _context.SaveChangesAsync();

                return Json(new { success = true, fileId = userFile.Id, fileName = userFile.FileName });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        // Get video files for the current user
        [HttpGet]
        [Route("Dashboard/GetVideoFiles")]
        public async Task<IActionResult> GetVideoFiles()
        {
            try
            {
                var userEmail = HttpContext.Session.GetString("UserEmail");
                if (string.IsNullOrEmpty(userEmail))
                    return Json(new { success = false, error = "Not logged in" });

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                if (user == null)
                    return Json(new { success = false, error = "User not found" });

                var videoFiles = await _context.UserFiles
                    .Where(f => f.UserId == user.Id && f.ContentType.StartsWith("video/"))
                    .OrderByDescending(f => f.UploadedAt)
                    .Select(f => new {
                        id = f.Id,
                        fileName = f.FileName,
                        filePath = f.FilePath,
                        contentType = f.ContentType,
                        fileSize = f.FileSize,
                        uploadedAt = f.UploadedAt
                    })
                    .ToListAsync();

                return Json(new { success = true, videos = videoFiles });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        public class SaveTextRequest
        {
            public string? FileName { get; set; }
            public string? Content { get; set; }
        }

        public class SaveVideoRequest
        {
            public string? FileName { get; set; }
            public string? VideoData { get; set; }
            public string? ContentType { get; set; }
        }

        // ===== File Groups (persisted per user in JSON) =====
        private string GetGroupsFolder()
        {
            var root = Directory.GetCurrentDirectory();
            var folder = Path.Combine(root, "App_Data", "groups");
            if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
            return folder;
        }

        private string GetUserGroupsPath(int userId)
        {
            return Path.Combine(GetGroupsFolder(), $"user_{userId}.json");
        }

        private class GroupsModel
        {
            public Dictionary<string, List<int>> Groups { get; set; } = new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);
        }

        private async Task<GroupsModel> LoadUserGroupsAsync(int userId)
        {
            try
            {
                var path = GetUserGroupsPath(userId);
                if (!System.IO.File.Exists(path)) return new GroupsModel();
                var json = await System.IO.File.ReadAllTextAsync(path);
                var model = JsonSerializer.Deserialize<GroupsModel>(json) ?? new GroupsModel();
                // Normalize nulls
                model.Groups = model.Groups ?? new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);
                return model;
            }
            catch { return new GroupsModel(); }
        }

        private async Task SaveUserGroupsAsync(int userId, GroupsModel model)
        {
            var path = GetUserGroupsPath(userId);
            var json = JsonSerializer.Serialize(model, new JsonSerializerOptions { WriteIndented = true });
            await System.IO.File.WriteAllTextAsync(path, json);
        }

        public class SaveGroupRequest
        {
            public string? Name { get; set; }
            public List<int>? FileIds { get; set; }
        }

        [HttpGet]
        [Route("Dashboard/GetGroups")]
        public async Task<IActionResult> GetGroups()
        {
            var userEmail = HttpContext.Session.GetString("UserEmail");
            if (string.IsNullOrEmpty(userEmail))
                return Json(new { success = false, error = "Not logged in" });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
            if (user == null) return Json(new { success = false, error = "User not found" });

            var model = await LoadUserGroupsAsync(user.Id);
            return Json(new { success = true, groups = model.Groups });
        }

        [HttpPost]
        [Route("Dashboard/SaveGroup")]
        public async Task<IActionResult> SaveGroup([FromBody] SaveGroupRequest req)
        {
            try
            {
                var userEmail = HttpContext.Session.GetString("UserEmail");
                if (string.IsNullOrEmpty(userEmail))
                    return Json(new { success = false, error = "Not logged in" });

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                if (user == null)
                    return Json(new { success = false, error = "User not found" });

                if (req == null || string.IsNullOrWhiteSpace(req.Name) || req.FileIds == null || req.FileIds.Count == 0)
                    return Json(new { success = false, error = "Invalid request" });

                // Ensure files belong to user
                var userFileIds = await _context.UserFiles
                    .Where(f => f.UserId == user.Id && req.FileIds.Contains(f.Id))
                    .Select(f => f.Id)
                    .ToListAsync();

                if (userFileIds.Count == 0)
                    return Json(new { success = false, error = "No valid files" });

                var model = await LoadUserGroupsAsync(user.Id);
                var name = req.Name.Trim();
                if (!model.Groups.ContainsKey(name)) model.Groups[name] = new List<int>();
                // Overwrite group with provided list (distinct)
                model.Groups[name] = userFileIds.Distinct().ToList();

                await SaveUserGroupsAsync(user.Id, model);
                return Json(new { success = true, name = name, fileIds = model.Groups[name] });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        public class DeleteGroupRequest { public string? Name { get; set; } }

        [HttpPost]
        [Route("Dashboard/DeleteGroup")]
        public async Task<IActionResult> DeleteGroup([FromBody] DeleteGroupRequest req)
        {
            try
            {
                var userEmail = HttpContext.Session.GetString("UserEmail");
                if (string.IsNullOrEmpty(userEmail))
                    return Json(new { success = false, error = "Not logged in" });

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                if (user == null) return Json(new { success = false, error = "User not found" });

                if (req == null || string.IsNullOrWhiteSpace(req.Name))
                    return Json(new { success = false, error = "Invalid request" });

                var model = await LoadUserGroupsAsync(user.Id);
                if (model.Groups.Remove(req.Name.Trim()))
                {
                    await SaveUserGroupsAsync(user.Id, model);
                }
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }
    }
}
