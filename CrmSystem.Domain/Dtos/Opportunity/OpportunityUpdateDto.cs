using System;

namespace CrmSystem.Domain.Dtos.Opportunity
{
    public class OpportunityUpdateDto
    {
        public string? Name { get; set; }
        public decimal? Amount { get; set; }
        public string? Currency { get; set; }
        public DateTime? CloseDate { get; set; }
        public string? Stage { get; set; }
        public int? AccountId { get; set; }
        public int? ContactId { get; set; }
        public int? Probability { get; set; }
    }
}
