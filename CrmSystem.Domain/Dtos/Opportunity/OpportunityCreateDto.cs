using System;

namespace CrmSystem.Domain.Dtos.Opportunity
{
    public class OpportunityCreateDto
    {
        public int CustomerId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Stage { get; set; } = "New";
        public decimal EstimatedValue { get; set; }
        public DateTime? ExpectedCloseDate { get; set; }
        public int OwnerId { get; set; }
    }
}
