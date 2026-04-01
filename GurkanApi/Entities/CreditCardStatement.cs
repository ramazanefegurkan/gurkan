namespace GurkanApi.Entities;

public class CreditCardStatement
{
    public Guid Id { get; set; }
    public Guid CreditCardId { get; set; }
    public DateTime StatementDate { get; set; }
    public DateTime DueDate { get; set; }
    public decimal TotalAmount { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaidDate { get; set; }
    public Guid? PaidFromBankAccountId { get; set; }
    public DateTime CreatedAt { get; set; }

    public CreditCard CreditCard { get; set; } = null!;
    public BankAccount? PaidFromBankAccount { get; set; }
}
