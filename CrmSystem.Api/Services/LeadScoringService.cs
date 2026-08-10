using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Api.Services;

public class LeadScoringService : ILeadScoringService
{
    private readonly AppDbContext _context;

    public LeadScoringService(AppDbContext context)
    {
        _context = context;
    }

    public LeadScoreResultDto CalculateScore(Lead lead)
    {
        var score = 0;
        var factors = new List<string>();

        // 1. Baseline Contact Profile Completeness (Up to +10 points total)
        if (!string.IsNullOrWhiteSpace(lead.Email))
        {
            score += 5;
            factors.Add("+5 Direct Email provided");
        }
        if (!string.IsNullOrWhiteSpace(lead.Phone))
        {
            score += 5;
            factors.Add("+5 Phone Number provided");
        }

        // 2. Company & Job Title (Up to +10 points)
        if (!string.IsNullOrWhiteSpace(lead.CompanyName))
        {
            score += 5;
            factors.Add("+5 Corporate Organization specified");
        }
        if (!string.IsNullOrWhiteSpace(lead.JobTitle))
        {
            score += 5;
            factors.Add("+5 Job Position identified");
        }

        // 3. Lead Source Quality (+5 to +20 points)
        var sourceName = lead.Source?.Name?.ToLowerInvariant() ?? "";
        if (sourceName.Contains("referral"))
        {
            score += 20;
            factors.Add("+20 Client Referral Source");
        }
        else if (sourceName.Contains("web") || sourceName.Contains("website") || sourceName.Contains("inbound"))
        {
            score += 15;
            factors.Add("+15 Inbound Web Inquiry");
        }
        else if (sourceName.Contains("event") || sourceName.Contains("trade"))
        {
            score += 10;
            factors.Add("+10 Event / Trade Show Lead");
        }
        else
        {
            score += 5;
            factors.Add("+5 Standard Lead Source");
        }

        // 4. Rep Qualification & Status Progression (+15 to +30 points)
        var statusName = lead.LeadStatus?.Name?.ToLowerInvariant() ?? "";
        if (statusName.Contains("qualified"))
        {
            score += 30;
            factors.Add("+30 Verified Sales Qualified Lead");
        }
        else if (statusName.Contains("contacted") || statusName.Contains("progress") || statusName.Contains("working"))
        {
            score += 15;
            factors.Add("+15 Active Contact in Progress");
        }
        else if (statusName.Contains("unqualified") || statusName.Contains("lost") || statusName.Contains("disqualified"))
        {
            score = 0;
            factors.Add("0 Disqualified / Lost Status override");
        }

        // 5. Priority Factor (+5 to +15 points)
        if (string.Equals(lead.Priority, "High", StringComparison.OrdinalIgnoreCase) || string.Equals(lead.Priority, "Urgent", StringComparison.OrdinalIgnoreCase))
        {
            score += 15;
            factors.Add("+15 High Priority Flag");
        }
        else if (string.Equals(lead.Priority, "Medium", StringComparison.OrdinalIgnoreCase))
        {
            score += 5;
            factors.Add("+5 Medium Priority Flag");
        }

        // 6. Activity Engagement Velocity (+15 per activity, max +45 points)
        var activityCount = lead.Activities?.Count ?? 0;
        if (activityCount > 0)
        {
            var activityPoints = Math.Min(activityCount * 15, 45);
            score += activityPoints;
            factors.Add($"+{activityPoints} Active Engagement Velocity ({activityCount} logged communications/demos)");
        }

        // 7. SLA Recency & Inactivity Penalty
        var lastTouch = lead.LastActivityAt ?? lead.CreatedAt;
        var daysInactive = (int)(DateTime.UtcNow - lastTouch).TotalDays;

        string slaStatus;
        if (daysInactive <= 3)
        {
            slaStatus = "OnTrack";
            score += 10;
            factors.Add("+10 Recent Activity (within 3 days)");
        }
        else if (daysInactive <= 7)
        {
            slaStatus = "Warning";
            score -= 10;
            factors.Add("-10 SLA Warning (Inactive for 4-7 days)");
        }
        else
        {
            slaStatus = "Breached";
            var penalty = Math.Min((daysInactive - 7) * 5, 40);
            score -= (20 + penalty);
            factors.Add($"-{20 + penalty} SLA Breached (Inactive for {daysInactive} days)");
        }

        // Bound final score between 0 and 100
        score = Math.Clamp(score, 0, 100);

        string rating;
        if (score >= 70) rating = "Hot";
        else if (score >= 40) rating = "Warm";
        else rating = "Cold";

        return new LeadScoreResultDto
        {
            Score = score,
            Rating = rating,
            SlaStatus = slaStatus,
            DaysInactive = Math.Max(0, daysInactive),
            ScoreFactors = factors
        };
    }

    public async Task<LeadScoreResultDto> CalculateAndApplyScoreAsync(int leadId, CancellationToken cancellationToken = default)
    {
        var lead = await _context.Leads
            .Include(l => l.Source)
            .Include(l => l.LeadStatus)
            .Include(l => l.Activities)
            .FirstOrDefaultAsync(l => l.LeadId == leadId, cancellationToken);

        if (lead == null)
            return new LeadScoreResultDto();

        var result = CalculateScore(lead);
        if (lead.IsManualScore)
        {
            result.Score = lead.LeadScore;
            result.Rating = lead.LeadScore >= 70 ? "Hot" : lead.LeadScore >= 40 ? "Warm" : "Cold";
        }
        else if (lead.LeadScore != result.Score)
        {
            lead.LeadScore = result.Score;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return result;
    }
}
