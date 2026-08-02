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

        // 1. Contact Information Completeness (Up to +20 points)
        if (!string.IsNullOrWhiteSpace(lead.Email))
        {
            score += 10;
            factors.Add("+10 Direct Email provided");
        }
        if (!string.IsNullOrWhiteSpace(lead.Phone))
        {
            score += 10;
            factors.Add("+10 Phone Number provided");
        }

        // 2. Company & Job Title (+15 points)
        if (!string.IsNullOrWhiteSpace(lead.CompanyName))
        {
            score += 10;
            factors.Add("+10 Corporate Organization specified");
        }
        if (!string.IsNullOrWhiteSpace(lead.JobTitle))
        {
            score += 5;
            factors.Add("+5 Job Position identified");
        }

        // 3. Lead Source Quality (+15 to +30 points)
        var sourceName = lead.Source?.Name?.ToLowerInvariant() ?? "";
        if (sourceName.Contains("web") || sourceName.Contains("website") || sourceName.Contains("inbound"))
        {
            score += 25;
            factors.Add("+25 Inbound Web Inquiry");
        }
        else if (sourceName.Contains("referral"))
        {
            score += 30;
            factors.Add("+30 Client Referral");
        }
        else if (sourceName.Contains("event") || sourceName.Contains("trade"))
        {
            score += 20;
            factors.Add("+20 Event / Trade Show Lead");
        }
        else
        {
            score += 10;
            factors.Add("+10 Standard Lead Source");
        }

        // 4. Priority Factor (+10 to +20 points)
        if (string.Equals(lead.Priority, "High", StringComparison.OrdinalIgnoreCase))
        {
            score += 20;
            factors.Add("+20 High Priority Flag");
        }
        else if (string.Equals(lead.Priority, "Medium", StringComparison.OrdinalIgnoreCase))
        {
            score += 10;
            factors.Add("+10 Medium Priority Flag");
        }

        // 5. Activity Engagement Velocity (+10 per activity, max +30)
        var activityCount = lead.Activities?.Count ?? 0;
        if (activityCount > 0)
        {
            var activityPoints = Math.Min(activityCount * 10, 30);
            score += activityPoints;
            factors.Add($"+{activityPoints} Active Engagement ({activityCount} logged activities)");
        }

        // 6. SLA Recency & Inactivity Penalty
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
        if (lead.LeadScore != result.Score)
        {
            lead.LeadScore = result.Score;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return result;
    }
}
