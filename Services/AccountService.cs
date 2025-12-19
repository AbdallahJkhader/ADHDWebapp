using ADHDWebApp.Data;
using ADHDWebApp.Models;
using Microsoft.EntityFrameworkCore;

namespace ADHDWebApp.Services
{
    public class AccountService : IAccountService
    {
        private readonly AppDbContext _context;

        public AccountService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(bool Success, string Error, User? User)> ValidateEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return (false, "Email is required", null);

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            
            if (user == null)
                return (false, "User not found", null);

            return (true, string.Empty, user);
        }

        public async Task<(bool Success, string Error, User? User)> ValidatePasswordAsync(string email, string password)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
                return (false, "Email and password are required", null);

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email && u.Password == password);
            
            if (user == null)
                return (false, "Invalid credentials", null);

            // Track login activity
            try
            {
                var activity = new UserActivity
                {
                    UserId = user.Id,
                    ActivityType = "login",
                    SubjectName = "System",
                    Timestamp = DateTime.UtcNow,
                    Duration = 0
                };
                _context.UserActivities.Add(activity);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error logging activity: " + ex.Message);
            }

            return (true, string.Empty, user);
        }

        public async Task<(bool Success, string Error, User? User)> CreateUserAsync(string email, string password, string fullName, string role, DateTime dateOfBirth, bool? hasADHD, string? gender)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
                return (false, "Email and password are required", null);

            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (existingUser != null)
                return (false, "This email is already registered", null);

            var newUser = new User
            {
                Email = email,
                Password = password,
                FullName = fullName,
                Role = role,
                DateOfBirth = dateOfBirth,
                HasADHD = role == "Student" ? hasADHD : null,
                Gender = gender
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return (true, string.Empty, newUser);
        }

        public async Task<(bool Success, string Error)> DeleteUserAccountAsync(int userId)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user == null)
                    return (false, "User not found");

                // Remove memberships where user is a member
                var memberships = _context.ClassMemberships.Where(cm => cm.UserId == userId);
                _context.ClassMemberships.RemoveRange(memberships);

                // Remove classes owned by user (and their memberships)
                var ownedClasses = _context.Classes.Where(c => c.OwnerId == userId).ToList();
                if (ownedClasses.Any())
                {
                    var ownedIds = ownedClasses.Select(c => c.Id).ToList();
                    var ownedMemberships = _context.ClassMemberships.Where(cm => ownedIds.Contains(cm.ClassId));
                    _context.ClassMemberships.RemoveRange(ownedMemberships);
                    _context.Classes.RemoveRange(ownedClasses);
                }

                // Remove shared files relations
                var shared = _context.SharedFiles.Where(sf => sf.SenderId == userId || sf.RecipientId == userId);
                _context.SharedFiles.RemoveRange(shared);

                // Remove messages
                var messages = _context.Messages.Where(m => m.SenderId == userId || m.RecipientId == userId);
                _context.Messages.RemoveRange(messages);

                // Remove user files
                var files = _context.UserFiles.Where(f => f.UserId == userId);
                _context.UserFiles.RemoveRange(files);

                // Remove user activities
                var activities = _context.UserActivities.Where(a => a.UserId == userId);
                _context.UserActivities.RemoveRange(activities);

                // Finally remove the user
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }
    }
}
