using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.CreditCards;

public class CreateStatementRequest
{
    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal TotalAmount { get; set; }

    public int? Month { get; set; }
    public int? Year { get; set; }
}
