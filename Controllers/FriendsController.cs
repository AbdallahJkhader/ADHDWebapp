using Microsoft.AspNetCore.Mvc;

namespace ADHDWebApp.Controllers
{
    [Route("[controller]/[action]")]
    public class FriendsController : Controller
    {
        // Friends feature has been removed. All endpoints return 404.

        [HttpPost]
        public IActionResult Send() => NotFound();

        [HttpGet]
        public IActionResult Pending() => NotFound();

        [HttpPost]
        public IActionResult Accept() => NotFound();

        [HttpPost]
        public IActionResult Reject() => NotFound();

        [HttpPost]
        public IActionResult Cancel() => NotFound();

        [HttpGet]
        public IActionResult Friends() => NotFound();

        [HttpPost]
        public IActionResult Remove() => NotFound();

        [HttpGet]
        public IActionResult SearchUsers() => NotFound();
    }
}