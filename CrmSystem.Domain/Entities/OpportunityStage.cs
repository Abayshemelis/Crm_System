namespace CrmSystem.Domain.Entities;

public class OpportunityStage
{
    public int OpportunityStageId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. New, Qualified, Proposal, Negotiation, Won, Lost
    public int SortOrder { get; set; }
    public bool IsWon { get; set; } = false;
    public bool IsLost { get; set; } = false;
    public int? PipelineId { get; set; } // Reserved for future pipeline support
}
