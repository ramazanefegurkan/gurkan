namespace GurkanApi.Entities;

public class TelegramUserLink
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public long TelegramUserId { get; set; }
    public string? TelegramUsername { get; set; }
    public string LinkCode { get; set; } = null!;
    public DateTime LinkCodeExpiresAt { get; set; }
    public bool IsLinked { get; set; }
    public DateTime? LinkedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
}
