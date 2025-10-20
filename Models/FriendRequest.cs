using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ADHDWebApp.Models
{
    public enum FriendRequestStatus
    {
        Pending = 0,
        Accepted = 1,
        Rejected = 2,
        Canceled = 3
    }

    public class FriendRequest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [ForeignKey(nameof(Requester))]
        public int RequesterId { get; set; }
        public User? Requester { get; set; }

        [Required]
        [ForeignKey(nameof(Addressee))]
        public int AddresseeId { get; set; }
        public User? Addressee { get; set; }

        [Required]
        public FriendRequestStatus Status { get; set; } = FriendRequestStatus.Pending;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
