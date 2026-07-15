using CrmSystem.Api.Dtos;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
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
    private readonly IAuditService _auditService;

    public CustomersController(AppDbContext db, ICurrentUserService currentUser, IAuditService auditService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
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
            .Include(c => c.Tags)
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

        if (query.TagIds is { Count: > 0 })
        {
            customers = customers.Where(c => query.TagIds.All(tagId => c.Tags.Any(tag => tag.TagId == tagId)));
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
            .Include(c => c.Tags)
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
            .Include(c => c.Tags)
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

        // Prevent assigning customer to a different company if they already belong to one
        if (request.CompanyId != null && customer.CompanyId != null && request.CompanyId != customer.CompanyId)
        {
            return BadRequest(new { message = "Customer already belongs to a company. Please remove them from their current company first." });
        }

        if (request.SourceId is not null &&
            !await _db.Sources.AnyAsync(s => s.SourceId == request.SourceId))
        {
            return BadRequest(new { message = "Source not found." });
        }

        // Capture old values for audit logging
        var oldAssignedRepId = customer.AssignedRepId;
        var oldFirstName = customer.FirstName;
        var oldLastName = customer.LastName;
        var oldEmail = customer.Email;
        var oldPhone = customer.Phone;
        var oldJobTitle = customer.JobTitle;
        var oldCompanyId = customer.CompanyId;
        var oldSourceId = customer.SourceId;

        customer.FirstName = request.FirstName.Trim();
        customer.LastName = request.LastName.Trim();
        customer.Email = request.Email.Trim();
        customer.Phone = request.Phone?.Trim();
        customer.JobTitle = request.JobTitle?.Trim();
        customer.CompanyId = request.CompanyId;
        customer.SourceId = request.SourceId;
        customer.AssignedRepId = assignedRepId.Value;

        await _db.SaveChangesAsync();

        // Log all field changes
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Customer");
            if (entityType is not null)
            {
                // Log assignment change if AssignedRepId changed
                if (oldAssignedRepId != customer.AssignedRepId)
                {
                    await _auditService.LogAssignmentAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: customer.CustomerId,
                        oldRepId: oldAssignedRepId,
                        newRepId: customer.AssignedRepId,
                        changedById: _currentUser.UserId.Value);
                }

                // Log other field changes
                if (oldFirstName != customer.FirstName)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: customer.CustomerId,
                        fieldName: "FirstName",
                        oldValue: oldFirstName,
                        newValue: customer.FirstName,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldLastName != customer.LastName)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: customer.CustomerId,
                        fieldName: "LastName",
                        oldValue: oldLastName,
                        newValue: customer.LastName,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldEmail != customer.Email)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: customer.CustomerId,
                        fieldName: "Email",
                        oldValue: oldEmail,
                        newValue: customer.Email,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldPhone != customer.Phone)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: customer.CustomerId,
                        fieldName: "Phone",
                        oldValue: oldPhone ?? string.Empty,
                        newValue: customer.Phone ?? string.Empty,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldJobTitle != customer.JobTitle)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: customer.CustomerId,
                        fieldName: "JobTitle",
                        oldValue: oldJobTitle ?? string.Empty,
                        newValue: customer.JobTitle ?? string.Empty,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldCompanyId != customer.CompanyId)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: customer.CustomerId,
                        fieldName: "CompanyId",
                        oldValue: oldCompanyId?.ToString() ?? string.Empty,
                        newValue: customer.CompanyId?.ToString() ?? string.Empty,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldSourceId.HasValue != customer.SourceId.HasValue || (oldSourceId.HasValue && customer.SourceId.HasValue && oldSourceId.Value != customer.SourceId.Value))
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: customer.CustomerId,
                        fieldName: "SourceId",
                        oldValue: oldSourceId?.ToString() ?? "null",
                        newValue: customer.SourceId?.ToString() ?? "null",
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }
            }
        }

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

        // Log deletion audit
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Customer");
            if (entityType is not null)
            {
                await _auditService.LogDeletionAsync(entityType.EntityTypeId, customer.CustomerId, _currentUser.UserId.Value);
            }
        }

        return NoContent();
    }

    [HttpGet("{id:int}/audit")]
    public async Task<ActionResult> GetAuditLogs(int id)
    {
        var customer = await _db.Customers.SingleOrDefaultAsync(c => c.CustomerId == id);
        if (customer is null)
        {
            return NotFound(new { message = "Customer not found." });
        }

        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Customer");
        if (entityType is null)
        {
            return Ok(new object[0]);
        }

        var auditLogs = await _db.AuditLogs
            .Include(a => a.ChangedBy)
            .Where(a => a.EntityTypeId == entityType.EntityTypeId && a.EntityId == id)
            .OrderByDescending(a => a.ChangedAt)
            .Select(a => new
            {
                a.AuditLogId,
                AuditActionType = a.AuditActionType != null ? a.AuditActionType.Name : null,
                a.FieldName,
                a.OldValue,
                a.NewValue,
                ChangedByName = a.ChangedBy != null ? a.ChangedBy.Name : null,
                a.ChangedAt
            })
            .ToListAsync();

        return Ok(auditLogs);
    }

    [HttpDelete("{id:int}/audit")]
    public async Task<IActionResult> ClearHistory(int id)
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

        var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Customer");
        if (entityType is null)
        {
            return Ok(new { message = "History cleared." });
        }

        if (_currentUser.UserId is not null)
        {
            await _auditService.ClearHistoryAsync(entityType.EntityTypeId, customer.CustomerId, _currentUser.UserId.Value);
        }

        return Ok(new { message = "History cleared." });
    }

    [HttpPost("{id:int}/tags")]
    public async Task<IActionResult> AddTag(int id, [FromBody] int tagId)
    {
        var customer = await _db.Customers.Include(c => c.Tags).SingleOrDefaultAsync(c => c.CustomerId == id);
        if (customer is null) return NotFound(new { message = "Customer not found." });
        if (!_currentUser.CanAccessOwnedRecord(customer.AssignedRepId)) return Forbid();

        var tag = await _db.Tags.FindAsync(tagId);
        if (tag is null) return NotFound(new { message = "Tag not found." });
        if (!customer.Tags.Any(t => t.TagId == tagId))
        {
            customer.Tags.Add(tag);
            await _db.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpGet("{id:int}/activities")]
    public async Task<ActionResult<IReadOnlyList<CustomerActivityDto>>> GetActivities(int id)
    {
        if (!await CanAccessCustomerAsync(id)) return Forbid();
        var items = await _db.Activities.AsNoTracking().Where(a => a.CustomerId == id)
            .OrderByDescending(a => a.ActivityDate)
            .Select(a => new CustomerActivityDto(a.ActivityId, a.ActivityType!.Name, a.Subject, a.Description, a.ActivityDate, a.DurationMinutes, a.CreatedBy!.Name))
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id:int}/opportunities")]
    public async Task<IActionResult> GetOpportunities(int id)
    {
        if (!await CanAccessCustomerAsync(id)) return Forbid();
        var items = await _db.Opportunities.AsNoTracking().Where(o => o.CustomerId == id)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new { o.OpportunityId, o.Title, StageName = o.OpportunityStage!.Name, o.EstimatedValue, o.ExpectedCloseDate })
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id:int}/tasks")]
    public async Task<ActionResult<IReadOnlyList<CustomerTaskDto>>> GetTasks(int id)
    {
        if (!await CanAccessCustomerAsync(id)) return Forbid();
        var items = await _db.CrmTasks.AsNoTracking().Where(t => t.CustomerId == id)
            .OrderBy(t => t.DueDate)
            .Select(t => new CustomerTaskDto(t.CrmTaskId, t.Title, t.Description, t.DueDate, t.CrmTaskStatus!.Name, t.AssignedTo!.Name))
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id:int}/history")]
    public async Task<ActionResult<IReadOnlyList<AuditLogEntryDto>>> GetHistory(int id)
    {
        if (!await CanAccessCustomerAsync(id)) return Forbid();
        var items = await _db.AuditLogs.AsNoTracking()
            .Where(a => a.EntityType!.Name == "Customer" && a.EntityId == id)
            .OrderByDescending(a => a.ChangedAt)
            .Select(a => new AuditLogEntryDto(a.AuditLogId, a.AuditActionType!.Name, a.FieldName, a.OldValue, a.NewValue, a.ChangedBy!.Name, a.ChangedAt))
            .ToListAsync();
        return Ok(items);
    }

    [HttpDelete("{id:int}/tags/{tagId:int}")]
    public async Task<IActionResult> RemoveTag(int id, int tagId)
    {
        var customer = await _db.Customers.Include(c => c.Tags).SingleOrDefaultAsync(c => c.CustomerId == id);
        if (customer is null) return NotFound(new { message = "Customer not found." });
        if (!_currentUser.CanAccessOwnedRecord(customer.AssignedRepId)) return Forbid();

        var tag = customer.Tags.FirstOrDefault(t => t.TagId == tagId);
        if (tag is not null)
        {
            customer.Tags.Remove(tag);
            await _db.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> BulkUpdate(BulkCustomerActionRequest request)
    {
        var customerIds = request.CustomerIds.Distinct().ToList();
        if (customerIds.Count == 0) return BadRequest(new { message = "Select at least one customer." });

        var customers = await _db.Customers.Include(c => c.Tags)
            .Where(c => customerIds.Contains(c.CustomerId)).ToListAsync();
        if (customers.Count != customerIds.Count || customers.Any(c => !_currentUser.CanAccessOwnedRecord(c.AssignedRepId))) return Forbid();

        if (string.Equals(request.Action, "tag", StringComparison.OrdinalIgnoreCase))
        {
            if (request.TagId is null) return BadRequest(new { message = "A tag is required." });
            var tag = await _db.Tags.FindAsync(request.TagId.Value);
            if (tag is null) return NotFound(new { message = "Tag not found." });
            foreach (var customer in customers.Where(c => !c.Tags.Any(t => t.TagId == tag.TagId))) customer.Tags.Add(tag);
        }
        else if (string.Equals(request.Action, "reassign", StringComparison.OrdinalIgnoreCase))
        {
            if (!_currentUser.IsManagerOrAbove) return Forbid();
            if (request.NewRepId is null || !await IsAssignableRepAsync(request.NewRepId.Value))
                return BadRequest(new { message = "A valid sales rep is required." });
            foreach (var customer in customers) customer.AssignedRepId = request.NewRepId.Value;
        }
        else if (string.Equals(request.Action, "assign_company", StringComparison.OrdinalIgnoreCase))
        {
            if (request.NewCompanyId is null) return BadRequest(new { message = "A company is required." });
            var company = await _db.Companies.FindAsync(request.NewCompanyId.Value);
            if (company is null) return NotFound(new { message = "Company not found." });
            
            // Check if any customers already belong to a different company
            var customersWithDifferentCompany = customers.Where(c => c.CompanyId != null && c.CompanyId != request.NewCompanyId.Value).ToList();
            if (customersWithDifferentCompany.Any())
            {
                var customerNames = string.Join(", ", customersWithDifferentCompany.Select(c => $"{c.FirstName} {c.LastName}"));
                return BadRequest(new { message = $"The following customers already belong to another company: {customerNames}. Please remove them from their current company first." });
            }
            
            var customerEntityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Customer");
            var companyEntityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Company");
            
            if (customerEntityType is not null && companyEntityType is not null && _currentUser.UserId is not null)
            {
                foreach (var customer in customers)
                {
                    var oldCompanyId = customer.CompanyId;
                    customer.CompanyId = request.NewCompanyId.Value;
                    
                    // Log to customer's audit history
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: customerEntityType.EntityTypeId,
                        entityId: customer.CustomerId,
                        fieldName: "CompanyId",
                        oldValue: oldCompanyId?.ToString() ?? string.Empty,
                        newValue: request.NewCompanyId.Value.ToString(),
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                    
                    // Log to company's audit history
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: companyEntityType.EntityTypeId,
                        entityId: request.NewCompanyId.Value,
                        fieldName: "CustomerAdded",
                        oldValue: string.Empty,
                        newValue: $"{customer.FirstName} {customer.LastName} (ID: {customer.CustomerId})",
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }
            }
            else
            {
                foreach (var customer in customers) customer.CompanyId = request.NewCompanyId.Value;
            }
        }
        else if (string.Equals(request.Action, "remove_company", StringComparison.OrdinalIgnoreCase))
        {
            var customerEntityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Customer");
            var companyEntityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Company");
            
            if (customerEntityType is not null && companyEntityType is not null && _currentUser.UserId is not null)
            {
                foreach (var customer in customers)
                {
                    if (customer.CompanyId != null)
                    {
                        var oldCompanyId = customer.CompanyId;
                        customer.CompanyId = null;
                        
                        // Log to customer's audit history
                        await _auditService.LogFieldChangeAsync(
                            entityTypeId: customerEntityType.EntityTypeId,
                            entityId: customer.CustomerId,
                            fieldName: "CompanyId",
                            oldValue: oldCompanyId.ToString(),
                            newValue: string.Empty,
                            actionTypeName: "Update",
                            changedById: _currentUser.UserId.Value);
                        
                        // Log to company's audit history
                        await _auditService.LogFieldChangeAsync(
                            entityTypeId: companyEntityType.EntityTypeId,
                            entityId: oldCompanyId.Value,
                            fieldName: "CustomerRemoved",
                            oldValue: $"{customer.FirstName} {customer.LastName} (ID: {customer.CustomerId})",
                            newValue: string.Empty,
                            actionTypeName: "Update",
                            changedById: _currentUser.UserId.Value);
                    }
                }
            }
            else
            {
                foreach (var customer in customers) customer.CompanyId = null;
            }
        }
        else return BadRequest(new { message = "Unsupported bulk action." });

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

        // Allow any valid user (including Admin) to be assigned
        var repExists = await _db.Identities
            .Include(u => u.Role)
            .AnyAsync(u => u.IdentityId == requestedRepId && u.Role != null);
        return repExists ? requestedRepId : null;
    }

    private async Task<bool> IsAssignableRepAsync(int repId)
    {
        return await _db.Identities
            .Include(u => u.Role)
            .AnyAsync(u => u.IdentityId == repId && u.Role != null && u.Role.Name != "Admin");
    }

    private async Task<bool> CanAccessCustomerAsync(int customerId)
    {
        var assignedRepId = await _db.Customers.Where(c => c.CustomerId == customerId).Select(c => (int?)c.AssignedRepId).SingleOrDefaultAsync();
        return assignedRepId is not null && _currentUser.CanAccessOwnedRecord(assignedRepId);
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
            customer.CreatedAt,
            ToTagDtos(customer));

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
            customer.CreatedAt,
            ToTagDtos(customer));

    private static IReadOnlyList<CustomerTagDto> ToTagDtos(Customer customer) =>
        customer.Tags
            .OrderBy(tag => tag.Name)
            .Select(tag => new CustomerTagDto(tag.TagId, tag.Name))
            .ToArray();
}