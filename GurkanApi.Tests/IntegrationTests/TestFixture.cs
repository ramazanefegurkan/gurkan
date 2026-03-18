using GurkanApi.Data;
using GurkanApi.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace GurkanApi.Tests.IntegrationTests;

/// <summary>
/// WebApplicationFactory that points to a separate "gurkan_test" PostgreSQL database.
/// On first boot: drops and recreates the test DB, then lets Program.cs MigrateAsync run.
/// Between test classes: TRUNCATE + re-seed.
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private const string TestDbName = "gurkan_test";
    private const string TestConnectionString =
        $"Host=localhost;Port=5434;Database={TestDbName};Username=postgres;Password=postgres";
    private const string AdminConnectionString =
        "Host=localhost;Port=5434;Database=postgres;Username=postgres;Password=postgres";

    private static bool _dbInitialized;
    private static readonly object _lock = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Drop and recreate the test DB before the host boots (once per test run)
        EnsureCleanTestDatabase();

        builder.UseEnvironment("Testing");

        builder.UseSetting("FileStorage:BasePath", Path.Combine(Path.GetTempPath(), "gurkan-test-uploads"));

        builder.ConfigureServices(services =>
        {
            // Remove existing DbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (descriptor is not null)
                services.Remove(descriptor);

            // Register with test connection string
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(TestConnectionString));
        });
    }

    /// <summary>
    /// Drops and recreates the test database so MigrateAsync gets a clean slate.
    /// Thread-safe, runs only once per test process.
    /// </summary>
    private static void EnsureCleanTestDatabase()
    {
        lock (_lock)
        {
            if (_dbInitialized) return;

            using var conn = new NpgsqlConnection(AdminConnectionString);
            conn.Open();

            // Force-drop existing test DB
            using (var dropCmd = conn.CreateCommand())
            {
                dropCmd.CommandText = $"""
                    SELECT pg_terminate_backend(pid) FROM pg_stat_activity
                    WHERE datname = '{TestDbName}' AND pid <> pg_backend_pid();
                """;
                dropCmd.ExecuteNonQuery();
            }

            using (var dropCmd = conn.CreateCommand())
            {
                dropCmd.CommandText = $"DROP DATABASE IF EXISTS {TestDbName}";
                dropCmd.ExecuteNonQuery();
            }

            using (var createCmd = conn.CreateCommand())
            {
                createCmd.CommandText = $"CREATE DATABASE {TestDbName}";
                createCmd.ExecuteNonQuery();
            }

            _dbInitialized = true;
        }
    }

    /// <summary>
    /// Truncates all tables and re-seeds the superadmin user.
    /// Call this in IAsyncLifetime.InitializeAsync before each test class.
    /// </summary>
    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // Truncate all tables (the seed from Program.cs boot may have already inserted admin)
        await db.Database.ExecuteSqlRawAsync("""
            TRUNCATE TABLE "RentIncreases", "RentPayments", "ShortTermRentals", "Expenses", "Bills", "Documents", "Tenants", "PropertyNotes", "RefreshTokens", "GroupMembers", "Properties", "Groups", "Users" CASCADE;
        """);

        // Clean up test upload directory
        var testUploadPath = Path.Combine(Path.GetTempPath(), "gurkan-test-uploads");
        if (Directory.Exists(testUploadPath))
        {
            Directory.Delete(testUploadPath, recursive: true);
        }

        // Seed superadmin
        var hasher = new PasswordHasher<User>();
        var admin = new User
        {
            Id = Guid.NewGuid(),
            Email = "admin@gurkan.com",
            FullName = "System Admin",
            Role = UserRole.SuperAdmin,
            CreatedAt = DateTime.UtcNow,
        };
        admin.PasswordHash = hasher.HashPassword(admin, "Admin123!");

        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }
}
