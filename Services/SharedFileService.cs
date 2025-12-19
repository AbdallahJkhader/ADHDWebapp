using ADHDWebApp.Data;
using ADHDWebApp.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ADHDWebApp.Services
{
    public class SharedFileService : ISharedFileService
    {
        private readonly AppDbContext _context;

        public SharedFileService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(bool Success, string Error, int SharedFileId)> ShareFileAsync(int senderId, int recipientId, int fileId, string? description)
        {
            try
            {
                if (recipientId <= 0 || fileId <= 0) return (false, "Invalid recipient or file ID", 0);
                if (senderId == recipientId) return (false, "You cannot share files with yourself", 0);

                var file = await _context.UserFiles.FirstOrDefaultAsync(f => f.Id == fileId && f.UserId == senderId);
                if (file == null) return (false, "File not found or not accessible", 0);

                var recipient = await _context.Users.FirstOrDefaultAsync(u => u.Id == recipientId);
                if (recipient == null) return (false, "Recipient not found", 0);

                var sharedFile = new SharedFile
                {
                    SenderId = senderId,
                    RecipientId = recipientId,
                    OriginalFileId = fileId,
                    SharedFileName = file.FileName,
                    Description = description,
                    SharedAt = DateTime.UtcNow,
                    IsRead = false
                };

                _context.SharedFiles.Add(sharedFile);
                await _context.SaveChangesAsync();

                return (true, string.Empty, sharedFile.Id);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, 0);
            }
        }

        public async Task<(bool Success, string Error, IEnumerable<object> SharedFiles)> GetSharedWithMeAsync(int userId)
        {
            try
            {
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

                return (true, string.Empty, sharedFiles);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error, IEnumerable<object> SharedFiles)> GetSharedByMeAsync(int userId)
        {
             try
            {
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

                return (true, string.Empty, sharedFiles);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error)> MarkAsReadAsync(int userId, int sharedFileId)
        {
            try
            {
                var sharedFile = await _context.SharedFiles.FirstOrDefaultAsync(sf =>
                    sf.Id == sharedFileId && sf.RecipientId == userId);

                if (sharedFile == null) return (false, "Shared file not found");

                sharedFile.IsRead = true;
                sharedFile.ReadAt = DateTime.UtcNow;
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
