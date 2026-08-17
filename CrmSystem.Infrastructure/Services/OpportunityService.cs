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

        public async Task<IReadOnlyList<OpportunityReadDto>> GetAllAsync(
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
            int? sourceId = null,
            int? currentUserId = null,
            bool isManager = false,
            bool isAdmin = false)
        {
            var query = QueryWithDetails();

            if (currentUserId.HasValue && !isAdmin)
            {
                if (isManager)
                {
                    query = query.Where(o => o.OwnerId == currentUserId.Value || (o.Owner != null && o.Owner.ManagerId == currentUserId.Value));
                }
                else
                {
                    query = query.Where(o => o.OwnerId == currentUserId.Value);
                }
            }

            if (customerId.HasValue)
                query = query.Where(o => o.CustomerId == customerId.Value);

            if (companyId.HasValue)
                query = query.Where(o => o.Customer.CompanyId == companyId.Value);

            if (ownerId.HasValue)
                query = query.Where(o => o.OwnerId == ownerId.Value);

            if (opportunityStageId.HasValue)
                query = query.Where(o => o.OpportunityStageId == opportunityStageId.Value);

            if (expectedCloseDateFrom.HasValue)
                query = query.Where(o => o.ExpectedCloseDate >= expectedCloseDateFrom.Value.Date);

            if (expectedCloseDateTo.HasValue)
            {
                var endOfClose = expectedCloseDateTo.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(o => o.ExpectedCloseDate <= endOfClose);
            }

            if (createdDateFrom.HasValue)
                query = query.Where(o => o.CreatedAt >= createdDateFrom.Value.Date);

            if (createdDateTo.HasValue)
            {
                var endOfCreated = createdDateTo.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(o => o.CreatedAt <= endOfCreated);
            }


            if (minValue.HasValue)
                query = query.Where(o => o.EstimatedValue >= minValue.Value);

            if (maxValue.HasValue)
                query = query.Where(o => o.EstimatedValue <= maxValue.Value);

            if (lastActivityFrom.HasValue)
                query = query.Where(o => o.UpdatedAt >= lastActivityFrom.Value);

            if (lastActivityTo.HasValue)
                query = query.Where(o => o.UpdatedAt <= lastActivityTo.Value);

            if (sourceId.HasValue)
                query = query.Where(o => o.Customer.SourceId == sourceId.Value);

            var list = await query.ToListAsync();
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
            if (dto.OpportunityStageId.HasValue && dto.OpportunityStageId.Value != opp.OpportunityStageId)
            {
                opp.OpportunityStageId = dto.OpportunityStageId.Value;
                var stage = await _context.OpportunityStages.FindAsync(dto.OpportunityStageId.Value);
                if (stage != null && (stage.IsWon || stage.IsLost))
                {
                    opp.ActualCloseDate = DateTime.UtcNow;
                }
                else if (stage != null && !stage.IsWon && !stage.IsLost)
                {
                    opp.ActualCloseDate = null;
                }
            }
            if (dto.EstimatedValue.HasValue)          opp.EstimatedValue      = dto.EstimatedValue.Value;
            if (dto.ExpectedCloseDate.HasValue)       opp.ExpectedCloseDate   = dto.ExpectedCloseDate.Value;
            if (dto.ActualCloseDate.HasValue)         opp.ActualCloseDate     = dto.ActualCloseDate.Value;
            if (dto.OwnerId.HasValue)                 opp.OwnerId             = dto.OwnerId.Value;

            opp.UpdatedAt = DateTime.UtcNow;

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
                    .ThenInclude(c => c!.Company)
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
            CompanyName        = opp.Customer?.Company?.Name,
            CreatedAt          = opp.CreatedAt,
            UpdatedAt          = opp.UpdatedAt
        };
    }
}
