using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ADHDWebApp.Data;
using ADHDWebApp.Models;

namespace ADHDWebApp.Controllers
{
    public class FlashcardsController : Controller
    {
        private readonly AppDbContext _context;

        public FlashcardsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: Flashcards
        public async Task<IActionResult> Index()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
            {
                return RedirectToAction("EnterEmail", "Account");
            }

            var userId = sessionUserId.Value;

            var flashcards = await _context.Flashcards
                .Where(f => f.UserId == userId)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();

            return View(flashcards);
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

                flashcard.UserId = sessionUserId.Value;
                flashcard.CreatedAt = DateTime.UtcNow;

                _context.Add(flashcard);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            return View(flashcard);
        }

        // GET: Flashcards/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var flashcard = await _context.Flashcards.FindAsync(id);
            if (flashcard == null)
            {
                return NotFound();
            }

            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
            {
                return RedirectToAction("EnterEmail", "Account");
            }

            if (flashcard.UserId != sessionUserId.Value)
            {
                return Forbid();
            }

            return View(flashcard);
        }

        // POST: Flashcards/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [Bind("Id,Question,Answer")] Flashcard flashcard)
        {
            if (id != flashcard.Id)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                var existingFlashcard = await _context.Flashcards.FindAsync(id);
                if (existingFlashcard == null)
                {
                    return NotFound();
                }

                var sessionUserId = HttpContext.Session.GetInt32("UserId");
                if (sessionUserId == null)
                {
                    return RedirectToAction("EnterEmail", "Account");
                }

                if (existingFlashcard.UserId != sessionUserId.Value)
                {
                    return Forbid();
                }

                existingFlashcard.Question = flashcard.Question;
                existingFlashcard.Answer = flashcard.Answer;

                try
                {
                    _context.Update(existingFlashcard);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!FlashcardExists(flashcard.Id))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                return RedirectToAction(nameof(Index));
            }
            return View(flashcard);
        }

        // POST: Flashcards/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var flashcard = await _context.Flashcards.FindAsync(id);
            if (flashcard == null)
            {
                return NotFound();
            }

            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
            {
                return RedirectToAction("EnterEmail", "Account");
            }

            if (flashcard.UserId != sessionUserId.Value)
            {
                return Forbid();
            }

            _context.Flashcards.Remove(flashcard);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        // GET: Flashcards/GetUserFlashcards
        [HttpGet]
        public async Task<IActionResult> GetUserFlashcards()
        {
            var sessionUserId = HttpContext.Session.GetInt32("UserId");
            if (sessionUserId == null)
            {
                return Unauthorized();
            }

            var userId = sessionUserId.Value;

            var flashcards = await _context.Flashcards
                .Where(f => f.UserId == userId)
                .OrderBy(f => f.Id)
                .Select(f => new { f.Question, f.Answer })
                .ToListAsync();

            return Json(flashcards);
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
            if (sessionUserId == null)
            {
                return Unauthorized();
            }

            var userId = sessionUserId.Value;
            var question = (dto?.Question ?? string.Empty).Trim();
            var answer = (dto?.Answer ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(question) || string.IsNullOrWhiteSpace(answer))
            {
                return BadRequest("Question and Answer are required.");
            }

            var flashcard = new Flashcard
            {
                UserId = userId,
                Question = question,
                Answer = answer,
                CreatedAt = DateTime.UtcNow
            };

            _context.Flashcards.Add(flashcard);
            await _context.SaveChangesAsync();

            return Json(new { success = true, id = flashcard.Id, question = flashcard.Question, answer = flashcard.Answer });
        }

        private bool FlashcardExists(int id)
        {
            return _context.Flashcards.Any(e => e.Id == id);
        }
    }
}
