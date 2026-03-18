using System.Text.Json;

namespace GurkanApi.Services;

public class PushNotificationService : IPushNotificationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PushNotificationService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public PushNotificationService(
        IHttpClientFactory httpClientFactory,
        ILogger<PushNotificationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<PushResult> SendPushAsync(
        IEnumerable<string> tokens, string title, string body, object? data = null)
    {
        var tokenList = tokens.ToList();
        if (tokenList.Count == 0)
            return new PushResult();

        var result = new PushResult();

        // Batch tokens (Expo allows up to 100 per request)
        var batches = tokenList.Chunk(100);

        foreach (var batch in batches)
        {
            try
            {
                var messages = batch.Select(token => new
                {
                    to = token,
                    title,
                    body,
                    sound = "default",
                    data,
                }).ToArray();

                var jsonContent = JsonSerializer.Serialize(messages, JsonOptions);
                var httpContent = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                var client = _httpClientFactory.CreateClient("ExpoPush");
                var response = await client.PostAsync("send", httpContent);

                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError(
                        "Expo Push API returned {StatusCode}: {Body}",
                        (int)response.StatusCode, responseBody);
                    result.Errors.Add($"HTTP {(int)response.StatusCode}: {responseBody}");
                    continue;
                }

                // Parse response for ticket info
                using var doc = JsonDocument.Parse(responseBody);
                if (doc.RootElement.TryGetProperty("data", out var dataArray) &&
                    dataArray.ValueKind == JsonValueKind.Array)
                {
                    foreach (var ticket in dataArray.EnumerateArray())
                    {
                        result.TicketCount++;

                        if (ticket.TryGetProperty("status", out var status) &&
                            status.GetString() == "error")
                        {
                            var errorMsg = ticket.TryGetProperty("message", out var msg)
                                ? msg.GetString() ?? "Unknown error"
                                : "Unknown error";
                            result.Errors.Add(errorMsg);
                        }
                    }
                }

                _logger.LogInformation(
                    "Expo Push API: sent {BatchSize} tokens, HTTP {StatusCode}, tickets={TicketCount}",
                    batch.Length, (int)response.StatusCode, result.TicketCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to send push notification batch ({BatchSize} tokens)",
                    batch.Length);
                result.Errors.Add($"Exception: {ex.Message}");
            }
        }

        return result;
    }
}
