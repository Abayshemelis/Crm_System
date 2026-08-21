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
                .ThenInclude(c => c.Company)
            .Include(o => o.Customer)
                .ThenInclude(c => c.Source)
            .Include(o => o.LineItems)
                .ThenInclude(li => li.Product)
            .FirstOrDefaultAsync(o => o.OpportunityId == opportunityId);

        if (opp == null)
        {
            throw new KeyNotFoundException($"Opportunity #{opportunityId} not found.");
        }

        // 1. Fetch all pipeline stages for dynamic progression calculation
        var allStages = await _db.OpportunityStages
            .OrderBy(s => s.SortOrder)
            .ToListAsync();

        // 2. Fetch logged communications and activities
        var activities = await _db.Activities
            .Include(a => a.ActivityType)
            .Where(a => a.OpportunityId == opportunityId || (opp.CustomerId > 0 && a.CustomerId == opp.CustomerId))
            .OrderByDescending(a => a.ActivityDate)
            .ToListAsync();

        // 3. Fetch linked tasks
        var tasks = await _db.CrmTasks
            .Include(t => t.CrmTaskStatus)
            .Where(t => t.OpportunityId == opportunityId || (opp.CustomerId > 0 && t.CustomerId == opp.CustomerId))
            .ToListAsync();

        var strengths = new List<string>();
        var warnings = new List<string>();

        // ── Stage Baseline & Progression ──────────────────────────────────────────
        int baseProb = 40;
        bool isTerminalStage = false;

        if (opp.OpportunityStage != null)
        {
            if (opp.OpportunityStage.IsWon)
            {
                baseProb = 100;
                isTerminalStage = true;
                strengths.Add($"Deal successfully finalized as Won ({opp.OpportunityStage.Name})");
            }
            else if (opp.OpportunityStage.IsLost)
            {
                baseProb = 0;
                isTerminalStage = true;
                warnings.Add($"Deal marked as Lost ({opp.OpportunityStage.Name})");
            }
            else
            {
                var openStages = allStages.Where(s => !s.IsWon && !s.IsLost).ToList();
                int stageIdx = openStages.FindIndex(s => s.OpportunityStageId == opp.OpportunityStageId);
                if (stageIdx >= 0 && openStages.Count > 0)
                {
                    double progressRatio = (stageIdx + 1.0) / openStages.Count;
                    baseProb = (int)Math.Round(20.0 + (progressRatio * 65.0));
                    strengths.Add($"Pipeline stage: '{opp.OpportunityStage.Name}' (Stage {stageIdx + 1} of {openStages.Count}, {baseProb}% baseline)");
                }
                else
                {
                    baseProb = 40;
                    strengths.Add($"Pipeline stage: '{opp.OpportunityStage.Name}' ({baseProb}% baseline)");
                }
            }
        }

        int score = baseProb;

        if (!isTerminalStage)
        {
            // ── Line Items & Quoted Scope ─────────────────────────────────────────
            int lineItemCount = opp.LineItems?.Count ?? 0;
            decimal quotedSum = opp.LineItems?.Sum(li => li.TotalPrice) ?? 0m;

            if (lineItemCount > 0)
            {
                if (opp.EstimatedValue > 0 && Math.Abs(quotedSum - opp.EstimatedValue) <= (opp.EstimatedValue * 0.15m))
                {
                    score += 12;
                    strengths.Add($"Itemized quote with {lineItemCount} product(s) ({quotedSum:C0}) closely aligns with estimated value");
                }
                else
                {
                    score += 8;
                    strengths.Add($"Formal product quote attached ({lineItemCount} line item{(lineItemCount > 1 ? "s" : "")}, {quotedSum:C0})");
                }
            }
            else
            {
                score -= 8;
                warnings.Add("No formal product line items or itemized quote attached yet");
            }

            // ── Customer Touchpoints & Communications (Activities) ────────────────
            int totalActs = activities.Count;
            int calls = activities.Count(a => a.ActivityType != null && a.ActivityType.Name.Contains("Call", StringComparison.OrdinalIgnoreCase));
            int meetings = activities.Count(a => a.ActivityType != null && a.ActivityType.Name.Contains("Meeting", StringComparison.OrdinalIgnoreCase));
            int emails = activities.Count(a => a.ActivityType != null && a.ActivityType.Name.Contains("Email", StringComparison.OrdinalIgnoreCase));

            if (totalActs >= 5)
            {
                score += 15;
                strengths.Add($"High touchpoint velocity: {totalActs} logged interaction(s) ({meetings} meeting(s), {calls} call(s), {emails} email(s))");
            }
            else if (totalActs >= 2)
            {
                score += 8;
                strengths.Add($"Active client engagement: {totalActs} recorded interaction(s)");
            }
            else if (totalActs == 1)
            {
                score += 3;
                strengths.Add($"Initial touchpoint recorded ({activities[0].ActivityType?.Name ?? "Activity"})");
            }
            else
            {
                score -= 14;
                warnings.Add("Zero logged customer communications (calls, meetings, or emails)");
            }

            // ── Recency & Momentum ────────────────────────────────────────────────
            DateTime lastTouchpoint = activities.Count > 0
                ? activities.Max(a => a.ActivityDate)
                : (opp.UpdatedAt ?? opp.CreatedAt);

            double idleDays = Math.Max(0, (DateTime.UtcNow - lastTouchpoint).TotalDays);
            if (idleDays <= 3)
            {
                score += 8;
                strengths.Add($"High recency: Last interaction was {Math.Max(1, Math.Round(idleDays))} day(s) ago");
            }
            else if (idleDays <= 7)
            {
                score += 4;
                strengths.Add("Recent communication logged within the past week");
            }
            else if (idleDays > 30)
            {
                score -= 20;
                warnings.Add($"Stalled deal alert: {Math.Round(idleDays)} days since last customer touchpoint");
            }
            else if (idleDays > 14)
            {
                score -= 10;
                warnings.Add($"Cooling momentum: No interactions in the last {Math.Round(idleDays)} days");
            }

            // ── Expected Close Date Health ────────────────────────────────────────
            if (opp.ExpectedCloseDate.HasValue)
            {
                double daysUntilClose = (opp.ExpectedCloseDate.Value.Date - DateTime.UtcNow.Date).TotalDays;
                if (daysUntilClose < -14)
                {
                    score -= 16;
                    warnings.Add($"Target close date ({opp.ExpectedCloseDate.Value:MMM dd, yyyy}) is {Math.Abs(Math.Round(daysUntilClose))} days overdue");
                }
                else if (daysUntilClose < 0)
                {
                    score -= 8;
                    warnings.Add($"Expected close date passed {Math.Abs(Math.Round(daysUntilClose))} day(s) ago");
                }
                else if (daysUntilClose >= 0 && daysUntilClose <= 30)
                {
                    score += 6;
                    strengths.Add($"Target closing window is active ({opp.ExpectedCloseDate.Value:MMM dd, yyyy})");
                }
                else if (daysUntilClose > 120)
                {
                    score -= 4;
                    warnings.Add($"Long sales cycle: Expected close date is {Math.Round(daysUntilClose)} days out");
                }
            }
            else
            {
                score -= 4;
                warnings.Add("Target expected close date has not been set");
            }

            // ── Account & Decision-Maker Authority ────────────────────────────────
            var cust = opp.Customer;
            if (cust != null)
            {
                var title = cust.JobTitle?.Trim() ?? string.Empty;
                var executiveKeywords = new[] { "ceo", "cto", "cfo", "director", "vp", "president", "founder", "head", "manager", "partner", "owner", "chief" };
                bool isExec = executiveKeywords.Any(k => title.Contains(k, StringComparison.OrdinalIgnoreCase));

                if (isExec)
                {
                    score += 6;
                    strengths.Add($"Direct engagement with key decision-maker role: {title}");
                }
                else if (string.IsNullOrWhiteSpace(title))
                {
                    score -= 3;
                    warnings.Add("Primary contact job title / buying authority is unassigned");
                }

                if (cust.Company != null)
                {
                    score += 5;
                    var companyInfo = cust.Company.Name;
                    if (!string.IsNullOrWhiteSpace(cust.Company.Industry)) companyInfo += $" ({cust.Company.Industry})";
                    strengths.Add($"Verified company account: {companyInfo}");
                }
            }

            // ── Action Items & Tasks ──────────────────────────────────────────────
            if (tasks.Count > 0)
            {
                int overdueTasks = tasks.Count(t => (t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal) && t.DueDate.HasValue && t.DueDate.Value < DateTime.UtcNow);
                int openTasks = tasks.Count(t => t.CrmTaskStatus == null || !t.CrmTaskStatus.IsTerminal);

                if (overdueTasks > 0)
                {
                    score -= 6;
                    warnings.Add($"{overdueTasks} overdue follow-up task(s) require action");
                }
                else if (openTasks > 0)
                {
                    score += 3;
                    strengths.Add($"{openTasks} scheduled follow-up task(s) in progress");
                }
            }

            // Clamp win probability
            score = Math.Clamp(score, 5, 98);
        }

        string riskLevel = score >= 70 ? "Low" : score >= 45 ? "Medium" : "High";

        // Dynamic strategy generation
        string strategy = score >= 70
            ? "Finalize decision-maker sign-off, prepare contract/invoice, and schedule final onboarding date."
            : score >= 45
            ? "Schedule a dedicated stakeholder review to address warning flags and lock in pricing."
            : "Re-engage executive sponsor with a revised value proposal or push target close date to rebuild pipeline velocity.";

        if (warnings.Any(w => w.Contains("overdue", StringComparison.OrdinalIgnoreCase)))
        {
            strategy = "Update overdue target close date and immediately re-engage customer with a fresh proposal checkpoint.";
        }
        else if (warnings.Any(w => w.Contains("Zero logged", StringComparison.OrdinalIgnoreCase)))
        {
            strategy = "Schedule an initial discovery demo or phone call to establish engagement and qualify requirements.";
        }

        string analysisSummary = $"Dynamic AI Predictive Revenue Engine evaluated '{opp.Title}' with a calculated win probability of {score}%.";

        bool isGeminiPowered = false;

        // ── Google Gemini LLM Integration (When API Key is Configured) ─────────────
        if (_geminiService.IsConfigured && !isTerminalStage)
        {
            try
            {
                var promptBuilder = new System.Text.StringBuilder();
                promptBuilder.AppendLine("You are a CRM Revenue Intelligence AI. Analyze this active sales opportunity and provide a 2-sentence executive summary and 1 prioritized tactical closing strategy for the sales rep.");
                promptBuilder.AppendLine($"- Deal Title: {opp.Title}");
                promptBuilder.AppendLine($"- Current Stage: {opp.OpportunityStage?.Name ?? "Open"}");
                promptBuilder.AppendLine($"- Estimated Value: {opp.EstimatedValue:C0}");
                promptBuilder.AppendLine($"- Expected Close Date: {(opp.ExpectedCloseDate.HasValue ? opp.ExpectedCloseDate.Value.ToString("yyyy-MM-dd") : "Not set")}");
                promptBuilder.AppendLine($"- Primary Contact: {opp.Customer?.FirstName} {opp.Customer?.LastName} ({opp.Customer?.JobTitle ?? "Role not set"})");
                promptBuilder.AppendLine($"- Company: {opp.Customer?.Company?.Name ?? "Individual"} (Industry: {opp.Customer?.Company?.Industry ?? "General"}, Size: {opp.Customer?.Company?.CompanySize ?? "N/A"})");
                promptBuilder.AppendLine($"- Logged Touchpoints: {activities.Count} total ({activities.Count(a => a.ActivityType?.Name.Contains("Meeting") == true)} meetings, {activities.Count(a => a.ActivityType?.Name.Contains("Call") == true)} calls, {activities.Count(a => a.ActivityType?.Name.Contains("Email") == true)} emails)");
                promptBuilder.AppendLine($"- Quoted Line Items: {opp.LineItems.Count} item(s) total ({opp.LineItems.Sum(li => li.TotalPrice):C0})");
                promptBuilder.AppendLine($"- Algorithmic Win Probability: {score}% ({riskLevel} Risk)");
                promptBuilder.AppendLine();
                promptBuilder.AppendLine("Format your output exactly as:");
                promptBuilder.AppendLine("Summary: [2-sentence concise summary]");
                promptBuilder.AppendLine("Strategy: [1 actionable closing tactic]");

                var geminiResponse = await _geminiService.GenerateTextAsync(promptBuilder.ToString());
                if (!string.IsNullOrWhiteSpace(geminiResponse))
                {
                    var lines = geminiResponse.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    foreach (var line in lines)
                    {
                        if (line.StartsWith("Summary:", StringComparison.OrdinalIgnoreCase))
                        {
                            analysisSummary = line.Substring("Summary:".Length).Trim();
                            isGeminiPowered = true;
                        }
                        else if (line.StartsWith("Strategy:", StringComparison.OrdinalIgnoreCase))
                        {
                            strategy = line.Substring("Strategy:".Length).Trim();
                            isGeminiPowered = true;
                        }
                    }
                }
            }
            catch
            {
                // Fallback seamlessly to dynamic algorithmic analysis
            }
        }

        return new OpportunityAiPredictionDto
        {
            OpportunityId = opp.OpportunityId,
            WinProbability = score,
            RiskLevel = riskLevel,
            ProjectedValue = opp.EstimatedValue * (score / 100m),
            AnalysisSummary = analysisSummary,
            Strengths = strengths.ToArray(),
            WarningFlags = warnings.ToArray(),
            SuggestedStrategy = strategy,
            IsGeminiPowered = isGeminiPowered || _geminiService.IsConfigured
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
