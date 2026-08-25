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

    private bool IsSalesRep() => User.IsInRole("SalesRep");

    [HttpGet]
    public async Task<IActionResult> GetAttachments([FromQuery] int? customerId, [FromQuery] int? companyId, [FromQuery] int? opportunityId, [FromQuery] int? leadId)
    {
        if (!customerId.HasValue && !companyId.HasValue && !opportunityId.HasValue && !leadId.HasValue)
        {
            return BadRequest(new { message = "customerId, companyId, opportunityId, or leadId is required." });
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
            else if (leadId.HasValue)
            {
                var lead = await _context.Leads.FindAsync(leadId.Value);
                if (lead is null) return NotFound(new { message = "Lead not found." });
                if (lead.AssignedRepId != currentUserId) return Forbid();
            }
        }

        var query = _context.Attachments.Include(a => a.UploadedBy).AsQueryable();
        if (customerId.HasValue) query = query.Where(a => a.CustomerId == customerId.Value);
        if (companyId.HasValue) query = query.Where(a => a.CompanyId == companyId.Value);
        if (opportunityId.HasValue) query = query.Where(a => a.OpportunityId == opportunityId.Value);
        if (leadId.HasValue) query = query.Where(a => a.LeadId == leadId.Value);

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
            else if (attachment.LeadId.HasValue)
            {
                var lead = await _context.Leads.FindAsync(attachment.LeadId.Value);
                if (lead is null || lead.AssignedRepId != GetCurrentUserId()) return Forbid();
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

        // 1. Enforce Maximum File Size (15 MB)
        const long maxFileSizeBytes = 15 * 1024 * 1024;
        if (request.File.Length > maxFileSizeBytes)
        {
            return BadRequest(new { message = "File size exceeds the maximum allowed limit of 15 MB." });
        }

        if (!request.CustomerId.HasValue && !request.CompanyId.HasValue && !request.OpportunityId.HasValue && !request.LeadId.HasValue)
        {
            return BadRequest(new { message = "CustomerId, CompanyId, OpportunityId, or LeadId is required." });
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
            else if (request.LeadId.HasValue)
            {
                var lead = await _context.Leads.FindAsync(request.LeadId.Value);
                if (lead is null) return NotFound(new { message = "Lead not found." });
                if (lead.AssignedRepId != currentUserId) return Forbid();
            }
        }

        var originalFileName = Path.GetFileName(request.File.FileName) ?? "upload";
        var fileExtension = (Path.GetExtension(originalFileName) ?? string.Empty).ToLowerInvariant();

        // 2. Allowed Safe File Extensions Whitelist
        var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif",
            ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"
        };

        if (!allowedExtensions.Contains(fileExtension))
        {
            return BadRequest(new { message = $"File type '{fileExtension}' is not permitted. Allowed formats: PDF, PNG, JPG, WEBP, DOC, DOCX, XLS, XLSX, CSV, TXT." });
        }

        // 3. Binary Magic Byte Header Inspection to prevent disguised malicious files
        using (var headerStream = request.File.OpenReadStream())
        {
            var headerBytes = new byte[8];
            var bytesRead = await headerStream.ReadAsync(headerBytes, 0, headerBytes.Length);
            if (bytesRead >= 4)
            {
                bool isValid = true;
                if (fileExtension == ".pdf" && (headerBytes[0] != 0x25 || headerBytes[1] != 0x50 || headerBytes[2] != 0x44 || headerBytes[3] != 0x46))
                {
                    isValid = false;
                }
                else if (fileExtension == ".png" && (headerBytes[0] != 0x89 || headerBytes[1] != 0x50 || headerBytes[2] != 0x4E || headerBytes[3] != 0x47))
                {
                    isValid = false;
                }
                else if ((fileExtension == ".jpg" || fileExtension == ".jpeg") && (headerBytes[0] != 0xFF || headerBytes[1] != 0xD8 || headerBytes[2] != 0xFF))
                {
                    isValid = false;
                }
                else if (fileExtension == ".gif" && (headerBytes[0] != 0x47 || headerBytes[1] != 0x49 || headerBytes[2] != 0x46 || headerBytes[3] != 0x38))
                {
                    isValid = false;
                }
                else if ((fileExtension == ".docx" || fileExtension == ".xlsx") && (headerBytes[0] != 0x50 || headerBytes[1] != 0x4B || headerBytes[2] != 0x03 || headerBytes[3] != 0x04))
                {
                    isValid = false;
                }

                if (!isValid)
                {
                    return BadRequest(new { message = "File content signature does not match its declared extension." });
                }
            }
        }

        var uploadDir = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
        Directory.CreateDirectory(uploadDir);

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
            LeadId = request.LeadId,
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
            else if (attachment.LeadId.HasValue)
            {
                var lead = await _context.Leads.FindAsync(attachment.LeadId.Value);
                if (lead is null || lead.AssignedRepId != GetCurrentUserId()) return Forbid();
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
