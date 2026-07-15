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
public class OpportunityLineItemsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _auditService;

    public OpportunityLineItemsController(AppDbContext db, ICurrentUserService currentUser, IAuditService auditService)
    {
        _db = db;
        _currentUser = currentUser;
        _auditService = auditService;
    }

    [HttpGet("{opportunityId}")]
    public async Task<ActionResult<IReadOnlyList<OpportunityLineItem>>> GetByOpportunity(int opportunityId)
    {
        var opportunity = await _db.Opportunities.FindAsync(opportunityId);
        if (opportunity == null)
            return NotFound(new { message = "Opportunity not found." });

        if (!_currentUser.CanAccessOwnedRecord(opportunity.OwnerId))
            return Forbid();

        var lineItems = await _db.OpportunityLineItems
            .Include(li => li.Product)
            .ThenInclude(p => p.ProductCategory)
            .Where(li => li.OpportunityId == opportunityId)
            .OrderBy(li => li.LineItemId)
            .ToListAsync();

        return Ok(lineItems);
    }

    [HttpPost]
    public async Task<ActionResult<OpportunityLineItem>> Create([FromBody] CreateLineItemRequest request)
    {
        if (_currentUser.UserId is null)
            return Unauthorized();

        var opportunity = await _db.Opportunities.FindAsync(request.OpportunityId);
        if (opportunity == null)
            return NotFound(new { message = "Opportunity not found." });

        if (!_currentUser.CanAccessOwnedRecord(opportunity.OwnerId))
            return Forbid();

        var product = await _db.Products
            .Include(p => p.ProductStatus)
            .SingleOrDefaultAsync(p => p.ProductId == request.ProductId);
        if (product == null)
            return NotFound(new { message = "Product not found." });

        if (product.ProductStatus == null || !product.ProductStatus.IsSelectable)
            return BadRequest(new { message = "Product is not available for selection." });

        var lineItem = new OpportunityLineItem
        {
            OpportunityId = request.OpportunityId,
            ProductId = request.ProductId,
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            DiscountPercent = request.DiscountPercent
        };

        _db.OpportunityLineItems.Add(lineItem);
        await _db.SaveChangesAsync();

        // Recalculate opportunity estimated value
        await RecalculateEstimatedValueAsync(request.OpportunityId);

        await _db.Entry(lineItem).Reference(li => li.Product).LoadAsync();

        return CreatedAtAction(nameof(GetByOpportunity), new { opportunityId = lineItem.OpportunityId }, lineItem);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<OpportunityLineItem>> Update(int id, [FromBody] UpdateLineItemRequest request)
    {
        var lineItem = await _db.OpportunityLineItems
            .Include(li => li.Opportunity)
            .Include(li => li.Product)
            .SingleOrDefaultAsync(li => li.LineItemId == id);

        if (lineItem == null)
            return NotFound(new { message = "Line item not found." });

        if (!_currentUser.CanAccessOwnedRecord(lineItem.Opportunity.OwnerId))
            return Forbid();

        var product = await _db.Products
            .Include(p => p.ProductStatus)
            .SingleOrDefaultAsync(p => p.ProductId == request.ProductId);
        if (product == null)
            return NotFound(new { message = "Product not found." });

        if (product.ProductStatus == null || !product.ProductStatus.IsSelectable)
            return BadRequest(new { message = "Product is not available for selection." });

        lineItem.ProductId = request.ProductId;
        lineItem.Quantity = request.Quantity;
        lineItem.UnitPrice = request.UnitPrice;
        lineItem.DiscountPercent = request.DiscountPercent;

        await _db.SaveChangesAsync();

        // Recalculate opportunity estimated value
        await RecalculateEstimatedValueAsync(lineItem.OpportunityId);

        await _db.Entry(lineItem).Reference(li => li.Product).LoadAsync();

        return Ok(lineItem);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var lineItem = await _db.OpportunityLineItems
            .Include(li => li.Opportunity)
            .SingleOrDefaultAsync(li => li.LineItemId == id);

        if (lineItem == null)
            return NotFound(new { message = "Line item not found." });

        if (!_currentUser.CanAccessOwnedRecord(lineItem.Opportunity.OwnerId))
            return Forbid();

        var opportunityId = lineItem.OpportunityId;

        _db.OpportunityLineItems.Remove(lineItem);
        await _db.SaveChangesAsync();

        // Recalculate opportunity estimated value
        await RecalculateEstimatedValueAsync(opportunityId);

        return NoContent();
    }

    private async Task RecalculateEstimatedValueAsync(int opportunityId)
    {
        var opportunity = await _db.Opportunities.FindAsync(opportunityId);
        if (opportunity == null)
            return;

        var lineItems = await _db.OpportunityLineItems
            .Where(li => li.OpportunityId == opportunityId)
            .ToListAsync();

        var totalValue = lineItems.Sum(li => li.TotalPrice);
        opportunity.EstimatedValue = totalValue;
        opportunity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }
}

public class CreateLineItemRequest
{
    public int OpportunityId { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; } = 0;
}

public class UpdateLineItemRequest
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
}
