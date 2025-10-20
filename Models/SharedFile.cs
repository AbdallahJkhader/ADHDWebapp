using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ADHDWebApp.Models
{
    public class SharedFile
    {
        [Key]
        public int Id { get; set; }

        public int SenderId { get; set; }
        public User Sender { get; set; }

        public int RecipientId { get; set; }
        public User Recipient { get; set; }

        public int OriginalFileId { get; set; }
        public UserFile OriginalFile { get; set; }

        [Required]
        public string SharedFileName { get; set; }

        public string? Description { get; set; }

        [Required]
        public DateTime SharedAt { get; set; } = DateTime.UtcNow;

        public bool IsRead { get; set; } = false;

        public DateTime? ReadAt { get; set; }
    }
}
