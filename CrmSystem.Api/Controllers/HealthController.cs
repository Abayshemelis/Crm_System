using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrmSystem.Infrastructure;
using System.Diagnostics;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;
    private static readonly DateTime _startTime = DateTime.UtcNow;

    public HealthController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetHealthStatus()
    {
        var dbConnected = false;
        string? dbError = null;

        try
        {
            dbConnected = await _db.Database.CanConnectAsync();
        }
        catch (Exception ex)
        {
            dbConnected = false;
            dbError = ex.Message;
        }

        var uptime = DateTime.UtcNow - _startTime;

        int customerCount = 0;
        int leadCount = 0;
        int companyCount = 0;
        int opportunityCount = 0;

        if (dbConnected)
        {
            try
            {
                customerCount = await _db.Customers.CountAsync(c => !c.IsDeleted);
                leadCount = await _db.Leads.CountAsync(l => !l.IsDeleted);
                companyCount = await _db.Companies.CountAsync(c => !c.IsDeleted);
                opportunityCount = await _db.Opportunities.CountAsync();
            }
            catch
            {
                // Soft fallback if counts fail
            }
        }

        var healthData = new
        {
            status = dbConnected ? "Healthy" : "Degraded",
            timestamp = DateTime.UtcNow,
            uptime = $"{uptime.Days}d {uptime.Hours}h {uptime.Minutes}m {uptime.Seconds}s",
            database = new
            {
                connected = dbConnected,
                error = dbError,
                provider = _db.Database.ProviderName
            },
            entitySummary = new
            {
                totalCustomers = customerCount,
                totalLeads = leadCount,
                totalCompanies = companyCount,
                totalOpportunities = opportunityCount
            },
            version = "1.0.0",
            framework = ".NET 10"
        };

        return dbConnected ? Ok(healthData) : StatusCode(503, healthData);
    }
}
