using System.Collections.Generic;
using System.Threading.Tasks;
using CrmSystem.Domain.Dtos.Opportunity;

namespace CrmSystem.Infrastructure.Services
{
    public interface IOpportunityService
    {
        Task<OpportunityReadDto> CreateAsync(OpportunityCreateDto dto);
        Task<OpportunityReadDto?> GetByIdAsync(int id);
        Task<IReadOnlyList<OpportunityReadDto>> GetAllAsync(
            int? customerId = null,
            int? companyId = null,
            int? ownerId = null,
            int? opportunityStageId = null,
            DateTime? expectedCloseDateFrom = null,
            DateTime? expectedCloseDateTo = null,
            DateTime? createdDateFrom = null,
            DateTime? createdDateTo = null,
            decimal? minValue = null,
            decimal? maxValue = null,
            DateTime? lastActivityFrom = null,
            DateTime? lastActivityTo = null,
            int? sourceId = null);
        Task<bool> UpdateAsync(int id, OpportunityUpdateDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
