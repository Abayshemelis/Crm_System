using System;
using System.Collections.Generic;

namespace CrmSystem.Domain.Entities;

public class Company
{
    public int CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Industry { get; set; }
    public string? CompanySize { get; set; } // e.g. 1-10, 11-50, 51-200, etc.
    public string? Website { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }

    public int? SourceId { get; set; }
    public Source? Source { get; set; }

    public int? AssignedRepId { get; set; }
    public Identity? AssignedRep { get; set; }

    public bool IsDeleted { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
