using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.ShortTermRentals;

public class UpdateShortTermRentalRequest
{
    [MaxLength(200)]
    public string? GuestName { get; set; }

    public DateTime? CheckIn { get; set; }
    public DateTime? CheckOut { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? NightlyRate { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? TotalAmount { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? PlatformFee { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? NetAmount { get; set; }

    public RentalPlatform? Platform { get; set; }
    public Currency? Currency { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }
}
