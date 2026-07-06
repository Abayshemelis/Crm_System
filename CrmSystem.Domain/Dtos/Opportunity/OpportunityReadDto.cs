using System;

namespace CrmSystem.Domain.Dtos.Opportunity
{
    public class OpportunityReadDto
    {
        public int OpportunityId { get; set; }
        public int CustomerId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Stage { get; set; } = "New";
        public decimal EstimatedValue { get; set; }
        public DateTime? ExpectedCloseDate { get; set; }
        public DateTime? ActualCloseDate { get; set; }
        public int OwnerId { get; set; }
    }
}
