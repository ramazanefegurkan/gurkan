using GurkanApi.Entities;

namespace GurkanApi.DTOs.CreditCards;

public class UpdateCreditCardRequest
{
    public string? Name { get; set; }
    public string? BankName { get; set; }
    public int? BillingDay { get; set; }
    public int? DueDay { get; set; }
    public Currency? Currency { get; set; }
    public bool? IsActive { get; set; }
}
