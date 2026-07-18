using System;

namespace CrmSystem.Domain.Dtos.Opportunity
{
    public class OpportunityReadDto
    {
        public int OpportunityId { get; set; }
        public int CustomerId { get; set; }
        public string CustomerFirstName { get; set; } = string.Empty;
        public string CustomerLastName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string? CustomerPhone { get; set; }
        public string? CustomerJobTitle { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int OpportunityStageId { get; set; }
        public string StageName { get; set; } = string.Empty;
        public decimal EstimatedValue { get; set; }
        public DateTime? ExpectedCloseDate { get; set; }
        public DateTime? ActualCloseDate { get; set; }
        public int OwnerId { get; set; }
        public string OwnerName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
