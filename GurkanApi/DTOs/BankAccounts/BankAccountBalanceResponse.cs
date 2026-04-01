using GurkanApi.Entities;

namespace GurkanApi.DTOs.BankAccounts;

public class BankAccountBalanceResponse
{
    public Guid BankAccountId { get; set; }
    public decimal Balance { get; set; }
    public Currency Currency { get; set; }
}
