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
                TempData["UserEmail"] = email;
                return RedirectToAction("Register");
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
            string? email = TempData["UserEmail"] as string;
            ViewBag.Email = email;
            return View();
        }

        [HttpPost]
        public IActionResult Register(string email, string password, string fullName, DateTime dateOfBirth, string role, bool? hasADHD)
        {
            var existingUser = _context.Users.FirstOrDefault(u => u.Email == email);

            if (existingUser != null)
            {
                ViewBag.Error = "This email is exist please try another one.";
                ViewBag.Email = email;
                return View();
            }

            var newUser = new User
            {
                Email = email,
                Password = password,
                FullName = fullName,
                DateOfBirth = dateOfBirth,
                Role = role,
                HasADHD = role == "Student" ? hasADHD : null
            };

            _context.Users.Add(newUser);
            _context.SaveChanges();

            TempData["UserEmail"] = email;
            return RedirectToAction("EnterPassword");
        }

        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("EnterEmail", "Account");
        }

    }
}