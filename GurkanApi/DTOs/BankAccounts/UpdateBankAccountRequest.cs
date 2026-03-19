using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.BankAccounts;

public class UpdateBankAccountRequest
{
    [MaxLength(200)]
    public string? HolderName { get; set; }

    [MaxLength(200)]
    public string? BankName { get; set; }

    [MaxLength(34)]
    public string? IBAN { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }
}
