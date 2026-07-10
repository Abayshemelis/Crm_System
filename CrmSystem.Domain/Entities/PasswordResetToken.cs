using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CrmSystem.Domain.Entities;

public class PasswordResetToken
{
    [Key]
    public int TokenId { get; set; }

    [Required]
    public int IdentityId { get; set; }

    [Required]
    [MaxLength(255)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    [ForeignKey("IdentityId")]
    public Identity? Identity { get; set; }
}
