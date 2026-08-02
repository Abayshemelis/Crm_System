using CrmSystem.Domain.Entities;

namespace CrmSystem.Api.Services;

public class LeadScoreResultDto
{
    public int Score { get; set; }
    public string Rating { get; set; } = "Cold"; // Hot, Warm, Cold
    public string SlaStatus { get; set; } = "OnTrack"; // OnTrack, Warning, Breached
    public int DaysInactive { get; set; }
    public List<string> ScoreFactors { get; set; } = new();
}

public interface ILeadScoringService
{
    LeadScoreResultDto CalculateScore(Lead lead);
    Task<LeadScoreResultDto> CalculateAndApplyScoreAsync(int leadId, CancellationToken cancellationToken = default);
}
