using ADHDWebApp.Models;
using ADHDWebApp.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Linq;

namespace ADHDWebApp.Controllers
{
    public class AccountController : Controller
    {
        private readonly AppDbContext _context;

        public AccountController(AppDbContext context)
        {
            _context = context;
        }


        public IActionResult EnterEmail()
        {
            return View();
        }

        [HttpPost]
        public IActionResult EnterEmail(string email)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == email);

            if (user != null)
            {
                TempData["UserEmail"] = email;
                return RedirectToAction("EnterPassword");
            }
            else
            {
                TempData["OpenSignup"] = "true";
                // Optionally carry email if needed later
                TempData["UserEmail"] = email;
                return RedirectToAction("EnterEmail");
            }
        }


        public IActionResult EnterPassword()
        {
            if (TempData["UserEmail"] == null)
                return RedirectToAction("EnterEmail");

            TempData.Keep("UserEmail");
            return View();
        }

        [HttpPost]
        public IActionResult EnterPassword(string password)
        {
            string? email = TempData["UserEmail"] as string;


            if (string.IsNullOrEmpty(email))
                return RedirectToAction("EnterEmail");

            var user = _context.Users.FirstOrDefault(u => u.Email == email && u.Password == password);

            if (user != null)
            {
                HttpContext.Session.SetInt32("UserId", user.Id);
                HttpContext.Session.SetString("FullName", user.FullName);
                HttpContext.Session.SetString("UserEmail", user.Email);
               
                // Track Login Activity
                try
                {
                    var today = DateTime.UtcNow.Date;
                    // Check if already logged in today to avoid duplicate daily streak entries if that's desired, 
                    // or just log every login. Let's log every login but streak calculation handles unique days.
                    var activity = new UserActivity
                    {
                        UserId = user.Id,
                        ActivityType = "login",
                        SubjectName = "System",
                        Timestamp = DateTime.UtcNow,
                        Duration = 0
                    };
                    _context.UserActivities.Add(activity);
                    _context.SaveChanges();
                }
                catch (Exception ex)
                {
                    // meaningful error logging in production
                    Console.WriteLine("Error logging activity: " + ex.Message);
                }
           
                return RedirectToAction("Index", "Dashboard");
            }
            else
            {
                ViewBag.Error = "Incorrect Password";
                TempData["UserEmail"] = email;
                return View();

            }
                
        }

        public IActionResult Register()
        {
            // No separate Register page; redirect to EnterEmail with Sign Up tab open
            if (TempData["OpenSignup"] == null)
                TempData["OpenSignup"] = "true";
            return RedirectToAction("EnterEmail");
        }

        [HttpPost]
        public IActionResult Register(string email, string password, string confirmPassword, string fullName, DateTime dateOfBirth, string role, bool? hasADHD, string? gender)
        {
            var existingUser = _context.Users.FirstOrDefault(u => u.Email == email);

            if (existingUser != null)
            {
                TempData["OpenSignup"] = "true";
                TempData["InlineSignupError"] = "This email is exist please try another one.";
                return RedirectToAction("EnterEmail");
            }

            if (password != confirmPassword)
            {
                TempData["OpenSignup"] = "true";
                TempData["InlineSignupError"] = "Passwords do not match.";
                return RedirectToAction("EnterEmail");
            }

            var newUser = new User
            {
                Email = email,
                Password = password,
                FullName = fullName,
                DateOfBirth = dateOfBirth,
                Role = role,
                HasADHD = role == "Student" ? hasADHD : null,
                Gender = gender
            };

            _context.Users.Add(newUser);
            _context.SaveChanges();

            // Log the user in by setting session, then go directly to Dashboard
            HttpContext.Session.SetInt32("UserId", newUser.Id);
            HttpContext.Session.SetString("FullName", newUser.FullName);
            HttpContext.Session.SetString("UserEmail", newUser.Email);
            return RedirectToAction("Index", "Dashboard");
        }

        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("EnterEmail", "Account");
        }

        [HttpPost]
        public IActionResult DeleteAccount()
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                var userId = sessionUserId.Value;

                var user = _context.Users.FirstOrDefault(u => u.Id == userId);
                if (user == null)
                    return Json(new { success = false, error = "User not found" });

                // Remove memberships where user is a member
                var memberships = _context.ClassMemberships.Where(cm => cm.UserId == userId).ToList();
                if (memberships.Count > 0) _context.ClassMemberships.RemoveRange(memberships);

                // Remove classes owned by user (and their memberships)
                var ownedClasses = _context.Classes.Where(c => c.OwnerId == userId).ToList();
                if (ownedClasses.Count > 0)
                {
                    var ownedIds = ownedClasses.Select(c => c.Id).ToList();
                    var ownedMemberships = _context.ClassMemberships.Where(cm => ownedIds.Contains(cm.ClassId)).ToList();
                    if (ownedMemberships.Count > 0) _context.ClassMemberships.RemoveRange(ownedMemberships);
                    _context.Classes.RemoveRange(ownedClasses);
                }

                // Remove shared files relations where user is sender or recipient
                var shared = _context.SharedFiles.Where(sf => sf.SenderId == userId || sf.RecipientId == userId).ToList();
                if (shared.Count > 0) _context.SharedFiles.RemoveRange(shared);

                // Remove messages where user is sender or recipient
                var messages = _context.Messages.Where(m => m.SenderId == userId || m.RecipientId == userId).ToList();
                if (messages.Count > 0) _context.Messages.RemoveRange(messages);

                // Remove user files
                var files = _context.UserFiles.Where(f => f.UserId == userId).ToList();
                if (files.Count > 0) _context.UserFiles.RemoveRange(files);

                // Finally remove the user
                _context.Users.Remove(user);
                _context.SaveChanges();

                HttpContext.Session.Clear();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

    }
}