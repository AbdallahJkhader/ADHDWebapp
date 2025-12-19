using ADHDWebApp.Models;
using ADHDWebApp.Data;
using ADHDWebApp.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Linq;

namespace ADHDWebApp.Controllers
{
    public class AccountController : Controller
    {
        private readonly AppDbContext _context;
        private readonly IAccountService _accountService;

        public AccountController(AppDbContext context, IAccountService accountService)
        {
            _context = context;
            _accountService = accountService;
        }


        public IActionResult EnterEmail()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> EnterEmail(string email)
        {
            var result = await _accountService.ValidateEmailAsync(email);

            if (result.Success)
            {
                TempData["UserEmail"] = email;
                return RedirectToAction("EnterPassword");
            }
            else
            {
                TempData["OpenSignup"] = "true";
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
        public async Task<IActionResult> EnterPassword(string password)
        {
            string? email = TempData["UserEmail"] as string;

            if (string.IsNullOrEmpty(email))
                return RedirectToAction("EnterEmail");

            var result = await _accountService.ValidatePasswordAsync(email, password);

            if (result.Success && result.User != null)
            {
                HttpContext.Session.SetInt32("UserId", result.User.Id);
                HttpContext.Session.SetString("FullName", result.User.FullName);
                HttpContext.Session.SetString("UserEmail", result.User.Email);
                HttpContext.Session.SetString("Role", result.User.Role ?? "");
           
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
        public async Task<IActionResult> Register(string email, string password, string confirmPassword, string fullName, DateTime dateOfBirth, string role, bool? hasADHD, string? gender)
        {
            if (password != confirmPassword)
            {
                TempData["OpenSignup"] = "true";
                TempData["InlineSignupError"] = "Passwords do not match.";
                return RedirectToAction("EnterEmail");
            }

            var result = await _accountService.CreateUserAsync(email, password, fullName, role, dateOfBirth, hasADHD, gender);

            if (!result.Success)
            {
                TempData["OpenSignup"] = "true";
                TempData["InlineSignupError"] = result.Error;
                return RedirectToAction("EnterEmail");
            }

            var newUser = result.User;
            if (newUser != null)
            {
                // Log the user in by setting session, then go directly to Dashboard
                HttpContext.Session.SetInt32("UserId", newUser.Id);
                HttpContext.Session.SetString("FullName", newUser.FullName);
                HttpContext.Session.SetString("UserEmail", newUser.Email);
                HttpContext.Session.SetString("Role", newUser.Role ?? "");
                return RedirectToAction("Index", "Dashboard");
            }

            return RedirectToAction("EnterEmail");
        }

        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("EnterEmail", "Account");
        }

        [HttpPost]
        public async Task<IActionResult> DeleteAccount()
        {
            try
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                    return Json(new { success = false, error = "Not logged in" });
                
                var result = await _accountService.DeleteUserAccountAsync(sessionUserId.Value);
                
                if (result.Success)
                {
                    HttpContext.Session.Clear();
                    return Json(new { success = true });
                }
                
                return Json(new { success = false, error = result.Error });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

    }
}