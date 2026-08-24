using System;
using System.Linq;
using System.Threading.Tasks;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _db;

    public SearchController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("global")]
    public async Task<IActionResult> GlobalSearch([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
        {
            return BadRequest("Search query must be at least 2 characters long.");
        }

        var q = query.Trim().ToLower();

        // 1. Search Customers
        var customers = await _db.Customers
            .AsNoTracking()
            .Where(c => !c.IsDeleted && (
                c.FirstName.ToLower().Contains(q) || 
                c.LastName.ToLower().Contains(q) || 
                (c.Email != null && c.Email.ToLower().Contains(q)) ||
                (c.Phone != null && c.Phone.Contains(q))))
            .Take(5)
            .Select(c => new
            {
                Type = "customer",
                Id = c.CustomerId,
                Title = c.FirstName + " " + c.LastName,
                Subtitle = c.Email ?? c.Phone ?? "Customer Record"
            })
            .ToListAsync();

        // 2. Search Companies
        var companies = await _db.Companies
            .AsNoTracking()
            .Where(c => !c.IsDeleted && (
                c.Name.ToLower().Contains(q) ||
                (c.Industry != null && c.Industry.ToLower().Contains(q)) ||
                (c.Website != null && c.Website.ToLower().Contains(q))))
            .Take(5)
            .Select(c => new
            {
                Type = "company",
                Id = c.CompanyId,
                Title = c.Name,
                Subtitle = c.Industry ?? c.Website ?? "Company Account"
            })
            .ToListAsync();

        // 3. Search Leads
        var leads = await _db.Leads
            .AsNoTracking()
            .Where(l => 
                l.FirstName.ToLower().Contains(q) || 
                l.LastName.ToLower().Contains(q) || 
                (l.Email != null && l.Email.ToLower().Contains(q)) ||
                (l.CompanyName != null && l.CompanyName.ToLower().Contains(q)) ||
                (l.Phone != null && l.Phone.Contains(q)))
            .Take(5)
            .Select(l => new
            {
                Type = "lead",
                Id = l.LeadId,
                Title = l.FirstName + " " + l.LastName,
                Subtitle = l.CompanyName ?? l.Email ?? "Sales Lead"
            })
            .ToListAsync();

        // 4. Search Opportunities (Deals)
        var opportunities = await _db.Opportunities
            .AsNoTracking()
            .Where(o => o.Title.ToLower().Contains(q))
            .Take(5)
            .Select(o => new
            {
                Type = "opportunity",
                Id = o.OpportunityId,
                Title = o.Title,
                Subtitle = o.Customer != null ? o.Customer.FirstName + " " + o.Customer.LastName : "Deal Opportunity"
            })
            .ToListAsync();

        // 5. Search Tasks
        var tasks = await _db.CrmTasks
            .AsNoTracking()
            .Where(t => t.Title.ToLower().Contains(q) || (t.Description != null && t.Description.ToLower().Contains(q)))
            .Take(5)
            .Select(t => new
            {
                Type = "task",
                Id = t.CrmTaskId,
                Title = t.Title,
                Subtitle = t.DueDate.HasValue ? "Due: " + t.DueDate.Value.ToString("yyyy-MM-dd") : "Task Activity"
            })
            .ToListAsync();

        // 6. Search Products
        var products = await _db.Products
            .AsNoTracking()
            .Where(p => p.Name.ToLower().Contains(q) || (p.SKU != null && p.SKU.ToLower().Contains(q)))
            .Take(5)
            .Select(p => new
            {
                Type = "product",
                Id = p.ProductId,
                Title = p.Name,
                Subtitle = p.SKU != null ? "SKU: " + p.SKU + " · $" + p.Price : "$" + p.Price
            })
            .ToListAsync();

        // 7. Search Invoices
        var invoices = await _db.Invoices
            .AsNoTracking()
            .Where(i => i.InvoiceNumber.ToLower().Contains(q) || (i.Customer != null && (i.Customer.FirstName.ToLower().Contains(q) || i.Customer.LastName.ToLower().Contains(q))))
            .Take(5)
            .Select(i => new
            {
                Type = "invoice",
                Id = i.InvoiceId,
                Title = "Invoice #" + i.InvoiceNumber,
                Subtitle = "$" + i.TotalAmount + " · " + i.Status
            })
            .ToListAsync();

        // 8. Search Contracts
        var contracts = await _db.Contracts
            .AsNoTracking()
            .Where(ct => ct.ContractNumber.ToLower().Contains(q) || ct.Title.ToLower().Contains(q))
            .Take(5)
            .Select(ct => new
            {
                Type = "contract",
                Id = ct.ContractId,
                Title = ct.Title + " (" + ct.ContractNumber + ")",
                Subtitle = "$" + ct.ContractValue + " · " + ct.Status
            })
            .ToListAsync();

        var results = customers
            .Concat(companies)
            .Concat(leads)
            .Concat(opportunities)
            .Concat(tasks)
            .Concat(products)
            .Concat(invoices)
            .Concat(contracts)
            .ToList();

        return Ok(results);
    }
}
