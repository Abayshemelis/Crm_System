using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CrmSystem.Infrastructure;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(
            "Server=AMAZI;Database=CrmSystemDb;Trusted_Connection=True;TrustServerCertificate=True");

        return new AppDbContext(optionsBuilder.Options);
    }
}
