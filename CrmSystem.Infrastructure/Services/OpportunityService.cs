using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CrmSystem.Domain.Dtos.Opportunity;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CrmSystem.Infrastructure.Services
{
    public class OpportunityService : IOpportunityService
    {
        private readonly AppDbContext _context;

        public OpportunityService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<OpportunityReadDto> CreateAsync(OpportunityCreateDto dto)
        {
            var opportunity = new Opportunity
            {
                Name = dto.Name,
                Amount = dto.Amount,
                Currency = dto.Currency,
                CloseDate = dto.CloseDate,
                Stage = dto.Stage,
                AccountId = dto.AccountId,
                ContactId = dto.ContactId
            };

            _context.Opportunities.Add(opportunity);
            await _context.SaveChangesAsync();

            return MapToReadDto(opportunity);
        }

        public async Task<OpportunityReadDto?> GetByIdAsync(int id)
        {
            var opp = await _context.Opportunities.FindAsync(id);
            return opp == null ? null : MapToReadDto(opp);
        }

        public async Task<IReadOnlyList<OpportunityReadDto>> GetAllAsync()
        {
            var list = await _context.Opportunities.ToListAsync();
            return list.Select(MapToReadDto).ToList();
        }

        public async Task<bool> UpdateAsync(int id, OpportunityUpdateDto dto)
        {
            var opp = await _context.Opportunities.FindAsync(id);
            if (opp == null) return false;

            if (dto.Name != null) opp.Name = dto.Name;
            if (dto.Amount.HasValue) opp.Amount = dto.Amount.Value;
            if (dto.Currency != null) opp.Currency = dto.Currency;
            if (dto.CloseDate.HasValue) opp.CloseDate = dto.CloseDate.Value;
            if (dto.Stage != null) opp.Stage = dto.Stage;
            if (dto.AccountId.HasValue) opp.AccountId = dto.AccountId.Value;
            if (dto.ContactId.HasValue) opp.ContactId = dto.ContactId.Value;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var opp = await _context.Opportunities.FindAsync(id);
            if (opp == null) return false;

            _context.Opportunities.Remove(opp);
            await _context.SaveChangesAsync();
            return true;
        }

        private static OpportunityReadDto MapToReadDto(Opportunity opp) => new()
        {
            Id = opp.Id,
            Name = opp.Name,
            Amount = opp.Amount,
            Currency = opp.Currency,
            CloseDate = opp.CloseDate,
            Stage = opp.Stage,
            AccountId = opp.AccountId,
            ContactId = opp.ContactId,
            Probability = opp.Probability
        };
    }
}
