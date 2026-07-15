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
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public ProductsController(AppDbContext db, ICurrentUserService currentUser, IAuditService auditService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Product>>> GetAll()
    {
        var products = await _db.Products
            .Include(p => p.ProductCategory)
            .Include(p => p.ProductStatus)
            .OrderBy(p => p.Name)
            .ToListAsync();
        return Ok(products);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> Get(int id)
    {
        var product = await _db.Products
            .Include(p => p.ProductCategory)
            .Include(p => p.ProductStatus)
            .SingleOrDefaultAsync(p => p.ProductId == id);

        if (product == null)
            return NotFound(new { message = "Product not found." });

        return Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create([FromBody] CreateProductRequest request)
    {
        if (_currentUser.UserId is null)
            return Unauthorized();

        // Validate SKU uniqueness
        if (!string.IsNullOrWhiteSpace(request.SKU) && 
            await _db.Products.AnyAsync(p => p.SKU == request.SKU))
        {
            return BadRequest(new { message = "SKU must be unique." });
        }

        // Validate category exists
        if (request.ProductCategoryId.HasValue && 
            !await _db.ProductCategories.AnyAsync(c => c.ProductCategoryId == request.ProductCategoryId))
        {
            return BadRequest(new { message = "Product category not found." });
        }

        // Validate status exists
        if (!await _db.ProductStatuses.AnyAsync(s => s.ProductStatusId == request.ProductStatusId))
        {
            return BadRequest(new { message = "Product status not found." });
        }

        var product = new Product
        {
            Name = request.Name.Trim(),
            SKU = request.SKU?.Trim(),
            Description = request.Description?.Trim(),
            ProductCategoryId = request.ProductCategoryId,
            ProductStatusId = request.ProductStatusId,
            Price = request.Price,
            Cost = request.Cost,
            StockQuantity = request.StockQuantity,
            CreatedAt = DateTime.UtcNow
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        await _db.Entry(product).Reference(p => p.ProductCategory).LoadAsync();
        await _db.Entry(product).Reference(p => p.ProductStatus).LoadAsync();

        return CreatedAtAction(nameof(Get), new { id = product.ProductId }, product);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Product>> Update(int id, [FromBody] UpdateProductRequest request)
    {
        var product = await _db.Products
            .Include(p => p.ProductCategory)
            .Include(p => p.ProductStatus)
            .SingleOrDefaultAsync(p => p.ProductId == id);

        if (product == null)
            return NotFound(new { message = "Product not found." });

        // Validate SKU uniqueness (excluding current product)
        if (!string.IsNullOrWhiteSpace(request.SKU) && 
            await _db.Products.AnyAsync(p => p.ProductId != id && p.SKU == request.SKU))
        {
            return BadRequest(new { message = "SKU must be unique." });
        }

        // Validate category exists
        if (request.ProductCategoryId.HasValue && 
            !await _db.ProductCategories.AnyAsync(c => c.ProductCategoryId == request.ProductCategoryId))
        {
            return BadRequest(new { message = "Product category not found." });
        }

        // Validate status exists
        if (!await _db.ProductStatuses.AnyAsync(s => s.ProductStatusId == request.ProductStatusId))
        {
            return BadRequest(new { message = "Product status not found." });
        }

        // Capture old values for audit logging
        var oldName = product.Name;
        var oldSKU = product.SKU;
        var oldPrice = product.Price;
        var oldStockQuantity = product.StockQuantity;

        product.Name = request.Name.Trim();
        product.SKU = request.SKU?.Trim();
        product.Description = request.Description?.Trim();
        product.ProductCategoryId = request.ProductCategoryId;
        product.ProductStatusId = request.ProductStatusId;
        product.Price = request.Price;
        product.Cost = request.Cost;
        product.StockQuantity = request.StockQuantity;

        await _db.SaveChangesAsync();

        // Log field changes
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Product");
            if (entityType is not null)
            {
                if (oldName != product.Name)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: product.ProductId,
                        fieldName: "Name",
                        oldValue: oldName,
                        newValue: product.Name,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldSKU != product.SKU)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: product.ProductId,
                        fieldName: "SKU",
                        oldValue: oldSKU ?? string.Empty,
                        newValue: product.SKU ?? string.Empty,
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldPrice != product.Price)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: product.ProductId,
                        fieldName: "Price",
                        oldValue: oldPrice.ToString(),
                        newValue: product.Price.ToString(),
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }

                if (oldStockQuantity != product.StockQuantity)
                {
                    await _auditService.LogFieldChangeAsync(
                        entityTypeId: entityType.EntityTypeId,
                        entityId: product.ProductId,
                        fieldName: "StockQuantity",
                        oldValue: oldStockQuantity.ToString(),
                        newValue: product.StockQuantity.ToString(),
                        actionTypeName: "Update",
                        changedById: _currentUser.UserId.Value);
                }
            }
        }

        await _db.Entry(product).Reference(p => p.ProductCategory).LoadAsync();
        await _db.Entry(product).Reference(p => p.ProductStatus).LoadAsync();

        return Ok(product);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product == null)
            return NotFound(new { message = "Product not found." });

        // Log deletion audit
        if (_currentUser.UserId is not null)
        {
            var entityType = await _db.EntityTypes.FirstOrDefaultAsync(e => e.Name == "Product");
            if (entityType is not null)
            {
                await _auditService.LogDeletionAsync(entityType.EntityTypeId, product.ProductId, _currentUser.UserId.Value);
            }
        }

        _db.Products.Remove(product);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}

public class CreateProductRequest
{
    public string Name { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public string? Description { get; set; }
    public int? ProductCategoryId { get; set; }
    public int ProductStatusId { get; set; }
    public decimal Price { get; set; }
    public decimal? Cost { get; set; }
    public int StockQuantity { get; set; }
}

public class UpdateProductRequest
{
    public string Name { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public string? Description { get; set; }
    public int? ProductCategoryId { get; set; }
    public int ProductStatusId { get; set; }
    public decimal Price { get; set; }
    public decimal? Cost { get; set; }
    public int StockQuantity { get; set; }
}
