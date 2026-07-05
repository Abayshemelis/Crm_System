using System;

namespace CrmSystem.Domain.Dtos.Opportunity
{
    public class OpportunityCreateDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
        public DateTime CloseDate { get; set; }
        public string Stage { get; set; } = "Prospecting";
        public int? AccountId { get; set; }
        public int? ContactId { get; set; }
        public int Probability { get; set; }
    }
}
