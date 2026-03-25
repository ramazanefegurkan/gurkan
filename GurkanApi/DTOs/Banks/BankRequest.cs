using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.Banks;

public class CreateBankRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
}
