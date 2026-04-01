using GurkanApi.Entities;

namespace GurkanApi.DTOs.BankAccounts;

public class UpdateBankTransactionRequest
{
    public BankTransactionType? Type { get; set; }
    public string? Description { get; set; }
    public decimal? Amount { get; set; }
    public DateTime? Date { get; set; }
}
