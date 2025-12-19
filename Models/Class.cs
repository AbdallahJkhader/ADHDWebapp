using System;
using System.Collections.Generic;

namespace ADHDWebApp.Models
{
    public class Class
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string JoinCode { get; set; } = string.Empty;
        public int OwnerId { get; set; }
        public User? Owner { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool AllowJoin { get; set; } = true;

        public List<ClassMembership> Members { get; set; } = new List<ClassMembership>();
    }
}
