using System.Collections.Generic;
using System.Threading.Tasks;
using CrmSystem.Domain.Dtos.Opportunity;
using CrmSystem.Domain.Entities;

namespace CrmSystem.Infrastructure.Services
{
    public interface IOpportunityService
    {
        Task<OpportunityReadDto> CreateAsync(OpportunityCreateDto dto);
        Task<OpportunityReadDto?> GetByIdAsync(int id);
        Task<IReadOnlyList<OpportunityReadDto>> GetAllAsync();
        Task<bool> UpdateAsync(int id, OpportunityUpdateDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
