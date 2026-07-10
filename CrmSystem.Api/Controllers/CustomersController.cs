using CrmSystem.Api.Dtos;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Controllers;

[Authorize(Policy = "RepOrAbove")]
[ApiController]
[Route("api/customers")]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CustomersController(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<CustomerSummaryDto>>> GetCustomers([FromQuery] CustomerListQuery query)
    {
        if (_currentUser.UserId is null)
        {
            return Unauthorized();
        }

        var customers = _db.Customers
            .AsNoTracking()
            .Include(c => c.Company)
            .Include(c => c.AssignedRep)
            .Include(c => c.Source)
            .AsQueryable();

        if (!_currentUser.IsManagerOrAbove)
        {
            customers = customers.Where(c => c.AssignedRepId == _currentUser.UserId);
        }
        else if (query.RepId is not null)
        {
            customers = customers.Where(c => c.AssignedRepId == query.RepId);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            customers = customers.Where(c =>
                c.FirstName.Contains(search) ||
                c.LastName.Contains(search) ||
                c.Email.Contains(search));
        }

        if (query.CompanyId is not null)
        {
            customers = customers.Where(c => c.CompanyId == query.CompanyId);
        }

        if (query.SourceId is not null)
        {
            customers = customers.Where(c => c.SourceId == query.SourceId);
        }

        var page = query.NormalizedPage;
        var pageSize = query.NormalizedPageSize;
        var totalCount = await customers.CountAsync();

        var entities = await customers
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = entities.Select(ToSummaryDto).ToList();

        return Ok(PagedResult<CustomerSummaryDto>.Create(items, page, pageSize, totalCount));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CustomerDetailDto>> GetCustomer(int id)
    {
        var customer = await _db.Customers
            .AsNoTracking()
            .Include(c => c.Company)
            .Include(c => c.AssignedRep)
            .Include(c => c.Source)
            .SingleOrDefaultAsync(c => c.CustomerId == id);

        if (customer is null)
        {
            return NotFound(new { message = "Customer not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(customer.AssignedRepId))
        {
            return Forbid();
        }

        return Ok(ToDetailDto(customer));
    }

    [HttpPost]
    public async Task<ActionResult<CustomerDetailDto>> CreateCustomer(CreateCustomerRequest request)
    {
        if (_currentUser.UserId is null)
        {
            return Unauthorized();
        }

        var assignedRepId = await ResolveAssignedRepIdAsync(request.AssignedRepId);
        if (assignedRepId is null)
        {
            return BadRequest(new { message = "Assigned rep is invalid." });
        }

        if (request.CompanyId is not null &&
            !await _db.Companies.AnyAsync(c => c.CompanyId == request.CompanyId))
        {
            return BadRequest(new { message = "Company not found." });
        }

        if (request.SourceId is not null &&
            !await _db.Sources.AnyAsync(s => s.SourceId == request.SourceId))
        {
            return BadRequest(new { message = "Source not found." });
        }

        var customer = new Customer
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.Trim(),
            Phone = request.Phone?.Trim(),
            JobTitle = request.JobTitle?.Trim(),
            CompanyId = request.CompanyId,
            SourceId = request.SourceId,
            AssignedRepId = assignedRepId.Value,
            CreatedAt = DateTime.UtcNow
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        await _db.Entry(customer).Reference(c => c.Company).LoadAsync();
        await _db.Entry(customer).Reference(c => c.AssignedRep).LoadAsync();
        await _db.Entry(customer).Reference(c => c.Source).LoadAsync();

        return CreatedAtAction(
            nameof(GetCustomer),
            new { id = customer.CustomerId },
            ToDetailDto(customer));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CustomerDetailDto>> UpdateCustomer(int id, UpdateCustomerRequest request)
    {
        var customer = await _db.Customers
            .Include(c => c.Company)
            .Include(c => c.AssignedRep)
            .Include(c => c.Source)
            .SingleOrDefaultAsync(c => c.CustomerId == id);

        if (customer is null)
        {
            return NotFound(new { message = "Customer not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(customer.AssignedRepId))
        {
            return Forbid();
        }

        var assignedRepId = await ResolveAssignedRepIdAsync(request.AssignedRepId);
        if (assignedRepId is null)
        {
            return BadRequest(new { message = "Assigned rep is invalid." });
        }

        if (!_currentUser.IsManagerOrAbove && assignedRepId != customer.AssignedRepId)
        {
            return Forbid();
        }

        if (request.CompanyId is not null &&
            !await _db.Companies.AnyAsync(c => c.CompanyId == request.CompanyId))
        {
            return BadRequest(new { message = "Company not found." });
        }

        if (request.SourceId is not null &&
            !await _db.Sources.AnyAsync(s => s.SourceId == request.SourceId))
        {
            return BadRequest(new { message = "Source not found." });
        }

        customer.FirstName = request.FirstName.Trim();
        customer.LastName = request.LastName.Trim();
        customer.Email = request.Email.Trim();
        customer.Phone = request.Phone?.Trim();
        customer.JobTitle = request.JobTitle?.Trim();
        customer.CompanyId = request.CompanyId;
        customer.SourceId = request.SourceId;
        customer.AssignedRepId = assignedRepId.Value;

        await _db.SaveChangesAsync();

        await _db.Entry(customer).Reference(c => c.Company).LoadAsync();
        await _db.Entry(customer).Reference(c => c.AssignedRep).LoadAsync();
        await _db.Entry(customer).Reference(c => c.Source).LoadAsync();

        return Ok(ToDetailDto(customer));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        var customer = await _db.Customers.SingleOrDefaultAsync(c => c.CustomerId == id);

        if (customer is null)
        {
            return NotFound(new { message = "Customer not found." });
        }

        if (!_currentUser.CanAccessOwnedRecord(customer.AssignedRepId))
        {
            return Forbid();
        }

        customer.IsDeleted = true;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private async Task<int?> ResolveAssignedRepIdAsync(int? requestedRepId)
    {
        if (_currentUser.UserId is null)
        {
            return null;
        }

        if (!_currentUser.IsManagerOrAbove)
        {
            return _currentUser.UserId;
        }

        if (requestedRepId is null)
        {
            return _currentUser.UserId;
        }

        var repExists = await _db.Identities.AnyAsync(u => u.IdentityId == requestedRepId);
        return repExists ? requestedRepId : null;
    }

    private static CustomerSummaryDto ToSummaryDto(Customer customer) =>
        new(
            customer.CustomerId,
            customer.FirstName,
            customer.LastName,
            customer.Email,
            customer.Phone,
            customer.JobTitle,
            customer.CompanyId,
            customer.Company?.Name,
            customer.SourceId,
            customer.Source?.Name,
            customer.AssignedRepId,
            customer.AssignedRep?.Name ?? string.Empty,
            customer.CreatedAt);

    private static CustomerDetailDto ToDetailDto(Customer customer) =>
        new(
            customer.CustomerId,
            customer.FirstName,
            customer.LastName,
            customer.Email,
            customer.Phone,
            customer.JobTitle,
            customer.CompanyId,
            customer.Company?.Name,
            customer.SourceId,
            customer.Source?.Name,
            customer.AssignedRepId,
            customer.AssignedRep?.Name ?? string.Empty,
            customer.AssignedRep?.Email ?? string.Empty,
            customer.CreatedAt);
}
