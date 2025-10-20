using ADHDWebApp.Data;
using ADHDWebApp.Models;
using DocumentFormat.OpenXml.Packaging; 
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;



namespace ADHDWebApp.Controllers
{
    public class DashboardController : Controller
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> IndexAsync()
        {
            try
            {
                var userEmail = HttpContext.Session.GetString("UserEmail");
                var fullName = HttpContext.Session.GetString("FullName");

                // تحقق من تسجيل الدخول
                if (string.IsNullOrEmpty(userEmail) || string.IsNullOrEmpty(fullName))
                {
                    TempData["Error"] = "Please log in to access the dashboard.";
                    return RedirectToAction("Login", "Account");
                }

                // نقل بيانات TempData للـ ViewBag إذا موجودة
                if (TempData["UploadedText"] != null)
                {
                    ViewBag.ShowLeftPanel = true;
                    ViewBag.UploadedText = TempData["UploadedText"];
                    ViewBag.FileName = TempData["FileName"];
                    ViewBag.FileId = TempData["FileId"];
                }
                
                // Check if we should show left panel from file selection
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
                
                ViewBag.UserFiles = userFiles; // Always set this
                ViewBag.UserId = user?.Id ?? 0; // For debugging

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

                // Fetch files that belong to this user and are in the selected IDs
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
                        // continue with others; we can report partial failures if needed
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
                TempData["Error"] = "No file uploaded.";
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
                    TempData["Error"] = "File already exists.";
                    return RedirectToAction("Index");
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

                TempData["Success"] = "File uploaded successfully.";
                return RedirectToAction("Index");
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
                    displayType = "text";
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
    }
}
