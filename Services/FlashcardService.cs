using ADHDWebApp.Data;
using ADHDWebApp.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ADHDWebApp.Services
{
    public class FlashcardService : IFlashcardService
    {
        private readonly AppDbContext _context;

        public FlashcardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(bool Success, string Error, List<Flashcard> Flashcards)> GetUserFlashcardsAsync(int userId)
        {
            try
            {
                var flashcards = await _context.Flashcards
                    .Where(f => f.UserId == userId)
                    .OrderByDescending(f => f.CreatedAt)
                    .ToListAsync();
                return (true, string.Empty, flashcards);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, new List<Flashcard>());
            }
        }

        public async Task<(bool Success, string Error, Flashcard? Flashcard)> GetFlashcardAsync(int id, int userId)
        {
            try
            {
                var flashcard = await _context.Flashcards
                    .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
                
                if (flashcard == null) return (false, "Not found", null);

                return (true, string.Empty, flashcard);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error, Flashcard? Flashcard)> CreateFlashcardAsync(int userId, string question, string answer)
        {
            try
            {
                var flashcard = new Flashcard
                {
                    UserId = userId,
                    Question = question,
                    Answer = answer,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Flashcards.Add(flashcard);
                await _context.SaveChangesAsync();

                return (true, string.Empty, flashcard);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error)> UpdateFlashcardAsync(int id, int userId, string question, string answer)
        {
            try
            {
                var flashcard = await _context.Flashcards.FindAsync(id);
                if (flashcard == null) return (false, "Not found");
                if (flashcard.UserId != userId) return (false, "Unauthorized");

                flashcard.Question = question;
                flashcard.Answer = answer;

                _context.Flashcards.Update(flashcard);
                await _context.SaveChangesAsync();
                
                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Error)> DeleteFlashcardAsync(int id, int userId)
        {
            try
            {
                var flashcard = await _context.Flashcards.FindAsync(id);
                if (flashcard == null) return (false, "Not found");
                if (flashcard.UserId != userId) return (false, "Unauthorized");

                _context.Flashcards.Remove(flashcard);
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
