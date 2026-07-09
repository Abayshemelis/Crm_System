namespace CrmSystem.Domain.Entities;

public class Source
{
    public int SourceId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. Referral, Website, Cold Call
    public bool IsActive { get; set; } = true;
}
