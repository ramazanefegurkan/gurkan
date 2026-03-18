namespace GurkanApi.Services;

public class PushResult
{
    public int TicketCount { get; set; }
    public List<string> Errors { get; set; } = new();
}

public interface IPushNotificationService
{
    Task<PushResult> SendPushAsync(IEnumerable<string> tokens, string title, string body, object? data = null);
}
