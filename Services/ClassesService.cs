using ADHDWebApp.Data;
using ADHDWebApp.Models;
using Microsoft.EntityFrameworkCore;

namespace ADHDWebApp.Services
{
    public class ClassesService : IClassesService
    {
        private readonly AppDbContext _context;

        public ClassesService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(bool Success, string Error)> LeaveClassAsync(int userId, int classId)
        {
            try
            {
                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return (false, "Class not found");

                if (cls.OwnerId == userId)
                    return (false, "Owner cannot leave their own class");

                var membership = await _context.ClassMemberships
                    .FirstOrDefaultAsync(m => m.UserId == userId && m.ClassId == classId);
                
                if (membership == null)
                    return (false, "You are not a member of this class");

                _context.ClassMemberships.Remove(membership);
                await _context.SaveChangesAsync();

                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Error)> RemoveMemberAsync(int ownerId, int classId, int targetUserId)
        {
            try
            {
                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return (false, "Class not found");

                if (cls.OwnerId != ownerId)
                    return (false, "Only the class owner can remove members");

                if (targetUserId == cls.OwnerId)
                    return (false, "Cannot remove the class owner");

                var membership = await _context.ClassMemberships
                    .FirstOrDefaultAsync(m => m.UserId == targetUserId && m.ClassId == classId);
                
                if (membership == null)
                    return (false, "User is not a member of this class");

                _context.ClassMemberships.Remove(membership);
                await _context.SaveChangesAsync();

                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Error)> DeleteClassAsync(int userId, int classId)
        {
            try
            {
                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return (false, "Class not found");
                
                if (cls.OwnerId != userId)
                    return (false, "Only the class owner can delete this class");

                var memberships = _context.ClassMemberships.Where(m => m.ClassId == classId);
                _context.ClassMemberships.RemoveRange(memberships);
                _context.Classes.Remove(cls);
                await _context.SaveChangesAsync();

                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Error, object? ClassDetails)> GetClassDetailsAsync(int userId, int classId)
        {
            try
            {
                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return (false, "Class not found", null);

                var owner = await _context.Users.FirstOrDefaultAsync(u => u.Id == cls.OwnerId);
                var memberships = await _context.ClassMemberships
                    .Where(m => m.ClassId == classId)
                    .Include(m => m.User)
                    .ToListAsync();

                var students = memberships
                    .Where(m => m.UserId != cls.OwnerId)
                    .Select(m => new { id = m.UserId, name = m.User!.FullName, email = m.User.Email })
                    .ToList();

                var result = new
                {
                    success = true,
                    Class = new { id = cls.Id, name = cls.Name, code = cls.JoinCode, allowJoin = cls.AllowJoin },
                    Teacher = owner != null ? new { id = owner.Id, name = owner.FullName, email = owner.Email } : null,
                    Students = students
                };

                return (true, string.Empty, result);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error, int? ClassId, string? JoinCode)> CreateClassAsync(int ownerId, string className)
        {
            try
            {
                // Block students from creating classes
                var owner = await _context.Users.FirstOrDefaultAsync(u => u.Id == ownerId);
                if (owner == null)
                    return (false, "User not found", null, null);
                
                if (string.Equals(owner.Role, "Student", StringComparison.OrdinalIgnoreCase))
                    return (false, "Students are not allowed to create classes", null, null);

                if (string.IsNullOrWhiteSpace(className))
                    return (false, "Class name is required", null, null);

                // Generate unique join code
                string joinCode;
                do
                {
                    joinCode = GenerateJoinCode(8);
                } while (await _context.Classes.AnyAsync(c => c.JoinCode == joinCode));

                var cls = new Class
                {
                    Name = className,
                    JoinCode = joinCode,
                    OwnerId = ownerId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Classes.Add(cls);
                await _context.SaveChangesAsync();

                // Auto-join owner
                if (!await _context.ClassMemberships.AnyAsync(m => m.UserId == ownerId && m.ClassId == cls.Id))
                {
                    _context.ClassMemberships.Add(new ClassMembership 
                    { 
                        UserId = ownerId, 
                        ClassId = cls.Id, 
                        JoinedAt = DateTime.UtcNow 
                    });
                    await _context.SaveChangesAsync();
                }

                return (true, string.Empty, cls.Id, cls.JoinCode);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null, null);
            }
        }

        public async Task<(bool Success, string Error, int? ClassId)> JoinClassAsync(int userId, string joinCode)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(joinCode))
                    return (false, "Join code is required", null);

                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.JoinCode == joinCode);
                if (cls == null)
                    return (false, "Invalid join code", null);

                // Check if class allows joining
                if (!cls.AllowJoin)
                    return (false, "This class is not accepting new members", null);

                var exists = await _context.ClassMemberships.AnyAsync(m => m.UserId == userId && m.ClassId == cls.Id);
                if (!exists)
                {
                    _context.ClassMemberships.Add(new ClassMembership 
                    { 
                        UserId = userId, 
                        ClassId = cls.Id, 
                        JoinedAt = DateTime.UtcNow 
                    });
                    await _context.SaveChangesAsync();
                }

                return (true, string.Empty, cls.Id);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error, List<object>? Classes)> GetUserClassesAsync(int userId)
        {
            try
            {
                var memberClasses = await _context.ClassMemberships
                    .Where(m => m.UserId == userId)
                    .Include(m => m.Class)
                    .Select(m => new { id = m.ClassId, name = m.Class!.Name, code = m.Class.JoinCode, ownerId = m.Class.OwnerId })
                    .ToListAsync();

                var ownedClasses = await _context.Classes
                    .Where(c => c.OwnerId == userId)
                    .Select(c => new { id = c.Id, name = c.Name, code = c.JoinCode, ownerId = c.OwnerId })
                    .ToListAsync();

                var combined = memberClasses
                    .Concat(ownedClasses)
                    .GroupBy(x => x.id)
                    .Select(g => g.First())
                    .Cast<object>()
                    .ToList();

                return (true, string.Empty, combined);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error, List<object>? Files)> GetClassFilesAsync(int userId, int classId)
        {
            try
            {
                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return (false, "Class not found", null);

                var files = await _context.ClassFiles
                    .Where(f => f.ClassId == classId)
                    .Include(f => f.Uploader)
                    .OrderByDescending(f => f.UploadedAt)
                    .Select(f => new
                    {
                        id = f.Id,
                        fileName = f.FileName,
                        filePath = f.FilePath,
                        fileSize = f.FileSize,
                        contentType = f.ContentType,
                        uploadedAt = f.UploadedAt,
                        uploaderId = f.UploaderId,
                        uploaderName = f.Uploader.FullName
                    })
                    .Cast<object>()
                    .ToListAsync();

                return (true, string.Empty, files);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error, int? FileId)> UploadClassFileAsync(int userId, int classId, string fileName, string filePath, string contentType, long fileSize)
        {
            try
            {
                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return (false, "Class not found", null);
                
                if (cls.OwnerId != userId)
                    return (false, "Only the class owner can upload files", null);

                var entity = new ClassFile
                {
                    ClassId = classId,
                    UploaderId = userId,
                    FileName = fileName,
                    FilePath = filePath,
                    ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
                    FileSize = fileSize,
                    UploadedAt = DateTime.UtcNow
                };

                _context.ClassFiles.Add(entity);
                await _context.SaveChangesAsync();

                return (true, string.Empty, entity.Id);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error, List<object>? Messages)> GetClassChatAsync(int userId, int classId, int? afterId)
        {
            try
            {
                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return (false, "Class not found", null);

                // Check membership or ownership
                var isMember = await _context.ClassMemberships.AnyAsync(m => m.UserId == userId && m.ClassId == classId) 
                             || cls.OwnerId == userId;
                if (!isMember)
                    return (false, "You are not a member of this class", null);

                var query = _context.ClassChatMessages
                    .Where(m => m.ClassId == classId)
                    .Include(m => m.Sender)
                    .OrderBy(m => m.Id)
                    .AsQueryable();

                if (afterId.HasValue && afterId.Value > 0)
                {
                    query = query.Where(m => m.Id > afterId.Value);
                }

                var msgs = await query
                    .Take(200)
                    .Select(m => new {
                        id = m.Id,
                        senderId = m.SenderId,
                        senderName = m.Sender.FullName,
                        content = m.Content,
                        sentAt = m.SentAt
                    })
                    .Cast<object>()
                    .ToListAsync();

                return (true, string.Empty, msgs);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error, int? MessageId)> SendClassChatAsync(int userId, int classId, string content)
        {
            try
            {
                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return (false, "Class not found", null);

                // Check membership or ownership
                var isMember = await _context.ClassMemberships.AnyAsync(m => m.UserId == userId && m.ClassId == classId) 
                             || cls.OwnerId == userId;
                if (!isMember)
                    return (false, "You are not a member of this class", null);

                if (string.IsNullOrWhiteSpace(content))
                    return (false, "Message cannot be empty", null);

                var msg = new ClassChatMessage
                {
                    ClassId = classId,
                    SenderId = userId,
                    Content = content,
                    SentAt = DateTime.UtcNow
                };

                _context.ClassChatMessages.Add(msg);
                await _context.SaveChangesAsync();

                return (true, string.Empty, msg.Id);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error)> UpdateClassPrivacyAsync(int userId, int classId, bool allowJoin)
        {
            try
            {
                var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                if (cls == null)
                    return (false, "Class not found");

                if (cls.OwnerId != userId)
                    return (false, "Only the class owner can update privacy settings");

                cls.AllowJoin = allowJoin;
                await _context.SaveChangesAsync();

                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        private static string GenerateJoinCode(int length)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var rng = new Random();
            return new string(Enumerable.Repeat(chars, length).Select(s => s[rng.Next(s.Length)]).ToArray());
        }
    }
}
