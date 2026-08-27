using CrmSystem.Domain.Entities;
using CrmSystem.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace CrmSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SystemProfilesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public SystemProfilesController(AppDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await _context.SystemProfiles.FirstOrDefaultAsync(sp => sp.Id == 1);
        if (profile == null)
        {
            profile = new SystemProfile { Id = 1 };
            _context.SystemProfiles.Add(profile);
            await _context.SaveChangesAsync();
        }

        // Apply sensible defaults if null/empty
        bool changed = false;
        if (string.IsNullOrWhiteSpace(profile.Country))
        {
            profile.Country = "Ethiopia";
            changed = true;
        }
        if (string.IsNullOrWhiteSpace(profile.Currency))
        {
            profile.Currency = "ETB";
            changed = true;
        }
        if (string.IsNullOrWhiteSpace(profile.Timezone))
        {
            profile.Timezone = "Africa/Addis_Ababa";
            changed = true;
        }

        if (changed)
        {
            await _context.SaveChangesAsync();
        }

        return Ok(profile);
    }

    [HttpPut]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdateProfile([FromBody] CrmSystem.Api.DTOs.UpdateSystemProfileDto update)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var profile = await _context.SystemProfiles.FirstOrDefaultAsync(sp => sp.Id == 1);
        if (profile == null)
        {
            profile = new SystemProfile { Id = 1 };
            _context.SystemProfiles.Add(profile);
        }

        profile.SystemName = update.SystemName?.Trim() ?? string.Empty;
        profile.CompanyName = string.IsNullOrWhiteSpace(update.CompanyName) ? null : update.CompanyName.Trim();
        profile.LogoUrl = string.IsNullOrWhiteSpace(update.LogoUrl) ? null : update.LogoUrl.Trim();
        profile.Email = string.IsNullOrWhiteSpace(update.Email) ? null : update.Email.Trim();
        profile.Phone = string.IsNullOrWhiteSpace(update.Phone) ? null : update.Phone.Trim();
        profile.Website = string.IsNullOrWhiteSpace(update.Website) ? null : update.Website.Trim();
        profile.Address = string.IsNullOrWhiteSpace(update.Address) ? null : update.Address.Trim();
        profile.Country = string.IsNullOrWhiteSpace(update.Country) ? "Ethiopia" : update.Country;
        profile.Currency = string.IsNullOrWhiteSpace(update.Currency) ? "ETB" : update.Currency;
        profile.Timezone = string.IsNullOrWhiteSpace(update.Timezone) ? "Africa/Addis_Ababa" : update.Timezone;

        await _context.SaveChangesAsync();
        return Ok(profile);
    }

    [HttpPost("upload-logo")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UploadLogo(IFormFile file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }

        const long maxFileSizeBytes = 5 * 1024 * 1024; // 5 MB
        if (file.Length > maxFileSizeBytes)
        {
            return BadRequest(new { message = "File size exceeds the 5 MB limit." });
        }

        var originalFileName = Path.GetFileName(file.FileName) ?? "logo";
        var fileExtension = (Path.GetExtension(originalFileName) ?? string.Empty).ToLowerInvariant();

        var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"
        };

        if (!allowedExtensions.Contains(fileExtension))
        {
            return BadRequest(new { message = $"File type '{fileExtension}' is not permitted. Allowed formats: PNG, JPG, JPEG, WEBP, GIF, SVG." });
        }

        var uploadDir = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "system");
        Directory.CreateDirectory(uploadDir);

        var savedFileName = $"logo_{Guid.NewGuid()}{fileExtension}";
        var savedPath = Path.Combine(uploadDir, savedFileName);

        await using (var stream = System.IO.File.Create(savedPath))
        {
            await file.CopyToAsync(stream);
        }

        var url = $"/uploads/system/{savedFileName}";
        return Ok(new { url });
    }
}
