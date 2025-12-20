using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ADHDWebApp.Models
{
    public class Folder
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public required string Name { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign Key to User
        [ForeignKey("User")]
        public int UserId { get; set; }

        public virtual required User User { get; set; }
    }
}
