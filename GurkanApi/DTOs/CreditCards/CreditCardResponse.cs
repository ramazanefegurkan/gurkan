using GurkanApi.Entities;

namespace GurkanApi.DTOs.CreditCards;

public class CreditCardResponse
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public int BillingDay { get; set; }
    public int DueDay { get; set; }
    public Currency Currency { get; set; }
    public bool IsActive { get; set; }
    public decimal CurrentDebt { get; set; }
    public DateTime CreatedAt { get; set; }
}
