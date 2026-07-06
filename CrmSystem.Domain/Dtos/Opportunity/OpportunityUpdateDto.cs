using System;

namespace CrmSystem.Domain.Dtos.Opportunity
{
    public class OpportunityUpdateDto
    {
        public string? Title { get; set; }
        public string? Stage { get; set; }
        public decimal? EstimatedValue { get; set; }
        public DateTime? ExpectedCloseDate { get; set; }
        public DateTime? ActualCloseDate { get; set; }
        public int? OwnerId { get; set; }
    }
}
