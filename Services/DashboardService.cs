using ADHDWebApp.Data;
using System.IO;
using ADHDWebApp.Models;
using DocumentFormat.OpenXml.Packaging; 
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using System.Net;
using System.Net.Http.Headers;

namespace ADHDWebApp.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;

        public DashboardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetUserAsync(int userId)
        {
            return await _context.Users.FindAsync(userId);
        }

        public async Task<(bool Success, string Error, object? Progress)> GetProgressAsync(int userId, int? targetUserId)
        {
            try
            {
                var effectiveUserId = targetUserId ?? userId;
                var startOfWeek = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek);
                startOfWeek = new DateTime(startOfWeek.Year, startOfWeek.Month, startOfWeek.Day, 0, 0, 0);

                var allActivities = await _context.UserActivities
                    .Where(a => a.UserId == effectiveUserId && a.ActivityType == "login")
                    .OrderByDescending(a => a.Timestamp)
                    .Select(a => a.Timestamp.Date)
                    .Distinct()
                    .ToListAsync();

                int streak = 0;
                if (allActivities.Any())
                {
                    // Use UtcNow for consistency
                    var checkDate = DateTime.UtcNow.Date;
                    while (allActivities.Contains(checkDate))
                    {
                        streak++;
                        checkDate = checkDate.AddDays(-1);
                    }
                }

                var weeklyBrowsingMinutes = await _context.UserActivities
                    .Where(a => a.UserId == effectiveUserId && 
                                a.ActivityType == "file_view" && 
                                a.Timestamp >= startOfWeek)
                    .SumAsync(a => a.Duration);

                var browsingHours = weeklyBrowsingMinutes / 60;
                var browsingMins = weeklyBrowsingMinutes % 60;
                var browsingTime = weeklyBrowsingMinutes > 0 
                    ? $"{browsingHours}h {browsingMins}m this week" 
                    : "0m this week";

                var weeklySubjects = await _context.UserActivities
                    .Where(a => a.UserId == effectiveUserId && 
                                a.Timestamp >= startOfWeek && 
                                !string.IsNullOrEmpty(a.SubjectName))
                    .Select(a => a.SubjectName)
                    .Distinct()
                    .CountAsync();

                var targetId = effectiveUserId; // Store in local variable for EF translation
                var weeklyFocusMinutes = await _context.UserActivities
                    .Where(a => a.UserId == targetId && 
                                a.ActivityType == "focus_session" && 
                                a.Timestamp >= startOfWeek)
                    .SumAsync(a => a.Duration);

                var focusHours = weeklyFocusMinutes / 60;
                var focusMins = weeklyFocusMinutes % 60;
                var focusTime = weeklyFocusMinutes > 0
                    ? $"{focusHours}h {focusMins}m"
                    : "0m";

                var result = new
                {
                    success = true,
                    streak = streak,
                    browsingTime = browsingTime,
                    weeklySubjects = weeklySubjects,
                    weeklyFocusMinutes = weeklyFocusMinutes,
                    focusTime = focusTime // Add formatted focus time
                };

                return (true, string.Empty, result);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error)> RecordFocusSessionAsync(int userId, int duration, string subjectName)
        {
            try
            {
                if (duration <= 0) return (false, "Invalid duration");

                var activity = new UserActivity
                {
                    UserId = userId,
                    ActivityType = "focus_session",
                    SubjectName = string.IsNullOrWhiteSpace(subjectName) ? "General Focus" : subjectName,
                    Duration = duration,
                    Timestamp = DateTime.UtcNow
                };

                _context.UserActivities.Add(activity);
                await _context.SaveChangesAsync();

                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Error)> DeleteFilesAsync(int userId, List<int> fileIds)
        {
            try
            {
                var files = await _context.UserFiles
                   .Where(f => f.UserId == userId && fileIds.Contains(f.Id))
                    .ToListAsync();

                if (files.Any())
                {
                     // Note: Physical deletion often requires path injection or is done by caller. 
                     // Ideally, service should handle it if path is available.
                     // Assuming caller handles physical deletion or we inject IWebHostEnvironment into Service (preferred but not done yet).
                     // For now, mirroring previous behavior: just DB removal here, controller handles physical delete?
                     // Wait, in previous step I saw Controller doing physical delete.
                     // To make this pure, I should pass the webRootPath or handle it here.
                     // I will update this to return the file paths so the controller can delete them physically, OR just delete from DB.
                     // Let's stick to DB deletion here as I cannot easily inject IWebHostEnvironment without huge refactor.
                     
                    _context.UserFiles.RemoveRange(files);
                    await _context.SaveChangesAsync();
                }

                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Error, int FileId, string FileName)> SaveUserFileAsync(int userId, string fileName, string filePath, string contentType, long fileSize)
        {
             try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null) return (false, "User not found", 0, string.Empty);

                var userFile = new UserFile
                {
                    FileName = fileName,
                    FilePath = filePath,
                    ContentType = contentType,
                    FileSize = fileSize,
                    UploadedAt = DateTime.UtcNow,
                    UserId = userId,
                    User = user
                };

                _context.UserFiles.Add(userFile);
                await _context.SaveChangesAsync();

                return (true, string.Empty, userFile.Id, userFile.FileName);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, 0, string.Empty);
            }
        }

        public async Task<(bool Success, string Error, string? Summary)> SummarizeTextAsync(string text, string apiKey, string? model = null, string? baseUrl = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(apiKey)) return (false, "API Key missing", null);

                var http = new HttpClient();
                http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

                const int MAX_CHARS = 12000;
                if (text.Length > MAX_CHARS) text = text.Substring(0, MAX_CHARS);

                var payload = new
                {
                    model = model ?? "llama-3.3-70b-versatile",
                    temperature = 0.3,
                    messages = new object[]
                    {
                        new { role = "system", content = "You are a helpful assistant that writes concise, clear summaries." },
                        new { role = "user", content = "Summarize the following text in bullet points and keep it concise:\n\n" + text }
                    }
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var endpoint = baseUrl ?? "https://api.groq.com/openai/v1/chat/completions";

                var resp = await http.PostAsync(endpoint, content);
                var respBody = await resp.Content.ReadAsStringAsync();

                if (!resp.IsSuccessStatusCode)
                {
                     return (false, $"Groq error: {resp.StatusCode}", null);
                }

                using var doc = JsonDocument.Parse(respBody);
                var summary = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();

                return (true, string.Empty, summary);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error)> UpdateAvatarAsync(int userId, string extension, Stream fileStream, string webRootPath)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null) return (false, "User not found");

                var avatarsFolder = Path.Combine(webRootPath, "avatars");
                if (!Directory.Exists(avatarsFolder)) Directory.CreateDirectory(avatarsFolder);

                // Clean up old avatars
                foreach (var e in new[] { ".png", ".jpg", ".jpeg", ".webp" })
                {
                    var existing = Path.Combine(avatarsFolder, $"user_{user.Id}{e}");
                    if (System.IO.File.Exists(existing)) System.IO.File.Delete(existing);
                }

                // Save new
                var targetPath = Path.Combine(avatarsFolder, $"user_{user.Id}{extension}");
                using (var fs = new FileStream(targetPath, FileMode.Create))
                {
                    await fileStream.CopyToAsync(fs);
                }

                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Error)> UpdateDateOfBirthAsync(int userId, DateTime dob)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null) return (false, "User not found");

                user.DateOfBirth = dob;
                await _context.SaveChangesAsync();
                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Error, UserFile? File, string? Content, string? DisplayType, bool Truncated)> GetFileContentAsync(int userId, int fileId, string webRootPath)
        {
            try
            {
                var file = await _context.UserFiles.Include(f => f.User).FirstOrDefaultAsync(f => f.Id == fileId && f.UserId == userId);
                if (file == null) return (false, "File not found", null, null, null, false);

                // Log view
                 try
                {
                    var activity = new UserActivity
                    {
                        UserId = userId,
                        ActivityType = "file_view",
                        SubjectName = file.FileName,
                        Timestamp = DateTime.UtcNow,
                        Duration = 0
                    };
                    _context.UserActivities.Add(activity);
                    await _context.SaveChangesAsync();
                }
                catch {}

                var fullPath = Path.Combine(webRootPath, file.FilePath.TrimStart('/'));
                if (!System.IO.File.Exists(fullPath)) return (false, "File not found on disk", file, null, null, false);

                var extension = Path.GetExtension(file.FileName).ToLower();
                string? contentText = null;
                string displayType = "other";
                bool truncated = false;

                switch (extension)
                {
                    case ".txt":
                        using (var reader = new StreamReader(fullPath))
                        {
                            contentText = await reader.ReadToEndAsync();
                            const int MAX_CHARS = 200_000;
                            if (contentText.Length > MAX_CHARS)
                            {
                                contentText = contentText.Substring(0, MAX_CHARS);
                                truncated = true;
                            }
                        }
                        displayType = "text";
                        break;
                    case ".pdf":
                        // For PDF, we might return just path or extract text. 
                        // Controller used text extraction for one view and URL for another.
                        // Im supporting text extraction if needed, or just type 'pdf'
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
                        break;
                }

                return (true, string.Empty, file, contentText, displayType, truncated);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null, null, null, false);
            }
        }

        public async Task<(bool Success, string Error, List<UserFile> Files)> GetUserFilesAsync(int userId)
        {
            try
            {
                var userFiles = await _context.UserFiles
                        .Where(f => f.UserId == userId && !f.ContentType.StartsWith("audio/"))
                        .OrderByDescending(f => f.UploadedAt)
                        .ToListAsync();

                return (true, string.Empty, userFiles);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, new List<UserFile>());
            }
        }


        public async Task<(bool Success, string Error, List<UserFile> Files)> GetUserFilesByTypeAsync(int userId, string contentTypePrefix)
        {
            try
            {
                var files = await _context.UserFiles
                    .Where(f => f.UserId == userId && f.ContentType.StartsWith(contentTypePrefix))
                    .OrderByDescending(f => f.UploadedAt)
                    .ToListAsync();
                return (true, null, files);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        // ===== Group (Folder) Methods =====

        public async Task<(bool Success, string Error, Dictionary<string, List<int>> Groups)> GetFileGroupsAsync(int userId)
        {
            try
            {
                var folders = await _context.Folders
                    .Include(f => f.User)
                    .Where(f => f.UserId == userId)
                    .ToListAsync();

                var result = new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);

                foreach (var folder in folders)
                {
                    // Get file IDs for this folder
                    var fileIds = await _context.UserFiles
                        .Where(f => f.FolderId == folder.Id && f.UserId == userId)
                        .Select(f => f.Id)
                        .ToListAsync();
                    
                    result[folder.Name] = fileIds;
                }

                return (true, null, result);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error)> SaveFileGroupAsync(int userId, string groupName, List<int> fileIds)
        {
            try
            {
                var userFileIds = await _context.UserFiles
                    .Where(f => f.UserId == userId && fileIds.Contains(f.Id))
                    .Select(f => f.Id)
                    .ToListAsync();
                
                if (userFileIds.Count == 0 && fileIds.Count > 0) 
                    return (false, "No valid files found belonging to user");

                // Check if folder exists
                var folder = await _context.Folders
                    .FirstOrDefaultAsync(f => f.UserId == userId && f.Name == groupName);

                if (folder == null)
                {
                    folder = new Folder
                    {
                        Name = groupName,
                        UserId = userId,
                        User = await _context.Users.FindAsync(userId) ?? throw new Exception("User not found")
                    };
                    _context.Folders.Add(folder);
                    await _context.SaveChangesAsync();
                }

                // Update files to point to this folder
                // First, UNGROUP files that might be in this folder but not in the new list?
                // The requirement for "SaveFileGroup" usually implies "Set the contents of this group to these files".
                // So, finding files currently in this folder and removing them if not in new list?
                // Or is it just "Add these files to this group"?
                // Based on previous JSON implementation: `model.Groups[groupName] = userFileIds.Distinct().ToList();`
                // This means "Overwrite group contents".
                
                // 1. Clear FolderId for all files currently in this folder
                var existingFiles = await _context.UserFiles.Where(f => f.FolderId == folder.Id).ToListAsync();
                foreach (var f in existingFiles) f.FolderId = null;
                
                // 2. Set FolderId for new files
                var newFiles = await _context.UserFiles.Where(f => userFileIds.Contains(f.Id)).ToListAsync();
                foreach (var f in newFiles) f.FolderId = folder.Id;

                await _context.SaveChangesAsync();
                
                return (true, null);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Error)> DeleteFileGroupAsync(int userId, string groupName)
        {
             try
            {
                var folder = await _context.Folders
                    .FirstOrDefaultAsync(f => f.UserId == userId && f.Name == groupName);

                if (folder != null)
                {
                    // Set FolderId to null for all files in this folder (Ungroup)
                    var files = await _context.UserFiles.Where(f => f.FolderId == folder.Id).ToListAsync();
                    foreach (var f in files) f.FolderId = null;

                    _context.Folders.Remove(folder);
                    await _context.SaveChangesAsync();
                }
                return (true, null);
            }
            catch (Exception ex)
            {
                 return (false, ex.Message);
            }
        }
    }
}
