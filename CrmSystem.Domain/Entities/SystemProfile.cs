using System.ComponentModel.DataAnnotations;

namespace CrmSystem.Domain.Entities;

public class SystemProfile
{
    [Key]
    public int Id { get; set; } = 1;
    
    [MaxLength(100)]
    public string SystemName { get; set; } = "KENOVA CRM";
    
    [MaxLength(100)]
    public string CompanyName { get; set; } = "KENOVA";
    
    [MaxLength(2000)]
    public string? LogoUrl { get; set; }
    
    [MaxLength(255)]
    public string? Email { get; set; }
    
    [MaxLength(50)]
    public string? Phone { get; set; }
    
    [MaxLength(255)]
    public string? Website { get; set; }
    
    [MaxLength(500)]
    public string? Address { get; set; }
    
    [MaxLength(100)]
    public string? Country { get; set; }
    
    [MaxLength(10)]
    public string? Currency { get; set; } = "USD";
    
    [MaxLength(100)]
    public string? Timezone { get; set; } = "UTC";
}
