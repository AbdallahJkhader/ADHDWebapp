using ADHDWebApp.Models;

namespace ADHDWebApp.Services
{
    public interface IAccountService
    {
        Task<(bool Success, string Error, User? User)> ValidateEmailAsync(string email);
        Task<(bool Success, string Error, User? User)> ValidatePasswordAsync(string email, string password);
        Task<(bool Success, string Error, User? User)> CreateUserAsync(string email, string password, string fullName, string role, DateTime dateOfBirth, bool? hasADHD, string? gender);
        Task<(bool Success, string Error)> DeleteUserAccountAsync(int userId);
    }
}
