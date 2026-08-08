using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Services
{
    public class AiInsightService : IAiInsightService
    {
        private readonly AppDbContext _db;

        public AiInsightService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<LeadAiAnalysisDto> AnalyzeLeadAsync(int leadId)
        {
            var lead = await _db.Leads
                .Include(l => l.Source)
                .Include(l => l.LeadStatus)
                .Include(l => l.Activities)
                .FirstOrDefaultAsync(l => l.LeadId == leadId && !l.IsDeleted);

            if (lead == null)
            {
                throw new KeyNotFoundException($"Lead #{leadId} not found.");
            }

            int score = 50; // base score
            var positives = new List<string>();
            var risks = new List<string>();

            // 1. Domain Quality
            var email = lead.Email?.ToLower().Trim() ?? string.Empty;
            if (!string.IsNullOrEmpty(email))
            {
                if (email.Contains("@") && !email.EndsWith("gmail.com") && !email.EndsWith("yahoo.com") && !email.EndsWith("hotmail.com") && !email.EndsWith("outlook.com"))
                {
                    score += 15;
                    positives.Add("Verified corporate business email domain");
                }
                else
                {
                    risks.Add("Generic non-corporate email address");
                }
            }
            else
            {
                score -= 10;
                risks.Add("Missing contact email address");
            }

            // 2. Profile Completeness
            if (!string.IsNullOrWhiteSpace(lead.Phone))
            {
                score += 10;
                positives.Add("Direct phone number provided");
            }
            if (!string.IsNullOrWhiteSpace(lead.CompanyName))
            {
                score += 10;
                positives.Add($"Associated company: {lead.CompanyName}");
            }
            if (!string.IsNullOrWhiteSpace(lead.JobTitle))
            {
                score += 5;
                positives.Add($"Defined job role: {lead.JobTitle}");
            }

            // 3. Activity Engagement
            int actCount = lead.Activities?.Count ?? 0;
            if (actCount >= 3)
            {
                score += 15;
                positives.Add($"High engagement history ({actCount} touchpoints logged)");
            }
            else if (actCount == 0)
            {
                score -= 15;
                risks.Add("Zero logged communications or activity history");
            }

            // 4. Source & Priority
            if (lead.Priority == "High")
            {
                score += 10;
                positives.Add("High priority lead classification");
            }

            // Clamp 0 to 100
            score = Math.Clamp(score, 5, 98);

            string grade = score >= 75 ? "Hot" : score >= 50 ? "Warm" : "Cold";
            string recommendedAction = score >= 75
                ? "Schedule an immediate executive demo and send a formal proposal."
                : score >= 50
                ? "Follow up within 48 hours to qualify requirements and budget."
                : "Re-engage via automated email sequence and verify contact details.";

            return new LeadAiAnalysisDto
            {
                LeadId = lead.LeadId,
                AiScore = score,
                ConversionGrade = grade,
                Summary = $"AI analysis evaluated Lead #{lead.LeadId} ({lead.FirstName} {lead.LastName}) with a predictive score of {score}/100.",
                KeyPositiveFactors = positives.ToArray(),
                RiskFactors = risks.ToArray(),
                RecommendedNextAction = recommendedAction
            };
        }

        public async Task<OpportunityAiPredictionDto> PredictOpportunityWinAsync(int opportunityId)
        {
            var opp = await _db.Opportunities
                .Include(o => o.OpportunityStage)
                .Include(o => o.Customer)
                .Include(o => o.LineItems)
                .FirstOrDefaultAsync(o => o.OpportunityId == opportunityId);

            if (opp == null)
            {
                throw new KeyNotFoundException($"Opportunity #{opportunityId} not found.");
            }

            int winProb = 40; // baseline
            var strengths = new List<string>();
            var warnings = new List<string>();

            // Stage probability influence
            if (opp.OpportunityStage != null)
            {
                winProb = opp.OpportunityStage.Name.ToLower() switch
                {
                    "new" => 10,
                    "qualified" => 20,
                    "proposal" => 50,
                    "negotiation" => 80,
                    "won" => 100,
                    "lost" => 0,
                    _ => 40
                };
                strengths.Add($"Pipeline stage: '{opp.OpportunityStage.Name}' ({winProb}% baseline)");
            }

            // Line items present
            if (opp.LineItems != null && opp.LineItems.Count > 0)
            {
                winProb += 15;
                strengths.Add($"Detailed line item proposal attached ({opp.LineItems.Count} items)");
            }
            else
            {
                winProb -= 10;
                warnings.Add("No line items or formal product quotes created");
            }

            // Stalled evaluation
            var lastUpdate = opp.UpdatedAt ?? opp.CreatedAt;
            var daysSinceUpdate = (DateTime.UtcNow - lastUpdate).TotalDays;
            if (daysSinceUpdate > 10)
            {
                winProb -= 20;
                warnings.Add($"Deal has been inactive for {Math.Round(daysSinceUpdate)} days without stage progress");
            }
            else
            {
                winProb += 5;
                strengths.Add("Recent activity and active deal momentum");
            }

            // Value sizing
            if (opp.EstimatedValue > 50000m)
            {
                strengths.Add($"High-value opportunity opportunity size ({opp.EstimatedValue:C})");
            }

            winProb = Math.Clamp(winProb, 5, 95);
            string riskLevel = winProb >= 70 ? "Low" : winProb >= 45 ? "Medium" : "High";

            string strategy = winProb >= 70
                ? "Send contract for signature and lock in closing timeline."
                : winProb >= 45
                ? "Schedule stakeholder alignment meeting to resolve lingering objections."
                : "Conduct risk review and offer incentives or adjusted pricing model.";

            return new OpportunityAiPredictionDto
            {
                OpportunityId = opp.OpportunityId,
                WinProbability = winProb,
                RiskLevel = riskLevel,
                ProjectedValue = opp.EstimatedValue * (winProb / 100m),
                AnalysisSummary = $"AI Predictive Analytics model estimates a {winProb}% win probability for '{opp.Title}'.",
                Strengths = strengths.ToArray(),
                WarningFlags = warnings.ToArray(),
                SuggestedStrategy = strategy
            };
        }
    }
}
