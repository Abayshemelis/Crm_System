using CrmSystem.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Role)
                  .HasConversion<string>()
                  .HasMaxLength(20);
            entity.Property(u => u.Name).HasMaxLength(100);
            entity.Property(u => u.Email).HasMaxLength(255);
        });

        modelBuilder.Entity<Company>(entity =>
        {
            entity.Property(c => c.Name).HasMaxLength(150).IsRequired();
            entity.Property(c => c.Industry).HasMaxLength(100);
            entity.Property(c => c.Website).HasMaxLength(255);
            entity.Property(c => c.Address).HasMaxLength(255);

            entity.HasOne(c => c.AssignedRep)
                  .WithMany()
                  .HasForeignKey(c => c.AssignedRepId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(c => !c.IsDeleted);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasIndex(rt => rt.TokenHash).IsUnique();
            entity.Property(rt => rt.TokenHash).HasMaxLength(255).IsRequired();

            entity.HasOne(rt => rt.User)
                  .WithMany()
                  .HasForeignKey(rt => rt.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
