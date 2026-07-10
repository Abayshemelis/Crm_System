namespace CrmSystem.Domain.Entities;

public class LeadStatus
{
    public int LeadStatusId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. New, Contacted, Qualified, Converted, Lost
    public int SortOrder { get; set; }
    public bool IsTerminal { get; set; } = false; // Converted / Lost are terminal
}