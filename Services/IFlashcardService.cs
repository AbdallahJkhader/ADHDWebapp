using ADHDWebApp.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ADHDWebApp.Services
{
    public interface IFlashcardService
    {
        Task<(bool Success, string Error, List<Flashcard> Flashcards)> GetUserFlashcardsAsync(int userId);
        Task<(bool Success, string Error, Flashcard? Flashcard)> GetFlashcardAsync(int id, int userId);
        Task<(bool Success, string Error, Flashcard? Flashcard)> CreateFlashcardAsync(int userId, string question, string answer);
        Task<(bool Success, string Error)> UpdateFlashcardAsync(int id, int userId, string question, string answer);
        Task<(bool Success, string Error)> DeleteFlashcardAsync(int id, int userId);
    }
}
