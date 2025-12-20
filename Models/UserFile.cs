
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ADHDWebApp.Models
{
    public class UserFile
    {
        [Key]
        public int Id { get; set; }

        
        [MaxLength(255)]
        public required string FileName { get; set; }   // اسم الملف الأصلي

        
        public required string FilePath { get; set; }   // مسار أو اسم الملف المخزن

        [MaxLength(100)]
        public required string ContentType { get; set; }  // نوع الملف (PDF, Word, ...)

        public long? FileSize { get; set; }     // 🔑 حجم الملف بالبايت

        public DateTime UploadedAt { get; set; } = DateTime.Now;

        // 🔑 المفتاح الخارجي لربط الملف بالمستخدم
        [ForeignKey("User")]
        public int UserId { get; set; }

        public virtual required User User { get; set; }

        // 🔑 المفتاح الخارجي للمجلد (اختياري)
        [ForeignKey("Folder")]
        public int? FolderId { get; set; }

        public virtual Folder? Folder { get; set; }
    }
}
