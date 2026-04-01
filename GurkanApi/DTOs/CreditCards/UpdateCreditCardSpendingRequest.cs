namespace GurkanApi.DTOs.CreditCards;

public class UpdateCreditCardSpendingRequest
{
    public string? Description { get; set; }
    public decimal? Amount { get; set; }
    public DateTime? Date { get; set; }
}
