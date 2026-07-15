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
public class ProductCategoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public ProductCategoriesController(AppDbContext db, ICurrentUserService currentUser, IAuditService auditService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductCategory>>> GetAll()
    {
        var categories = await _db.ProductCategories
            .OrderBy(c => c.Name)
            .ToListAsync();
        return Ok(categories);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductCategory>> Get(int id)
    {
        var category = await _db.ProductCategories.FindAsync(id);
        if (category == null)
            return NotFound(new { message = "Product category not found." });

        return Ok(category);
    }

    [HttpPost]
    public async Task<ActionResult<ProductCategory>> Create([FromBody] CreateProductCategoryRequest request)
    {
        if (_currentUser.UserId is null)
            return Unauthorized();

        // Validate name uniqueness
        if (await _db.ProductCategories.AnyAsync(c => c.Name == request.Name.Trim()))
        {
            return BadRequest(new { message = "Category name must be unique." });
        }

        var category = new ProductCategory
        {
            Name = request.Name.Trim()
        };

        _db.ProductCategories.Add(category);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = category.ProductCategoryId }, category);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ProductCategory>> Update(int id, [FromBody] UpdateProductCategoryRequest request)
    {
        var category = await _db.ProductCategories.FindAsync(id);
        if (category == null)
            return NotFound(new { message = "Product category not found." });

        // Validate name uniqueness (excluding current category)
        if (await _db.ProductCategories.AnyAsync(c => c.ProductCategoryId != id && c.Name == request.Name.Trim()))
        {
            return BadRequest(new { message = "Category name must be unique." });
        }

        var oldName = category.Name;
        category.Name = request.Name.Trim();

        await _db.SaveChangesAsync();

        // Log field change
        if (_currentUser.UserId is not null && oldName != category.Name)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "ProductCategory");
            if (entityType is not null)
            {
                await _auditService.LogFieldChangeAsync(
                    entityTypeId: entityType.EntityTypeId,
                    entityId: category.ProductCategoryId,
                    fieldName: "Name",
                    oldValue: oldName,
                    newValue: category.Name,
                    actionTypeName: "Update",
                    changedById: _currentUser.UserId.Value);
            }
        }

        return Ok(category);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _db.ProductCategories.FindAsync(id);
        if (category == null)
            return NotFound(new { message = "Product category not found." });

        // Check if category is in use
        if (await _db.Products.AnyAsync(p => p.ProductCategoryId == id))
        {
            return BadRequest(new { message = "Cannot delete category that is in use by products." });
        }

        // Log deletion audit
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "ProductCategory");
            if (entityType is not null)
            {
                await _auditService.LogDeletionAsync(entityType.EntityTypeId, category.ProductCategoryId, _currentUser.UserId.Value);
            }
        }

        _db.ProductCategories.Remove(category);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}

public class CreateProductCategoryRequest
{
    public string Name { get; set; } = string.Empty;
}

public class UpdateProductCategoryRequest
{
    public string Name { get; set; } = string.Empty;
}
