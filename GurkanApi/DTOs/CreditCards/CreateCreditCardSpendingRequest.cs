using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.CreditCards;

public class CreateCreditCardSpendingRequest
{
    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    public DateTime Date { get; set; }
}
