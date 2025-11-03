using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ADHDWebApp.Models
{
    public class ClassChatMessage
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey("Class")] 
        public int ClassId { get; set; }
        public Class Class { get; set; }

        [ForeignKey("User")] 
        public int SenderId { get; set; }
        public User Sender { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }
}
