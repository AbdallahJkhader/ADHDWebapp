using ADHDWebApp.Models;
using ADHDWebApp.Data;
using ADHDWebApp.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Linq;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;

namespace ADHDWebApp.Controllers
{
    public class AccountController : Controller
    {
        private readonly AppDbContext _context;
        private readonly IAccountService _accountService;
        private readonly IConfiguration _configuration;

        public AccountController(AppDbContext context, IAccountService accountService, IConfiguration configuration)
        {
            _context = context;
            _accountService = accountService;
            _configuration = configuration;
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

        // Google OAuth Login (Manual Flow)
        [HttpGet]
        public IActionResult GoogleLogin()
        {
            var clientId = _configuration["Authentication:Google:ClientId"];
            var redirectUrl = Url.Action("GoogleResponse", "Account", null, Request.Scheme);
            var scope = "email profile";
            
            var googleUrl = $"https://accounts.google.com/o/oauth2/v2/auth?client_id={clientId}&redirect_uri={redirectUrl}&response_type=code&scope={scope}";
            
            return Redirect(googleUrl);
        }

        [HttpGet]
        public async Task<IActionResult> GoogleResponse(string code)
        {
            if (string.IsNullOrEmpty(code))
            {
                 TempData["Error"] = "Google login failed (no code received)";
                 return RedirectToAction("EnterEmail");
            }

            try 
            {
                // 1. Exchange Code for Access Token
                var clientId = _configuration["Authentication:Google:ClientId"];
                var clientSecret = _configuration["Authentication:Google:ClientSecret"];
                var redirectUrl = Url.Action("GoogleResponse", "Account", null, Request.Scheme);

                using var client = new HttpClient();
                var tokenResponse = await client.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    {"code", code},
                    {"client_id", clientId ?? ""},
                    {"client_secret", clientSecret ?? ""},
                    {"redirect_uri", redirectUrl ?? ""},
                    {"grant_type", "authorization_code"}
                }));

                if (!tokenResponse.IsSuccessStatusCode)
                {
                     TempData["Error"] = "Failed to get token from Google";
                     return RedirectToAction("EnterEmail");
                }

                var tokenContent = await tokenResponse.Content.ReadFromJsonAsync<JsonElement>();
                var accessToken = tokenContent.GetProperty("access_token").GetString();

                // 2. Get User Info
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                var userResponse = await client.GetAsync("https://www.googleapis.com/oauth2/v2/userinfo");

                if (!userResponse.IsSuccessStatusCode)
                {
                     TempData["Error"] = "Failed to get user info from Google";
                     return RedirectToAction("EnterEmail");
                }

                var userContent = await userResponse.Content.ReadFromJsonAsync<JsonElement>();
                var email = userContent.GetProperty("email").GetString();
                var name = userContent.GetProperty("name").GetString();
                
                if (string.IsNullOrEmpty(email))
                {
                    TempData["Error"] = "Could not retrieve email from Google";
                    return RedirectToAction("EnterEmail");
                }

                // 3. Login or Register User
                // Check if user exists
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                
                if (user == null)
                {
                    // Create new user
                    user = new User
                    {
                        Email = email,
                        FullName = name ?? email.Split('@')[0],
                        Password = "", // No password for Google users
                        Role = "Student", // Default role
                        DateOfBirth = DateTime.UtcNow.AddYears(-18),
                        HasADHD = false,
                        Gender = "Not Specified"
                    };
                    
                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                }

                // Set session
                HttpContext.Session.SetInt32("UserId", user.Id);
                HttpContext.Session.SetString("FullName", user.FullName);
                HttpContext.Session.SetString("UserEmail", user.Email);
                HttpContext.Session.SetString("Role", user.Role ?? "");

                return RedirectToAction("Index", "Dashboard");
            }
            catch (Exception ex)
            {
                TempData["Error"] = "Google login error: " + ex.Message;
                return RedirectToAction("EnterEmail");
            }
        }

    }
}