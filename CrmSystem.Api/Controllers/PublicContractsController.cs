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
            .Where(c => !c.IsDeleted && (c.SigningToken == token || c.ContractNumber == token))
            .Include(c => c.Customer)
                .ThenInclude(cust => cust.Company)
            .Include(c => c.Opportunity)
            .Include(c => c.CreatedBy)
            .FirstOrDefaultAsync();

        if (contract == null)
            return NotFound(new { message = "Contract not found or invalid link." });

        if (contract.TokenExpiresAt.HasValue && contract.TokenExpiresAt.Value < DateTime.UtcNow)
        {
            return BadRequest(new { message = "This signing link has expired. Please request a new link from your representative." });
        }

        if (string.IsNullOrEmpty(contract.SigningToken))
        {
            contract.SigningToken = Guid.NewGuid().ToString("N");
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
            .FirstOrDefaultAsync(c => !c.IsDeleted && (c.SigningToken == token || c.ContractNumber == token));

        if (contract == null)
            return NotFound(new { message = "Contract not found or invalid link." });

        if (contract.TokenExpiresAt.HasValue && contract.TokenExpiresAt.Value < DateTime.UtcNow)
        {
            return BadRequest(new { message = "This signing link has expired. Please request a new link from your representative." });
        }

        if (!string.IsNullOrEmpty(contract.CustomerSignatureDataUrl))
            return BadRequest(new { message = "The customer signature has already been submitted for this contract." });

        if (string.IsNullOrWhiteSpace(dto.SignatureDataUrl))
            return BadRequest(new { message = "Signature image is required." });

        contract.CustomerSignatureDataUrl = dto.SignatureDataUrl;
        contract.CustomerSignedByName = string.IsNullOrWhiteSpace(dto.SignedByName) 
            ? (contract.Customer != null ? $"{contract.Customer.FirstName} {contract.Customer.LastName}".Trim() : "Customer Signatory") 
            : dto.SignedByName;
        contract.CustomerSignedAt = DateTime.UtcNow;

        // Backward compatibility
        contract.SignatureDataUrl = dto.SignatureDataUrl;
        contract.SignedByName = contract.CustomerSignedByName;
        contract.SignedAt = contract.CustomerSignedAt;

        var hasCompanySign = !string.IsNullOrEmpty(contract.CompanySignatureDataUrl);
        if (hasCompanySign)
        {
            contract.Status = "Signed"; // Both parties have signed
        }
        else
        {
            contract.Status = "PendingSeller"; // Waiting for company counter-signature
        }

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
                    contract.CustomerSignedAt.Value,
                    contract.CustomerSignedByName
                );
                await _emailSender.SendEmailAsync(repEmail, $"🎉 Contract Signed by Client: {contract.Title} ({contract.ContractNumber})", html);
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
            var msg = hasCompanySign
                ? $"🎉 Contract #{contract.ContractNumber} ('{contract.Title}') is now FULLY SIGNED by both parties!"
                : $"✍️ Customer {contract.CustomerSignedByName} signed Contract #{contract.ContractNumber} ('{contract.Title}'). Please counter-sign to complete execution.";
            
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
            message = hasCompanySign 
                ? "Contract is now fully signed by both parties!" 
                : "Your signature has been submitted successfully! The company representative will counter-sign to complete execution.",
            signedByName = contract.CustomerSignedByName,
            signedAt = contract.CustomerSignedAt,
            status = contract.Status,
            isFullySigned = hasCompanySign
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
        SignatureDataUrl = c.SignatureDataUrl ?? c.CustomerSignatureDataUrl,
        SignedByName = c.SignedByName ?? c.CustomerSignedByName,
        SignedAt = c.SignedAt ?? c.CustomerSignedAt,
        CompanySignatureDataUrl = c.CompanySignatureDataUrl,
        CompanySignedByName = c.CompanySignedByName,
        CompanySignedAt = c.CompanySignedAt,
        CustomerSignatureDataUrl = c.CustomerSignatureDataUrl ?? c.SignatureDataUrl,
        CustomerSignedByName = c.CustomerSignedByName ?? c.SignedByName,
        CustomerSignedAt = c.CustomerSignedAt ?? c.SignedAt,
        TermsAndConditions = c.TermsAndConditions,
        Notes = c.Notes,
        SigningToken = c.SigningToken,
        CreatedById = c.CreatedById,
        CreatedByName = c.CreatedBy?.Name ?? "Sales Representative",
        CreatedAt = c.CreatedAt,
    };
}
