using GurkanApi.Entities;

namespace GurkanApi.DTOs.CreditCards;

public class CreditCardListResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public Currency Currency { get; set; }
    public bool IsActive { get; set; }
    public decimal CurrentDebt { get; set; }
}
