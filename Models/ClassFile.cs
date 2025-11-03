using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ADHDWebApp.Models
{
    public class ClassFile
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey("Class")] 
        public int ClassId { get; set; }
        public Class Class { get; set; }

        [ForeignKey("User")] 
        public int UploaderId { get; set; }
        public User Uploader { get; set; }

        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty; // original name

        [Required]
        public string FilePath { get; set; } = string.Empty; // relative path in wwwroot

        [Required]
        [MaxLength(100)]
        public string ContentType { get; set; } = "application/octet-stream";

        public long? FileSize { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
