using System;
using System.Linq;
using System.Threading.Tasks;
using ADHDWebApp.Data;
using ADHDWebApp.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ADHDWebApp.Controllers
{
    [Route("[controller]/[action]")]
    public class FriendsController : Controller
    {
        private readonly AppDbContext _context;
        public FriendsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> Send([FromBody] SendFriendRequestDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var requesterId = sessionUserId.Value;
                var addresseeId = dto.AddresseeId;

                if (addresseeId <= 0)
                    return Json(new { success = false, error = "Invalid addressee id" });

                if (requesterId == addresseeId)
                    return Json(new { success = false, error = "You cannot send a request to yourself" });

                // Ensure both users exist
                var exists = await _context.Users.AnyAsync(u => u.Id == addresseeId);
                if (!exists)
                    return Json(new { success = false, error = "User not found" });

                // Check if there's already an accepted friendship in either direction
                var existingAccepted = await _context.FriendRequests.FirstOrDefaultAsync(fr =>
                    ((fr.RequesterId == requesterId && fr.AddresseeId == addresseeId) ||
                     (fr.RequesterId == addresseeId && fr.AddresseeId == requesterId)) &&
                    fr.Status == FriendRequestStatus.Accepted
                );
                if (existingAccepted != null)
                    return Json(new { success = false, error = "You are already friends" });

                // Check if there's already a pending request in the same direction
                var existingPendingSameDirection = await _context.FriendRequests.FirstOrDefaultAsync(fr =>
                    fr.RequesterId == requesterId && fr.AddresseeId == addresseeId &&
                    fr.Status == FriendRequestStatus.Pending
                );
                if (existingPendingSameDirection != null)
                    return Json(new { success = false, error = "A pending request already exists" });

                // Check if there's a pending request in the opposite direction
                var existingPendingOppositeDirection = await _context.FriendRequests.FirstOrDefaultAsync(fr =>
                    fr.RequesterId == addresseeId && fr.AddresseeId == requesterId &&
                    fr.Status == FriendRequestStatus.Pending
                );

                if (existingPendingOppositeDirection != null)
                {
                    // Accept the existing request instead of creating a new one
                    existingPendingOppositeDirection.Status = FriendRequestStatus.Accepted;
                    existingPendingOppositeDirection.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return Json(new { success = true, requestId = existingPendingOppositeDirection.Id, message = "Friend request accepted" });
                }

                // Check if there's a previously rejected/canceled request that we can reuse
                var existingOldRequest = await _context.FriendRequests.FirstOrDefaultAsync(fr =>
                    (fr.RequesterId == requesterId && fr.AddresseeId == addresseeId) ||
                    (fr.RequesterId == addresseeId && fr.AddresseeId == requesterId)
                );

                if (existingOldRequest != null)
                {
                    // Reuse the existing request
                    existingOldRequest.RequesterId = requesterId;
                    existingOldRequest.AddresseeId = addresseeId;
                    existingOldRequest.Status = FriendRequestStatus.Pending;
                    existingOldRequest.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return Json(new { success = true, requestId = existingOldRequest.Id });
                }

                // Create a new friend request
                var fr = new FriendRequest
                {
                    RequesterId = requesterId,
                    AddresseeId = addresseeId,
                    Status = FriendRequestStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };
                _context.FriendRequests.Add(fr);
                await _context.SaveChangesAsync();

                return Json(new { success = true, requestId = fr.Id });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        public class SendFriendRequestDto
        {
            public int AddresseeId { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> Pending()
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;

                var incoming = await _context.FriendRequests
                    .Where(fr => fr.AddresseeId == userId && fr.Status == FriendRequestStatus.Pending)
                    .Select(fr => new { id = fr.Id, userId = fr.Requester.Id, fullName = fr.Requester.FullName, role = fr.Requester.Role })
                    .ToListAsync();

                var outgoing = await _context.FriendRequests
                    .Where(fr => fr.RequesterId == userId && fr.Status == FriendRequestStatus.Pending)
                    .Select(fr => new { id = fr.Id, userId = fr.Addressee.Id, fullName = fr.Addressee.FullName, role = fr.Addressee.Role })
                    .ToListAsync();

                return Json(new { success = true, incoming, outgoing });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Accept([FromBody] IdDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;
                var fr = await _context.FriendRequests.FirstOrDefaultAsync(x => x.Id == dto.Id);
                if (fr == null)
                    return Json(new { success = false, error = "Request not found" });
                if (fr.AddresseeId != userId)
                    return Json(new { success = false, error = "Not authorized" });
                if (fr.Status != FriendRequestStatus.Pending)
                    return Json(new { success = false, error = "Request is not pending" });

                fr.Status = FriendRequestStatus.Accepted;
                fr.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Reject([FromBody] IdDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;
                var fr = await _context.FriendRequests.FirstOrDefaultAsync(x => x.Id == dto.Id);
                if (fr == null)
                    return Json(new { success = false, error = "Request not found" });
                if (fr.AddresseeId != userId)
                    return Json(new { success = false, error = "Not authorized" });
                if (fr.Status != FriendRequestStatus.Pending)
                    return Json(new { success = false, error = "Request is not pending" });

                fr.Status = FriendRequestStatus.Rejected;
                fr.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Cancel([FromBody] IdDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;
                var fr = await _context.FriendRequests.FirstOrDefaultAsync(x => x.Id == dto.Id);
                if (fr == null)
                    return Json(new { success = false, error = "Request not found" });
                if (fr.RequesterId != userId)
                    return Json(new { success = false, error = "Not authorized" });
                if (fr.Status != FriendRequestStatus.Pending)
                    return Json(new { success = false, error = "Request is not pending" });

                fr.Status = FriendRequestStatus.Canceled;
                fr.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> Friends()
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;

                var friends = await _context.FriendRequests
                    .Where(fr => fr.Status == FriendRequestStatus.Accepted && (fr.RequesterId == userId || fr.AddresseeId == userId))
                    .Select(fr => fr.RequesterId == userId
                        ? new { userId = fr.Addressee!.Id, fullName = fr.Addressee.FullName, role = fr.Addressee.Role }
                        : new { userId = fr.Requester!.Id, fullName = fr.Requester.FullName, role = fr.Requester.Role })
                    .Distinct()
                    .ToListAsync();

                return Json(new { success = true, friends });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Remove([FromBody] RemoveFriendDto dto)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;
                var withUserId = dto.UserId;

                var fr = await _context.FriendRequests.FirstOrDefaultAsync(fr =>
                    fr.Status == FriendRequestStatus.Accepted &&
                    ((fr.RequesterId == userId && fr.AddresseeId == withUserId) ||
                     (fr.RequesterId == withUserId && fr.AddresseeId == userId))
                );

                if (fr == null)
                    return Json(new { success = false, error = "Friendship not found" });

                // Mark as canceled to keep history
                fr.Status = FriendRequestStatus.Canceled;
                fr.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> SearchUsers(string query)
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });

                var userId = sessionUserId.Value;

                if (string.IsNullOrWhiteSpace(query))
                    return Json(new { success = true, users = new List<object>() });

                // Parse as ID first
                if (int.TryParse(query, out int searchId) && searchId > 0)
                {
                    var user = await _context.Users
                        .Where(u => u.Id == searchId && u.Id != userId)
                        .Select(u => new { u.Id, u.FullName, u.Email })
                        .FirstOrDefaultAsync();

                    if (user != null)
                        return Json(new { success = true, users = new[] { user } });
                }

                // Search by name (case-insensitive partial match)
                var users = await _context.Users
                    .Where(u => u.Id != userId &&
                               (u.FullName.Contains(query) || u.Email.Contains(query)))
                    .Select(u => new { u.Id, u.FullName, u.Email })
                    .Take(10) // Limit results
                    .ToListAsync();

                return Json(new { success = true, users });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }
        
        public class IdDto { public int Id { get; set; } }
        public class RemoveFriendDto { public int UserId { get; set; } }
    }
}