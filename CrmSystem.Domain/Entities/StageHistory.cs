using System;

namespace CrmSystem.Domain.Entities;

public class StageHistory
{
    public int StageHistoryId { get; set; }
    public int OpportunityId { get; set; }
    public Opportunity? Opportunity { get; set; }

    public int? OldStageId { get; set; }
    public OpportunityStage? OldStage { get; set; }

    public int NewStageId { get; set; }
    public OpportunityStage? NewStage { get; set; }

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    public int ChangedById { get; set; }
    public Identity? ChangedBy { get; set; }
}
