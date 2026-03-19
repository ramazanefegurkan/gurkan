using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.BankAccounts;

public class CreateBankAccountRequest
{
    [Required]
    public Guid GroupId { get; set; }

    [Required]
    [MaxLength(200)]
    public string HolderName { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string BankName { get; set; } = string.Empty;

    [MaxLength(34)]
    public string? IBAN { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }
}
