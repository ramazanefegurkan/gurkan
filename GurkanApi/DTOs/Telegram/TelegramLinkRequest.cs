namespace GurkanApi.DTOs.Telegram;

using System.ComponentModel.DataAnnotations;

public class TelegramLinkRequest
{
    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string LinkCode { get; set; } = null!;
}
