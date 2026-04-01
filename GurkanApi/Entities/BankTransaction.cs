namespace GurkanApi.Entities;

public class BankTransaction
{
    public Guid Id { get; set; }
    public Guid BankAccountId { get; set; }
    public BankTransactionType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public Guid? RelatedStatementId { get; set; }
    public DateTime CreatedAt { get; set; }

    public BankAccount BankAccount { get; set; } = null!;
    public CreditCardStatement? RelatedStatement { get; set; }
}
