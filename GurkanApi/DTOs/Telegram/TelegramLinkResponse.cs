namespace GurkanApi.DTOs.Telegram;

public class TelegramLinkResponse
{
    public bool IsLinked { get; set; }
    public long? TelegramUserId { get; set; }
    public string? TelegramUsername { get; set; }
    public DateTime? LinkedAt { get; set; }
}
