using System.ComponentModel.DataAnnotations;

namespace CrmSystem.Api.DTOs;

public class UpdateSystemProfileDto
{
    [Required(ErrorMessage = "System Name is required.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "System Name must be between 1 and 100 characters.")]
    [RegularExpression(@"^(?!\s*$).+", ErrorMessage = "System Name cannot be only whitespace.")]
    public string SystemName { get; set; } = string.Empty;

    [StringLength(100, ErrorMessage = "Company Name cannot exceed 100 characters.")]
    public string? CompanyName { get; set; }

    [RegularExpression(@"^(https?://.+)?$", ErrorMessage = "Please enter a valid website URL.")]
    public string? LogoUrl { get; set; }

    [RegularExpression(@"^([^\s@]+@[^\s@]+\.[^\s@]+)?$", ErrorMessage = "Please enter a valid email address.")]
    [StringLength(150, ErrorMessage = "Email cannot exceed 150 characters.")]
    public string? Email { get; set; }

    // Allows standard international phone formats optionally, or empty
    [RegularExpression(@"^(\+?[1-9]\d{1,14})?$", ErrorMessage = "Please enter a valid phone number format (e.g. +251...).")]
    public string? Phone { get; set; }

    [RegularExpression(@"^(https?://.+)?$", ErrorMessage = "Please enter a valid website URL.")]
    [StringLength(200, ErrorMessage = "Website URL cannot exceed 200 characters.")]
    public string? Website { get; set; }

    [StringLength(250, ErrorMessage = "Address cannot exceed 250 characters.")]
    public string? Address { get; set; }

    [StringLength(100, ErrorMessage = "Country cannot exceed 100 characters.")]
    public string? Country { get; set; }

    [StringLength(10, ErrorMessage = "Currency must be a valid code.")]
    public string? Currency { get; set; }

    [StringLength(100, ErrorMessage = "Timezone cannot exceed 100 characters.")]
    public string? Timezone { get; set; }
}
