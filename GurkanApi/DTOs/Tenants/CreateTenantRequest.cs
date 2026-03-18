using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.Tenants;

public class CreateTenantRequest
{
    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? Phone { get; set; }

    [MaxLength(256)]
    public string? Email { get; set; }

    [MaxLength(20)]
    public string? IdentityNumber { get; set; }

    [Required]
    public DateTime LeaseStart { get; set; }

    [Required]
    public DateTime LeaseEnd { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "MonthlyRent must be greater than zero.")]
    public decimal MonthlyRent { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Deposit { get; set; }

    [Required]
    public Currency Currency { get; set; }
}
