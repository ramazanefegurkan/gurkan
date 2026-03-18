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
    }
}
