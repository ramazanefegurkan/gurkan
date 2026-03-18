using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.Tenants;

public class UpdateTenantRequest
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

    public DateTime? LeaseStart { get; set; }
    public DateTime? LeaseEnd { get; set; }
    public decimal? MonthlyRent { get; set; }
    public decimal? Deposit { get; set; }
    public Currency? Currency { get; set; }
}
