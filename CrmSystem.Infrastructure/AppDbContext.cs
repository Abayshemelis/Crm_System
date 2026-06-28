using CrmSystem.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

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
    }
}