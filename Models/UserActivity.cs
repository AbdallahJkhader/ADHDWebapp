using System;
using System.ComponentModel.DataAnnotations;

namespace ADHDWebApp.Models
{
    public class UserActivity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [StringLength(50)]
        public string ActivityType { get; set; } // "login", "file_view", "focus_session", etc.

        public int Duration { get; set; } // Duration in minutes for time-based activities

        [StringLength(100)]
        public string SubjectName { get; set; } // Optional subject/topic name

        [Required]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual User User { get; set; }
    }
}
