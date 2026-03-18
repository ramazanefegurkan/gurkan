using GurkanApi.Entities;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<PropertyNote> PropertyNotes => Set<PropertyNote>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<RentPayment> RentPayments => Set<RentPayment>();
    public DbSet<ShortTermRental> ShortTermRentals => Set<ShortTermRental>();
    public DbSet<RentIncrease> RentIncreases => Set<RentIncrease>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Bill> Bills => Set<Bill>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DeviceToken> DeviceTokens => Set<DeviceToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ---------- User ----------
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.FullName).IsRequired().HasMaxLength(200);
            entity.Property(u => u.Role)
                  .HasConversion<string>()
                  .HasMaxLength(50);
            entity.Property(u => u.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");
        });

        // ---------- Group ----------
        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasKey(g => g.Id);
            entity.Property(g => g.Name).IsRequired().HasMaxLength(200);
            entity.Property(g => g.Description).HasMaxLength(1000);
            entity.Property(g => g.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");
        });

        // ---------- GroupMember (composite PK) ----------
        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.HasKey(gm => new { gm.UserId, gm.GroupId });

            entity.Property(gm => gm.Role)
                  .HasConversion<string>()
                  .HasMaxLength(50);
            entity.Property(gm => gm.JoinedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(gm => gm.User)
                  .WithMany(u => u.Groups)
                  .HasForeignKey(gm => gm.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(gm => gm.Group)
                  .WithMany(g => g.Members)
                  .HasForeignKey(gm => gm.GroupId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------- Property ----------
        modelBuilder.Entity<Property>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(300);
            entity.Property(p => p.Type)
                  .HasConversion<string>()
                  .HasMaxLength(50);
            entity.Property(p => p.Address).IsRequired().HasMaxLength(500);
            entity.Property(p => p.City).IsRequired().HasMaxLength(100);
            entity.Property(p => p.District).IsRequired().HasMaxLength(100);
            entity.Property(p => p.Area).HasColumnType("decimal(18,2)");
            entity.Property(p => p.Currency)
                  .HasConversion<string>()
                  .HasMaxLength(10);
            entity.Property(p => p.Description).HasMaxLength(2000);
            entity.Property(p => p.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(p => p.Group)
                  .WithMany(g => g.Properties)
                  .HasForeignKey(p => p.GroupId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // ---------- PropertyNote ----------
        modelBuilder.Entity<PropertyNote>(entity =>
        {
            entity.HasKey(pn => pn.Id);
            entity.Property(pn => pn.Content).IsRequired().HasMaxLength(5000);
            entity.Property(pn => pn.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(pn => pn.Property)
                  .WithMany(p => p.Notes)
                  .HasForeignKey(pn => pn.PropertyId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pn => pn.CreatedByUser)
                  .WithMany()
                  .HasForeignKey(pn => pn.CreatedBy)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ---------- RefreshToken ----------
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(rt => rt.Id);
            entity.HasIndex(rt => rt.Token).IsUnique();
            entity.Property(rt => rt.Token).IsRequired().HasMaxLength(512);
            entity.Property(rt => rt.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(rt => rt.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(rt => rt.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------- Tenant ----------
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.FullName).IsRequired().HasMaxLength(200);
            entity.Property(t => t.Phone).HasMaxLength(30);
            entity.Property(t => t.Email).HasMaxLength(256);
            entity.Property(t => t.IdentityNumber).HasMaxLength(20);
            entity.Property(t => t.MonthlyRent).HasColumnType("decimal(18,2)");
            entity.Property(t => t.Deposit).HasColumnType("decimal(18,2)");
            entity.Property(t => t.Currency)
                  .HasConversion<string>()
                  .HasMaxLength(10);
            entity.Property(t => t.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(t => t.Property)
                  .WithMany()
                  .HasForeignKey(t => t.PropertyId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ---------- RentPayment ----------
        modelBuilder.Entity<RentPayment>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Amount).HasColumnType("decimal(18,2)");
            entity.Property(r => r.Currency)
                  .HasConversion<string>()
                  .HasMaxLength(10);
            entity.Property(r => r.Status)
                  .HasConversion<string>()
                  .HasMaxLength(50);
            entity.Property(r => r.PaymentMethod)
                  .HasConversion<string>()
                  .HasMaxLength(50);
            entity.Property(r => r.Notes).HasMaxLength(2000);
            entity.Property(r => r.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(r => r.Tenant)
                  .WithMany(t => t.RentPayments)
                  .HasForeignKey(r => r.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------- ShortTermRental ----------
        modelBuilder.Entity<ShortTermRental>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.GuestName).HasMaxLength(200);
            entity.Property(s => s.NightlyRate).HasColumnType("decimal(18,2)");
            entity.Property(s => s.TotalAmount).HasColumnType("decimal(18,2)");
            entity.Property(s => s.PlatformFee).HasColumnType("decimal(18,2)");
            entity.Property(s => s.NetAmount).HasColumnType("decimal(18,2)");
            entity.Property(s => s.Platform)
                  .HasConversion<string>()
                  .HasMaxLength(50);
            entity.Property(s => s.Currency)
                  .HasConversion<string>()
                  .HasMaxLength(10);
            entity.Property(s => s.Notes).HasMaxLength(2000);
            entity.Property(s => s.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(s => s.Property)
                  .WithMany()
                  .HasForeignKey(s => s.PropertyId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------- RentIncrease ----------
        modelBuilder.Entity<RentIncrease>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.PreviousAmount).HasColumnType("decimal(18,2)");
            entity.Property(r => r.NewAmount).HasColumnType("decimal(18,2)");
            entity.Property(r => r.IncreaseRate).HasColumnType("decimal(18,2)");
            entity.Property(r => r.Notes).HasMaxLength(2000);
            entity.Property(r => r.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(r => r.Tenant)
                  .WithMany(t => t.RentIncreases)
                  .HasForeignKey(r => r.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------- Expense ----------
        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Category)
                  .HasConversion<string>()
                  .HasMaxLength(50);
            entity.Property(e => e.Currency)
                  .HasConversion<string>()
                  .HasMaxLength(10);
            entity.Property(e => e.RecurrenceInterval).HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(e => e.Property)
                  .WithMany()
                  .HasForeignKey(e => e.PropertyId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------- Bill ----------
        modelBuilder.Entity<Bill>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Amount).HasColumnType("decimal(18,2)");
            entity.Property(b => b.Type)
                  .HasConversion<string>()
                  .HasMaxLength(50);
            entity.Property(b => b.Currency)
                  .HasConversion<string>()
                  .HasMaxLength(10);
            entity.Property(b => b.Status)
                  .HasConversion<string>()
                  .HasMaxLength(50);
            entity.Property(b => b.Notes).HasMaxLength(2000);
            entity.Property(b => b.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(b => b.Property)
                  .WithMany()
                  .HasForeignKey(b => b.PropertyId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------- Document ----------
        modelBuilder.Entity<Document>(entity =>
        {
            entity.ToTable("Documents");
            entity.HasKey(d => d.Id);
            entity.Property(d => d.FileName).IsRequired().HasMaxLength(500);
            entity.Property(d => d.OriginalFileName).IsRequired().HasMaxLength(255);
            entity.Property(d => d.ContentType).IsRequired().HasMaxLength(100);
            entity.Property(d => d.FilePath).IsRequired().HasMaxLength(1000);
            entity.Property(d => d.Category)
                  .HasConversion<string>()
                  .HasMaxLength(50);
            entity.Property(d => d.UploadedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(d => d.Property)
                  .WithMany()
                  .HasForeignKey(d => d.PropertyId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Uploader)
                  .WithMany()
                  .HasForeignKey(d => d.UploadedBy)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ---------- DeviceToken ----------
        modelBuilder.Entity<DeviceToken>(entity =>
        {
            entity.HasKey(dt => dt.Id);
            entity.HasIndex(dt => dt.ExpoPushToken).IsUnique();
            entity.Property(dt => dt.ExpoPushToken).IsRequired().HasMaxLength(200);
            entity.Property(dt => dt.Platform).IsRequired().HasMaxLength(20);
            entity.Property(dt => dt.CreatedAt)
                  .HasDefaultValueSql("now() at time zone 'utc'");

            entity.HasOne(dt => dt.User)
                  .WithMany()
                  .HasForeignKey(dt => dt.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
