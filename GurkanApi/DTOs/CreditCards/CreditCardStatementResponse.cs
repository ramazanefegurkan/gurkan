namespace GurkanApi.DTOs.CreditCards;

public class CreditCardStatementResponse
{
    public Guid Id { get; set; }
    public Guid CreditCardId { get; set; }
    public DateTime StatementDate { get; set; }
    public DateTime DueDate { get; set; }
    public decimal TotalAmount { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaidDate { get; set; }
    public Guid? PaidFromBankAccountId { get; set; }
    public decimal ItemizedTotal { get; set; }
    public decimal GeneralAmount { get; set; }
    public List<CreditCardSpendingResponse> ItemizedSpendings { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}
