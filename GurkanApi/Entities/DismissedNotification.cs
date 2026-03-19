namespace GurkanApi.Entities;

/// <summary>
/// Tracks dismissed (read) notifications per user.
/// Notification key is a deterministic string built from type + relatedEntityId
/// so the same notification can be dismissed and won't reappear until conditions change.
/// </summary>
public class DismissedNotification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    /// <summary>
    /// Deterministic key: "{Type}:{RelatedEntityId}" — e.g. "LateRent:3fa85f64-..."
    /// </summary>
    public string NotificationKey { get; set; } = string.Empty;

    public DateTime DismissedAt { get; set; }

    public User User { get; set; } = null!;
}
