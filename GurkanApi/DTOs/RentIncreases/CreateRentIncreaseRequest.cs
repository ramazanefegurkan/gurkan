using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.RentIncreases;

public class CreateRentIncreaseRequest
{
    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "NewAmount must be greater than zero.")]
    public decimal NewAmount { get; set; }

    [Required]
    public DateTime EffectiveDate { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }
}
