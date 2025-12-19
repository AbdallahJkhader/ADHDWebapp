using System;
using System.ComponentModel.DataAnnotations;

namespace ADHDWebApp.Models
{
    public class Notification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }  // Recipient

        [Required]
        [StringLength(50)]
        public string Type { get; set; }  // "class_invite", "friend_request", "message", etc.

        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        [StringLength(500)]
        public string Message { get; set; }

        public int? RelatedId { get; set; }  // ClassId for invites, MessageId for messages, etc.

        public bool IsRead { get; set; } = false;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual User User { get; set; }
    }
}
