using System;

namespace CrmSystem.Domain.Entities;

public class Product
{
    public int ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public string? Description { get; set; }

    public int? ProductCategoryId { get; set; }
    public ProductCategory? ProductCategory { get; set; }

    public int ProductStatusId { get; set; }
    public ProductStatus? ProductStatus { get; set; }

    public decimal Price { get; set; }
    public decimal? Cost { get; set; }
    public int StockQuantity { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
