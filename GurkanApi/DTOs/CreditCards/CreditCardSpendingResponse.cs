namespace GurkanApi.DTOs.CreditCards;

public class CreditCardSpendingResponse
{
    public Guid Id { get; set; }
    public Guid CreditCardId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; }
}
