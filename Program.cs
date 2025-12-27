using ADHDWebApp.Data;
using ADHDWebApp.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllersWithViews();


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register Services
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IClassesService, ClassesService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IFlashcardService, FlashcardService>();
builder.Services.AddScoped<IMessageService, MessageService>();
builder.Services.AddScoped<ISharedFileService, SharedFileService>();
builder.Services.AddScoped<IStudyPlannerService, StudyPlannerService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30); 
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = "Cookies";
})
.AddCookie(options =>
{
    options.LoginPath = "/Account/EnterEmail";
    options.LogoutPath = "/Account/Logout";
});
// Note: Google OAuth is configured in code but disabled due to package dependency issue
// The button will show but redirect to GoogleLogin will fail until package is fixed

var app = builder.Build();


if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseSession();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Account}/{action=Enteremail}/{id?}");

app.Run();
