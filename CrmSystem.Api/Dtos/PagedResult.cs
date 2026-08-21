// ==============================================================================
// CRM SYSTEM DATA TRANSFER OBJECTS: PAGINATION (PagedResult.cs)
// ==============================================================================
// Standardizes pagination metadata across all list endpoints in the CRM API:
// - Data: Slice of records for the requested page
// - Page: Current page index (1-based)
// - PageSize: Number of items per page
// - TotalCount: Total matching records across the entire dataset
// - TotalPages: Calculated total number of pages
// ==============================================================================

namespace CrmSystem.Api.Dtos;

public record PagedResult<T>(
    IReadOnlyList<T> Data,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages)
{
    // Factory method to calculate TotalPages mathematically
    public static PagedResult<T> Create(IReadOnlyList<T> data, int page, int pageSize, int totalCount)
    {
        var totalPages = pageSize > 0
            ? (int)Math.Ceiling(totalCount / (double)pageSize)
            : 0;

        return new PagedResult<T>(data, page, pageSize, totalCount, totalPages);
    }
}

// Base query model with safe bounds normalization (prevents negative pages & DoS from oversized limits)
public class PaginationQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;

    // Normalizes page index to at least 1
    public int NormalizedPage => Math.Max(1, Page);

    // Caps page size between 1 and 100
    public int NormalizedPageSize => Math.Clamp(PageSize, 1, 100);
}
