using System.Text;
using System.Text.Json.Serialization;
using GurkanApi.Data;
using GurkanApi.Entities;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// QuestPDF Community license — required before any QuestPDF usage.
// Wrapped in try-catch: native Skia dependency may fail to load in certain hosts (e.g. AnyCPU test runner).
try
{
    QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
}
catch (Exception ex) when (ex is TypeInitializationException or DllNotFoundException)
{
    // QuestPDF native library not available — PDF export will fail gracefully at runtime.
    // This happens in test hosts or environments without the native Skia binary.
    Console.WriteLine($"QuestPDF native library unavailable: {ex.GetBaseException().Message}");
}

var builder = WebApplication.CreateBuilder(args);

// ---------- Database ----------
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ---------- Controllers + JSON ----------
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// ---------- Swagger / OpenAPI ----------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ---------- CORS ----------
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ---------- PasswordHasher ----------
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

// ---------- Auth services ----------
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// ---------- Group access service ----------
builder.Services.AddScoped<IGroupAccessService, GroupAccessService>();

// ---------- JWT Authentication ----------
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero,
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// ---------- Seed superadmin ----------
await SeedAdminAsync(app);

// ---------- Pipeline ----------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// ---------- Seed helper ----------
static async Task SeedAdminAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<ApplicationDbContext>>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    await db.Database.MigrateAsync();

    var seedEmail = config["SeedAdmin:Email"]!;
    var seedPassword = config["SeedAdmin:Password"]!;
    var seedFullName = config["SeedAdmin:FullName"]!;

    var exists = await db.Users.AnyAsync(u => u.Email == seedEmail);
    if (!exists)
    {
        var hasher = new PasswordHasher<User>();
        var admin = new User
        {
            Id = Guid.NewGuid(),
            Email = seedEmail,
            FullName = seedFullName,
            Role = UserRole.SuperAdmin,
            CreatedAt = DateTime.UtcNow,
        };
        admin.PasswordHash = hasher.HashPassword(admin, seedPassword);

        db.Users.Add(admin);
        await db.SaveChangesAsync();
        logger.LogInformation("Seed admin created: {Email}", seedEmail);
    }
    else
    {
        logger.LogInformation("Seed admin already exists: {Email}", seedEmail);
    }
}

// Make Program class accessible for integration tests (WebApplicationFactory)
public partial class Program { }
