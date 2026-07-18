using System;
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
            // Validate that CustomerId exists and is active
            var customer = await _context.Customers.FindAsync(dto.CustomerId);
            if (customer == null)
            {
                throw new InvalidOperationException(
                    "Selected customer does not exist. Please select an existing customer or convert a lead first.");
            }

            // Create opportunity with validated CustomerId
            var opportunity = new Opportunity
            {
                CustomerId          = dto.CustomerId,
                Title               = dto.Title,
                Description         = dto.Description,
                OpportunityStageId  = dto.OpportunityStageId,
                EstimatedValue      = dto.EstimatedValue,
                ExpectedCloseDate   = dto.ExpectedCloseDate,
                OwnerId             = dto.OwnerId
            };

            _context.Opportunities.Add(opportunity);
            await _context.SaveChangesAsync();

            // Re-fetch with navigation so display fields are populated
            var created = await QueryWithDetails().FirstAsync(o => o.OpportunityId == opportunity.OpportunityId);
            return MapToReadDto(created);
        }

        public async Task<OpportunityReadDto?> GetByIdAsync(int id)
        {
            var opp = await QueryWithDetails().FirstOrDefaultAsync(o => o.OpportunityId == id);
            return opp == null ? null : MapToReadDto(opp);
        }

        public async Task<IReadOnlyList<OpportunityReadDto>> GetAllAsync()
        {
            var list = await QueryWithDetails().ToListAsync();
            return list.Select(MapToReadDto).ToList();
        }

        public async Task<bool> UpdateAsync(int id, OpportunityUpdateDto dto)
        {
            var opp = await _context.Opportunities
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.OpportunityId == id);

            if (opp == null) return false;

            if (dto.Title != null)                    opp.Title               = dto.Title;
            if (dto.Description != null)              opp.Description         = dto.Description;
            if (dto.OpportunityStageId.HasValue)      opp.OpportunityStageId  = dto.OpportunityStageId.Value;
            if (dto.EstimatedValue.HasValue)          opp.EstimatedValue      = dto.EstimatedValue.Value;
            if (dto.ExpectedCloseDate.HasValue)       opp.ExpectedCloseDate   = dto.ExpectedCloseDate.Value;
            if (dto.ActualCloseDate.HasValue)         opp.ActualCloseDate     = dto.ActualCloseDate.Value;
            if (dto.OwnerId.HasValue)                 opp.OwnerId             = dto.OwnerId.Value;

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

        // ── Helpers ──────────────────────────────────────────────────────────

        private IQueryable<Opportunity> QueryWithDetails() =>
            _context.Opportunities
                .Include(o => o.OpportunityStage)
                .Include(o => o.Customer)
                .Include(o => o.Owner);

        private static OpportunityReadDto MapToReadDto(Opportunity opp) => new()
        {
            OpportunityId      = opp.OpportunityId,
            CustomerId         = opp.CustomerId,
            CustomerFirstName  = opp.Customer?.FirstName ?? string.Empty,
            CustomerLastName   = opp.Customer?.LastName ?? string.Empty,
            CustomerEmail      = opp.Customer?.Email ?? string.Empty,
            CustomerPhone      = opp.Customer?.Phone,
            CustomerJobTitle   = opp.Customer?.JobTitle,
            Title              = opp.Title,
            Description        = opp.Description,
            OpportunityStageId = opp.OpportunityStageId,
            StageName          = opp.OpportunityStage?.Name ?? string.Empty,
            EstimatedValue     = opp.EstimatedValue,
            ExpectedCloseDate  = opp.ExpectedCloseDate,
            ActualCloseDate    = opp.ActualCloseDate,
            OwnerId            = opp.OwnerId,
            OwnerName          = opp.Owner?.Name ?? string.Empty,
            CreatedAt          = opp.CreatedAt
        };
    }
}
