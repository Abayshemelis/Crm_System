using System.Threading.Tasks;

namespace CrmSystem.Api.Services
{
    public class LeadAiAnalysisDto
    {
        public int LeadId { get; set; }
        public int AiScore { get; set; } // 0 - 100
        public string ConversionGrade { get; set; } = "Warm"; // Hot, Warm, Cold
        public string Summary { get; set; } = string.Empty;
        public string[] KeyPositiveFactors { get; set; } = new string[0];
        public string[] RiskFactors { get; set; } = new string[0];
        public string RecommendedNextAction { get; set; } = string.Empty;
    }

    public class OpportunityAiPredictionDto
    {
        public int OpportunityId { get; set; }
        public int WinProbability { get; set; } // 0 - 100%
        public string RiskLevel { get; set; } = "Low"; // Low, Medium, High
        public decimal ProjectedValue { get; set; }
        public string AnalysisSummary { get; set; } = string.Empty;
        public string[] Strengths { get; set; } = new string[0];
        public string[] WarningFlags { get; set; } = new string[0];
        public string SuggestedStrategy { get; set; } = string.Empty;
    }

    public interface IAiInsightService
    {
        Task<LeadAiAnalysisDto> AnalyzeLeadAsync(int leadId);
        Task<OpportunityAiPredictionDto> PredictOpportunityWinAsync(int opportunityId);
    }
}
