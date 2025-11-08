using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;
namespace ADHDWebApp.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        
        [EmailAddress]
        public required string Email { get; set; }
        
        public required string Password { get; set; }
        
        public required string FullName { get; set; }

        [DataType(DataType.Date)]
        public DateTime DateOfBirth { get; set; }
        
        public required string Role { get; set; }

        public bool? HasADHD { get; set; }

        public string? Gender { get; set; }

        
        public virtual ICollection<UserFile> Files { get; set; } = new List<UserFile>();
    }
}