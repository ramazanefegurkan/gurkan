namespace GurkanApi.Services;

using System.Text;
using System.Text.Json;
using GurkanApi.Entities;

public class BillParserService : IBillParserService
{
    private readonly HttpClient _http;
    private readonly string _model;
    private readonly ILogger<BillParserService> _logger;

    private const string SystemPrompt = """
        Sen bir Türk fatura analiz asistanısın. Gönderilen fatura fotoğrafından veya SMS metninden aşağıdaki bilgileri çıkar.
        Türk fatura formatlarını biliyorsun: elektrik (BEDAŞ, AYEDAŞ, vb.), su (İSKİ, ASKİ, vb.), doğalgaz (İGDAŞ, vb.), internet (Türk Telekom, Superonline, vb.), aidat.

        JSON formatında yanıt ver, başka hiçbir metin ekleme:
        {
          "billType": "Water" | "Electric" | "Gas" | "Internet" | "Dues" | null,
          "amount": number | null,
          "currency": "TRY" | "USD" | "EUR" | null,
          "dueDate": "YYYY-MM-DD" | null,
          "subscriberNo": "string" | null,
          "provider": "string" | null,
          "isRecognized": true | false
        }

        Eğer gönderilen içerik bir fatura değilse isRecognized: false döndür.
        Emin olmadığın alanları null olarak döndür.
        """;

    public BillParserService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<BillParserService> logger)
    {
        _http = httpClientFactory.CreateClient("Anthropic");
        _model = config["Anthropic:Model"] ?? "claude-sonnet-4-20250514";
        _logger = logger;
    }

    public async Task<ParsedBill> ParseBillImageAsync(byte[] imageData)
    {
        var base64 = Convert.ToBase64String(imageData);
        var mediaType = DetectMediaType(imageData);

        var payload = new
        {
            model = _model,
            max_tokens = 1024,
            system = SystemPrompt,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "image", source = new { type = "base64", media_type = mediaType, data = base64 } },
                        new { type = "text", text = "Bu faturayı analiz et." }
                    }
                }
            }
        };

        return await SendAndParseAsync(payload);
    }

    public async Task<ParsedBill> ParseBillTextAsync(string text)
    {
        var payload = new
        {
            model = _model,
            max_tokens = 1024,
            system = SystemPrompt,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "text", text = $"Bu fatura SMS'ini veya metnini analiz et:\n\n{text}" }
                    }
                }
            }
        };

        return await SendAndParseAsync(payload);
    }

    private async Task<ParsedBill> SendAndParseAsync(object payload)
    {
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _http.PostAsync("v1/messages", content);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Claude API error: {StatusCode} {Body}", response.StatusCode, responseBody);
            return new ParsedBill { IsRecognized = false };
        }

        using var doc = JsonDocument.Parse(responseBody);
        var textContent = doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString();

        if (string.IsNullOrWhiteSpace(textContent))
            return new ParsedBill { IsRecognized = false };

        var jsonStart = textContent.IndexOf('{');
        var jsonEnd = textContent.LastIndexOf('}');
        if (jsonStart < 0 || jsonEnd < 0)
            return new ParsedBill { IsRecognized = false };

        var cleanJson = textContent[jsonStart..(jsonEnd + 1)];

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var raw = JsonSerializer.Deserialize<JsonElement>(cleanJson, options);

        return new ParsedBill
        {
            BillType = ParseEnum<BillType>(raw, "billType"),
            Amount = raw.TryGetProperty("amount", out var amt) && amt.ValueKind == JsonValueKind.Number ? amt.GetDecimal() : null,
            Currency = ParseEnum<Currency>(raw, "currency") ?? Entities.Currency.TRY,
            DueDate = raw.TryGetProperty("dueDate", out var dd) && dd.ValueKind == JsonValueKind.String && DateTime.TryParse(dd.GetString(), out var parsed) ? parsed : null,
            SubscriberNo = raw.TryGetProperty("subscriberNo", out var sn) && sn.ValueKind == JsonValueKind.String ? sn.GetString() : null,
            Provider = raw.TryGetProperty("provider", out var prov) && prov.ValueKind == JsonValueKind.String ? prov.GetString() : null,
            IsRecognized = raw.TryGetProperty("isRecognized", out var ir) && ir.ValueKind == JsonValueKind.True
        };
    }

    private static string DetectMediaType(byte[] data)
    {
        if (data.Length >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF) return "image/jpeg";
        if (data.Length >= 8 && data[0] == 0x89 && data[1] == 0x50) return "image/png";
        if (data.Length >= 4 && data[0] == 0x52 && data[1] == 0x49) return "image/webp";
        return "image/jpeg";
    }

    private static T? ParseEnum<T>(JsonElement root, string property) where T : struct, Enum
    {
        if (!root.TryGetProperty(property, out var val) || val.ValueKind != JsonValueKind.String)
            return null;
        return Enum.TryParse<T>(val.GetString(), true, out var result) ? result : null;
    }
}
