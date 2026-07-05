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
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Opportunity> Opportunities { get; set; }
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

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(c => c.CustomerId);
            entity.Property(c => c.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(c => c.LastName).HasMaxLength(100).IsRequired();
            entity.Property(c => c.Email).HasMaxLength(255).IsRequired();
            entity.Property(c => c.Phone).HasMaxLength(50);
            entity.Property(c => c.Source).HasMaxLength(100);

            entity.HasOne(c => c.AssignedRep)
                  .WithMany()
                  .HasForeignKey(c => c.AssignedRepId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(c => c.Company)
                  .WithMany()
                  .HasForeignKey(c => c.CompanyId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(c => !c.IsDeleted);
            
            entity.HasMany(c => c.Tags)
                  .WithMany(t => t.Customers)
                  .UsingEntity<Dictionary<string, object>>(
                      "CustomerTags",
                      j => j.HasOne<Tag>().WithMany().HasForeignKey("TagId"),
                      j => j.HasOne<Customer>().WithMany().HasForeignKey("CustomerId"));
        });

        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasKey(t => t.TagId);
            entity.HasIndex(t => t.Name).IsUnique();
            entity.Property(t => t.Name).HasMaxLength(50).IsRequired();
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
