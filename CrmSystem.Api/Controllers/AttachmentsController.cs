using CrmSystem.Api.Dtos;
using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public AttachmentsController(AppDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return int.Parse(claim?.Value ?? throw new InvalidOperationException("User id claim is missing."));
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value ?? "SalesRep";
    }

    private bool IsSalesRep() => GetCurrentUserRole() == "SalesRep";

    [HttpGet]
    public async Task<IActionResult> GetAttachments([FromQuery] int? customerId, [FromQuery] int? companyId, [FromQuery] int? opportunityId)
    {
        if (!customerId.HasValue && !companyId.HasValue && !opportunityId.HasValue)
        {
            return BadRequest(new { message = "customerId, companyId, or opportunityId is required." });
        }

        var currentUserId = GetCurrentUserId();

        if (IsSalesRep())
        {
            if (customerId.HasValue)
            {
                var customer = await _context.Customers.FindAsync(customerId.Value);
                if (customer is null) return NotFound(new { message = "Customer not found." });
                if (customer.AssignedRepId != currentUserId) return Forbid();
            }
            else if (companyId.HasValue)
            {
                var company = await _context.Companies.FindAsync(companyId.Value);
                if (company is null) return NotFound(new { message = "Company not found." });
                if (company.AssignedRepId != currentUserId) return Forbid();
            }
        }

        var query = _context.Attachments.Include(a => a.UploadedBy).AsQueryable();
        if (customerId.HasValue) query = query.Where(a => a.CustomerId == customerId.Value);
        if (companyId.HasValue) query = query.Where(a => a.CompanyId == companyId.Value);
        if (opportunityId.HasValue) query = query.Where(a => a.OpportunityId == opportunityId.Value);

        var attachments = await query
            .OrderByDescending(a => a.UploadedAt)
            .Select(a => new
            {
                a.AttachmentId,
                a.FileName,
                a.FileUrl,
                a.ContentType,
                a.FileSizeBytes,
                UploadedByName = a.UploadedBy != null ? a.UploadedBy.Name : "Unknown",
                a.UploadedAt
            })
            .ToListAsync();

        return Ok(attachments);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetAttachment(int id)
    {
        var attachment = await _context.Attachments
            .Include(a => a.UploadedBy)
            .SingleOrDefaultAsync(a => a.AttachmentId == id);

        if (attachment is null)
        {
            return NotFound();
        }

        if (IsSalesRep())
        {
            if (attachment.CustomerId.HasValue)
            {
                var customer = await _context.Customers.FindAsync(attachment.CustomerId.Value);
                if (customer is null || customer.AssignedRepId != GetCurrentUserId()) return Forbid();
            }
            else if (attachment.CompanyId.HasValue)
            {
                var company = await _context.Companies.FindAsync(attachment.CompanyId.Value);
                if (company is null || company.AssignedRepId != GetCurrentUserId()) return Forbid();
            }
        }

        return Ok(new
        {
            attachment.AttachmentId,
            attachment.FileName,
            attachment.FileUrl,
            attachment.ContentType,
            attachment.FileSizeBytes,
            UploadedByName = attachment.UploadedBy?.Name ?? "Unknown",
            attachment.UploadedAt
        });
    }

    [HttpPost]
    public async Task<IActionResult> UploadAttachment([FromForm] AttachmentUploadDto request)
    {
        if (request.File is null || request.File.Length == 0)
        {
            return BadRequest(new { message = "File upload is required." });
        }

        if (!request.CustomerId.HasValue && !request.CompanyId.HasValue && !request.OpportunityId.HasValue)
        {
            return BadRequest(new { message = "CustomerId, CompanyId, or OpportunityId is required." });
        }

        var currentUserId = GetCurrentUserId();

        if (IsSalesRep())
        {
            if (request.CustomerId.HasValue)
            {
                var customer = await _context.Customers.FindAsync(request.CustomerId.Value);
                if (customer is null) return NotFound(new { message = "Customer not found." });
                if (customer.AssignedRepId != currentUserId) return Forbid();
            }
            else if (request.CompanyId.HasValue)
            {
                var company = await _context.Companies.FindAsync(request.CompanyId.Value);
                if (company is null) return NotFound(new { message = "Company not found." });
                if (company.AssignedRepId != currentUserId) return Forbid();
            }
        }

        var uploadDir = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
        Directory.CreateDirectory(uploadDir);

        var originalFileName = Path.GetFileName(request.File.FileName) ?? "upload";
        var fileExtension = Path.GetExtension(originalFileName);
        var savedFileName = $"{Guid.NewGuid()}{fileExtension}";
        var savedPath = Path.Combine(uploadDir, savedFileName);

        await using (var stream = System.IO.File.Create(savedPath))
        {
            await request.File.CopyToAsync(stream);
        }

        var attachment = new Attachment
        {
            FileName = originalFileName,
            FileUrl = $"/uploads/{savedFileName}",
            FileSizeBytes = request.File.Length,
            ContentType = request.File.ContentType,
            CustomerId = request.CustomerId,
            CompanyId = request.CompanyId,
            OpportunityId = request.OpportunityId,
            UploadedById = currentUserId
        };

        _context.Attachments.Add(attachment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAttachment), new { id = attachment.AttachmentId }, new { attachment.AttachmentId });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteAttachment(int id)
    {
        var attachment = await _context.Attachments.FindAsync(id);
        if (attachment is null)
        {
            return NotFound();
        }

        if (IsSalesRep())
        {
            if (attachment.CustomerId.HasValue)
            {
                var customer = await _context.Customers.FindAsync(attachment.CustomerId.Value);
                if (customer is null || customer.AssignedRepId != GetCurrentUserId()) return Forbid();
            }
            else if (attachment.CompanyId.HasValue)
            {
                var company = await _context.Companies.FindAsync(attachment.CompanyId.Value);
                if (company is null || company.AssignedRepId != GetCurrentUserId()) return Forbid();
            }
        }

        var fileName = Path.GetFileName(attachment.FileUrl);
        if (!string.IsNullOrEmpty(fileName))
        {
            var filePath = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", fileName);
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
        }

        _context.Attachments.Remove(attachment);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
