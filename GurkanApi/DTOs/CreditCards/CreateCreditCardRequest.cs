using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.CreditCards;

public class CreateCreditCardRequest
{
    [Required]
    public Guid GroupId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string BankName { get; set; } = string.Empty;

    [Required]
    [Range(1, 31)]
    public int BillingDay { get; set; }

    [Required]
    [Range(1, 31)]
    public int DueDay { get; set; }

    [Required]
    public Currency Currency { get; set; }
}
