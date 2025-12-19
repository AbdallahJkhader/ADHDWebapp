using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ADHDWebApp.Models;
using ADHDWebApp.Services;

namespace ADHDWebApp.Controllers
{
    public class FlashcardsController : Controller
    {
        private readonly IFlashcardService _flashcardService;

        public FlashcardsController(IFlashcardService flashcardService)
        {
            _flashcardService = flashcardService;
        }

        // GET: Flashcards
        public async Task<IActionResult> Index()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
            {
                return RedirectToAction("EnterEmail", "Account");
            }

            var result = await _flashcardService.GetUserFlashcardsAsync(sessionUserId.Value);
            return View(result.Flashcards);
        }

        // GET: Flashcards/Create
        public IActionResult Create()
        {
            return View();
        }

        // POST: Flashcards/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("Question,Answer")] Flashcard flashcard)
        {
            if (ModelState.IsValid)
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                {
                    return RedirectToAction("EnterEmail", "Account");
                }

                var result = await _flashcardService.CreateFlashcardAsync(sessionUserId.Value, flashcard.Question, flashcard.Answer);
                if (result.Success)
                {
                    return RedirectToAction(nameof(Index));
                }
                ModelState.AddModelError("", result.Error);
            }
            return View(flashcard);
        }

        // GET: Flashcards/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null) return NotFound();

            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return RedirectToAction("EnterEmail", "Account");

            var result = await _flashcardService.GetFlashcardAsync(id.Value, sessionUserId.Value);
            
            if (!result.Success || result.Flashcard == null)
            {
                if (result.Error == "Not found") return NotFound();
                if (result.Error == "Unauthorized") return Forbid();
                return NotFound();
            }

            return View(result.Flashcard);
        }

        // POST: Flashcards/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [Bind("Id,Question,Answer")] Flashcard flashcard)
        {
            if (id != flashcard.Id) return NotFound();

            if (ModelState.IsValid)
            {
                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null) return RedirectToAction("EnterEmail", "Account");

                var result = await _flashcardService.UpdateFlashcardAsync(id, sessionUserId.Value, flashcard.Question, flashcard.Answer);
                
                if (result.Success)
                {
                    return RedirectToAction(nameof(Index));
                }

                if (result.Error == "Not found") return NotFound();
                if (result.Error == "Unauthorized") return Forbid();
                ModelState.AddModelError("", result.Error);
            }
            return View(flashcard);
        }

        // POST: Flashcards/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return RedirectToAction("EnterEmail", "Account");

            var result = await _flashcardService.DeleteFlashcardAsync(id, sessionUserId.Value);
            
            if (!result.Success)
            {
                 // Handle error appropriately, potentially redirect with error
            }
            return RedirectToAction(nameof(Index));
        }

        // GET: Flashcards/GetUserFlashcards
        [HttpGet]
        public async Task<IActionResult> GetUserFlashcards()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Unauthorized();

            var result = await _flashcardService.GetUserFlashcardsAsync(sessionUserId.Value);
            
            // Map to anonymous object as before if needed, or return full object
            var mapped = result.Flashcards.Select(f => new { f.Question, f.Answer });
            return Json(mapped);
        }

        public class CreateFlashcardDto
        {
            public string Question { get; set; } = string.Empty;
            public string Answer { get; set; } = string.Empty;
        }

        [HttpPost]
        public async Task<IActionResult> CreateFromDashboard([FromBody] CreateFlashcardDto dto)
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null) return Unauthorized();

            var question = (dto?.Question ?? string.Empty).Trim();
            var answer = (dto?.Answer ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(question) || string.IsNullOrWhiteSpace(answer))
            {
                return BadRequest("Question and Answer are required.");
            }

            var result = await _flashcardService.CreateFlashcardAsync(sessionUserId.Value, question, answer);
            
            if (result.Success && result.Flashcard != null)
            {
                return Json(new { success = true, id = result.Flashcard.Id, question = result.Flashcard.Question, answer = result.Flashcard.Answer });
            }

            return Json(new { success = false, error = result.Error });
        }

        private bool FlashcardExists(int id)
        {
            // Logic moved to service, essentially checked during Update
            return true;
        }
    }
}
