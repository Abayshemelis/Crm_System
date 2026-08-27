using System.Threading.Tasks;

namespace CrmSystem.Infrastructure.Data;

public static class SampleDataSeeder
{
    public static Task SeedSampleCrmDataAsync(AppDbContext db)
    {
        // No-op: Only real operational data created in the live CRM is used.
        return Task.CompletedTask;
    }
}
