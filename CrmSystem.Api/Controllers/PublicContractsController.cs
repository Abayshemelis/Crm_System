using System;
using System.Linq;
using System.Threading.Tasks;
using CrmSystem.Api.Services;
using CrmSystem.Domain.Dtos.Contract;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using CrmSystem.Infrastructure.Services;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/public/contracts")]
[AllowAnonymous]
public class PublicContractsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _emailSender;
    private readonly IEmailTemplateService _templateService;
    private readonly INotificationService _notificationService;

    public PublicContractsController(
        AppDbContext db,
        IEmailSender emailSender,
        IEmailTemplateService templateService,
        INotificationService notificationService)
    {
        _db = db;
        _emailSender = emailSender;
        _templateService = templateService;
        _notificationService = notificationService;
    }

    [HttpGet("{token}")]
    public async Task<ActionResult<ContractReadDto>> GetPublicContract(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Invalid signing token." });

        var contract = await _db.Contracts
            .Where(c => !c.IsDeleted && (c.SigningToken == token || c.ContractNumber == token || c.ContractId.ToString() == token))
            .Include(c => c.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(c => c.Opportunity)
            .Include(c => c.CreatedBy)
            .FirstOrDefaultAsync();

        if (contract == null)
            return NotFound(new { message = "Contract not found or invalid link." });

        if (string.IsNullOrEmpty(contract.SigningToken))
        {
            contract.SigningToken = token;
            await _db.SaveChangesAsync();
        }

        return Ok(MapToReadDto(contract));
    }

    [HttpPost("{token}/sign")]
    public async Task<IActionResult> SignPublicContract(string token, [FromBody] SignContractDto dto)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Invalid signing token." });

        var contract = await _db.Contracts
            .Include(c => c.Customer)
            .Include(c => c.CreatedBy)
            .FirstOrDefaultAsync(c => !c.IsDeleted && (c.SigningToken == token || c.ContractNumber == token || c.ContractId.ToString() == token));

        if (contract == null)
            return NotFound(new { message = "Contract not found or invalid link." });

        if (contract.Status == "Signed" || contract.Status == "Active")
            return BadRequest(new { message = "This contract has already been signed." });

        if (string.IsNullOrWhiteSpace(dto.SignatureDataUrl))
            return BadRequest(new { message = "Signature image is required." });

        contract.SignatureDataUrl = dto.SignatureDataUrl;
        contract.SignedByName = string.IsNullOrWhiteSpace(dto.SignedByName) ? "Authorized Signatory" : dto.SignedByName;
        contract.SignedAt = DateTime.UtcNow;
        contract.Status = "Signed";
        contract.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Send email notification to creator/rep
        try
        {
            var repEmail = contract.CreatedBy?.Email;
            var custName = contract.Customer != null ? $"{contract.Customer.FirstName} {contract.Customer.LastName}".Trim() : "Customer";
            var repName = contract.CreatedBy?.Name ?? "Sales Rep";

            if (!string.IsNullOrWhiteSpace(repEmail))
            {
                var html = _templateService.BuildContractSignedNotificationHtml(
                    repName,
                    custName,
                    contract.Title,
                    contract.ContractNumber,
                    contract.ContractValue,
                    contract.SignedAt.Value,
                    contract.SignedByName
                );
                await _emailSender.SendEmailAsync(repEmail, $"🎉 Contract Signed: {contract.Title} ({contract.ContractNumber})", html);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Email] Could not send contract signed notification: {ex.Message}");
        }

        // Send in-app notification to creator/rep
        try
        {
            var targetUserId = contract.CreatedById;
            var msg = $"🎉 Contract #{contract.ContractNumber} ('{contract.Title}') valued at ${contract.ContractValue:N2} was signed by {contract.SignedByName}.";
            
            await _notificationService.CreateNotificationAsync(
                targetUserId,
                "TaskDue",
                msg,
                opportunityId: contract.OpportunityId
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[InAppNotification] Error creating contract signed notification: {ex.Message}");
        }

        return Ok(new
        {
            message = "Contract signed successfully!",
            signedByName = contract.SignedByName,
            signedAt = contract.SignedAt
        });
    }

    private static ContractReadDto MapToReadDto(Contract c) => new()
    {
        ContractId = c.ContractId,
        ContractNumber = c.ContractNumber,
        CustomerId = c.CustomerId,
        CustomerName = c.Customer != null ? $"{c.Customer.FirstName} {c.Customer.LastName}".Trim() : "Valued Customer",
        CustomerEmail = c.Customer?.Email ?? "",
        CompanyName = c.Customer?.Company?.Name,
        OpportunityId = c.OpportunityId,
        OpportunityTitle = c.Opportunity?.Title,
        Title = c.Title,
        ContractValue = c.ContractValue,
        StartDate = c.StartDate,
        EndDate = c.EndDate,
        Status = c.Status,
        SignatureDataUrl = c.SignatureDataUrl,
        SignedByName = c.SignedByName,
        SignedAt = c.SignedAt,
        TermsAndConditions = c.TermsAndConditions,
        Notes = c.Notes,
        SigningToken = c.SigningToken,
        CreatedById = c.CreatedById,
        CreatedByName = c.CreatedBy?.Name ?? "Sales Representative",
        CreatedAt = c.CreatedAt,
    };
}
