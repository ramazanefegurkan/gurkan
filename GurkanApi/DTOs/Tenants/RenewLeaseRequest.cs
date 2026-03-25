using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.Tenants;

public class RenewLeaseRequest
{
    [Required]
    public DateTime NewLeaseEnd { get; set; }

    [Required]
    public decimal NewMonthlyRent { get; set; }

    public string? Notes { get; set; }
}
