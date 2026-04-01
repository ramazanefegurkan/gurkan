namespace GurkanApi.DTOs.Notifications;

public class NotificationItem
{
    public string Key { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public Guid? PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public Guid? GroupId { get; set; }
    public string? GroupName { get; set; }
    public Guid? RelatedEntityId { get; set; }
    public DateTime Date { get; set; }
}
