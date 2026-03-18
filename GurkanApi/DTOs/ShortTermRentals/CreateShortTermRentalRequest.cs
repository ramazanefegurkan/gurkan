using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.ShortTermRentals;

public class CreateShortTermRentalRequest
{
    [MaxLength(200)]
    public string? GuestName { get; set; }

    [Required]
    public DateTime CheckIn { get; set; }

    [Required]
    public DateTime CheckOut { get; set; }

    [Required]
    [Range(0, double.MaxValue)]
    public decimal NightlyRate { get; set; }

    [Required]
    [Range(0, double.MaxValue)]
    public decimal TotalAmount { get; set; }

    [Range(0, double.MaxValue)]
    public decimal PlatformFee { get; set; }

    [Required]
    [Range(0, double.MaxValue)]
    public decimal NetAmount { get; set; }

    [Required]
    public RentalPlatform Platform { get; set; }

    [Required]
    public Currency Currency { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }
}
