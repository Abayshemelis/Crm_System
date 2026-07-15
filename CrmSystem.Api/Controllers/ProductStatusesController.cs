using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using CrmSystem.Infrastructure.Services;
using CrmSystem.Api.Services;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RepOrAbove")]
public class ProductStatusesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public ProductStatusesController(AppDbContext db, ICurrentUserService currentUser, IAuditService auditService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductStatus>>> GetAll()
    {
        var statuses = await _db.ProductStatuses
            .OrderBy(s => s.Name)
            .ToListAsync();
        return Ok(statuses);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductStatus>> Get(int id)
    {
        var status = await _db.ProductStatuses.FindAsync(id);
        if (status == null)
            return NotFound(new { message = "Product status not found." });

        return Ok(status);
    }

    [HttpPost]
    public async Task<ActionResult<ProductStatus>> Create([FromBody] CreateProductStatusRequest request)
    {
        if (_currentUser.UserId is null)
            return Unauthorized();

        // Validate name uniqueness
        if (await _db.ProductStatuses.AnyAsync(s => s.Name == request.Name.Trim()))
        {
            return BadRequest(new { message = "Status name must be unique." });
        }

        var status = new ProductStatus
        {
            Name = request.Name.Trim(),
            IsSelectable = request.IsSelectable
        };

        _db.ProductStatuses.Add(status);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = status.ProductStatusId }, status);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ProductStatus>> Update(int id, [FromBody] UpdateProductStatusRequest request)
    {
        var status = await _db.ProductStatuses.FindAsync(id);
        if (status == null)
            return NotFound(new { message = "Product status not found." });

        // Validate name uniqueness (excluding current status)
        if (await _db.ProductStatuses.AnyAsync(s => s.ProductStatusId != id && s.Name == request.Name.Trim()))
        {
            return BadRequest(new { message = "Status name must be unique." });
        }

        var oldName = status.Name;
        var oldIsSelectable = status.IsSelectable;

        status.Name = request.Name.Trim();
        status.IsSelectable = request.IsSelectable;

        await _db.SaveChangesAsync();

        // Log field changes
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "ProductStatus");
            if (entityType is not null)
            {
                if (oldName != status.Name)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: status.ProductStatusId,
                        fieldName: "Name",
                        oldValue: oldName,
                        newValue: status.Name,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldIsSelectable != status.IsSelectable)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: status.ProductStatusId,
                        fieldName: "IsSelectable",
                        oldValue: oldIsSelectable.ToString(),
                        newValue: status.IsSelectable.ToString(),
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }
            }
        }

        return Ok(status);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var status = await _db.ProductStatuses.FindAsync(id);
        if (status == null)
            return NotFound(new { message = "Product status not found." });

        // Check if status is in use
        if (await _db.Products.AnyAsync(p => p.ProductStatusId == id))
        {
            return BadRequest(new { message = "Cannot delete status that is in use by products." });
        }

        // Log deletion audit
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "ProductStatus");
            if (entityType is not null)
            {
                await _auditService.LogDeletionAsync(entityType.EntityTypeId, status.ProductStatusId, _currentUser.UserId.Value);
            }
        }

        _db.ProductStatuses.Remove(status);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}

public class CreateProductStatusRequest
{
    public string Name { get; set; } = string.Empty;
    public bool IsSelectable { get; set; } = true;
}

public class UpdateProductStatusRequest
{
    public string Name { get; set; } = string.Empty;
    public bool IsSelectable { get; set; }
}
