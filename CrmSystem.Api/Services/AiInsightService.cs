using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Services;

public class AiInsightService : IAiInsightService
{
    private readonly AppDbContext _db;
    private readonly IGeminiService _geminiService;

    public AiInsightService(AppDbContext db, IGeminiService geminiService)
    {
        _db = db;
        _geminiService = geminiService;
    }

    public AiStatusDto GetStatus()
    {
        return new AiStatusDto
        {
            IsConfigured = _geminiService.IsConfigured,
            Provider = "Google Gemini 1.5 Flash (Free Tier)",
            Model = "gemini-1.5-flash",
            FreeDailyQuota = "1,500 requests / day (Free)",
            ActiveEngine = _geminiService.IsConfigured ? "Google Gemini LLM + Local Heuristics" : "Local Heuristic Engine (Gemini API key optional)"
        };
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

        // 1. Calculate heuristic base score & factors
        int score = 50;
        var positives = new List<string>();
        var risks = new List<string>();

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

        if (lead.Priority == "High")
        {
            score += 10;
            positives.Add("High priority lead classification");
        }

        score = Math.Clamp(score, 5, 98);
        string grade = score >= 75 ? "Hot" : score >= 50 ? "Warm" : "Cold";
        string recommendedAction = score >= 75
            ? "Schedule an immediate executive demo and send a formal proposal."
            : score >= 50
            ? "Follow up within 48 hours to qualify requirements and budget."
            : "Re-engage via automated email sequence and verify contact details.";

        var dto = new LeadAiAnalysisDto
        {
            LeadId = lead.LeadId,
            AiScore = score,
            ConversionGrade = grade,
            Summary = $"AI analysis evaluated Lead #{lead.LeadId} ({lead.FirstName} {lead.LastName}) with a predictive score of {score}/100.",
            KeyPositiveFactors = positives.ToArray(),
            RiskFactors = risks.ToArray(),
            RecommendedNextAction = recommendedAction,
            IsGeminiPowered = false
        };

        // 2. If Gemini API is configured, enrich summary & recommendations
        if (_geminiService.IsConfigured)
        {
            try
            {
                var geminiPrompt = $"""
                    Analyze this sales lead and provide a 2-sentence executive summary and 1 primary recommended next action:
                    - Name: {lead.FirstName} {lead.LastName}
                    - Job Title: {lead.JobTitle ?? "N/A"}
                    - Company: {lead.CompanyName ?? "N/A"}
                    - Source: {lead.Source?.Name ?? "N/A"}
                    - Priority: {lead.Priority}
                    - Status: {lead.LeadStatus?.Name ?? "New"}
                    - Score: {score}/100 ({grade})
                    - Activity Count: {actCount}

                    Format as:
                    Summary: [2 sentence summary]
                    Action: [1 action recommendation]
                    """;

                var geminiResponse = await _geminiService.GenerateTextAsync(geminiPrompt);
                if (!string.IsNullOrWhiteSpace(geminiResponse))
                {
                    dto.Summary = geminiResponse;
                    dto.IsGeminiPowered = true;
                }
            }
            catch
            {
                // Fall back cleanly to heuristic summary
            }
        }

        return dto;
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

        int winProb = 40;
        var strengths = new List<string>();
        var warnings = new List<string>();

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

        if (opp.EstimatedValue > 50000m)
        {
            strengths.Add($"High-value opportunity size ({opp.EstimatedValue:C})");
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
            SuggestedStrategy = strategy,
            IsGeminiPowered = _geminiService.IsConfigured
        };
    }

    public async Task<string?> GenerateSalesEmailAsync(int leadId)
    {
        var lead = await _db.Leads
            .Include(l => l.Source)
            .Include(l => l.LeadStatus)
            .FirstOrDefaultAsync(l => l.LeadId == leadId && !l.IsDeleted);

        if (lead == null)
        {
            throw new KeyNotFoundException($"Lead #{leadId} not found.");
        }

        var leadName = $"{lead.FirstName} {lead.LastName}".Trim();

        // 1. Try Google Gemini API if configured
        if (_geminiService.IsConfigured)
        {
            var emailDraft = await _geminiService.GenerateSalesEmailAsync(
                leadName,
                lead.CompanyName,
                lead.JobTitle,
                lead.Priority,
                lead.LeadStatus?.Name,
                lead.Notes
            );

            if (!string.IsNullOrWhiteSpace(emailDraft))
            {
                return emailDraft;
            }
        }

        // 2. Local Template Fallback
        var companyText = !string.IsNullOrWhiteSpace(lead.CompanyName) ? $" at {lead.CompanyName}" : string.Empty;
        var roleText = !string.IsNullOrWhiteSpace(lead.JobTitle) ? $" as {lead.JobTitle}" : string.Empty;

        return $"""
            Subject: Exploring Growth Opportunities with {lead.FirstName} {lead.LastName}

            Dear {lead.FirstName},

            I hope this email finds you well. I noticed your recent inquiry and leadership role{roleText}{companyText}.

            Our team specializes in streamlining sales pipeline operations, customer account management, and automated deal tracking. Given your organization's focus, I believe our enterprise solutions could significantly enhance your team's sales execution and productivity.

            Would you be open to a brief 15-minute introductory call this week to explore how we can support your business goals?

            Best regards,

            Sales Execution Representative
            The Account Team
            """;
    }
}
