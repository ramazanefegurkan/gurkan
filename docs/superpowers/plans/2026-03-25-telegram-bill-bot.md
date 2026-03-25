# Telegram Bill Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to send bill photos or SMS text to a Telegram bot, which parses them via Claude Vision API and creates Bill records in the system.

**Architecture:** Telegram webhook → ASP.NET Core controller → Claude Vision API for parsing → subscription matching → Bill creation with user confirmation via inline keyboard. User linking via 6-digit code entered in web/mobile app.

**Tech Stack:** ASP.NET Core 10, Telegram.Bot NuGet, Anthropic Claude API (via HttpClient), PostgreSQL, React (web), React Native/Expo (mobile)

**Spec:** `docs/superpowers/specs/2026-03-25-telegram-bill-bot-design.md`

---

## File Structure

### Backend (GurkanApi/)

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `Entities/TelegramUserLink.cs` | Entity for Telegram ↔ Gurkan user mapping |
| Create | `DTOs/Telegram/TelegramLinkRequest.cs` | Link code verification DTO |
| Create | `DTOs/Telegram/TelegramLinkResponse.cs` | Link status response DTO |
| Create | `Services/ITelegramBotService.cs` | Interface: send messages, inline keyboards, download files |
| Create | `Services/TelegramBotService.cs` | Telegram Bot API wrapper via Telegram.Bot SDK |
| Create | `Services/IBillParserService.cs` | Interface: parse bill image/text via Claude Vision |
| Create | `Services/BillParserService.cs` | Claude API call, structured JSON extraction |
| Create | `Services/ISubscriptionMatcherService.cs` | Interface: match subscriber no to property |
| Create | `Services/SubscriptionMatcherService.cs` | SubscriptionNo + Type matching logic |
| Create | `Services/ITelegramBillHandler.cs` | Interface for bill processing orchestrator |
| Create | `Services/TelegramBillHandler.cs` | Orchestrator: coordinates parse → match → confirm → create |
| Create | `Controllers/TelegramController.cs` | Webhook + link/status/unlink endpoints |
| Modify | `Data/ApplicationDbContext.cs` | Add DbSet<TelegramUserLink> + config |
| Modify | `Program.cs` | Register new services + HttpClient for Claude API |
| Create | `Migrations/[timestamp]_AddTelegramUserLink.cs` | EF migration (auto-generated) |

### Web App (gurkan-ui/)

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/pages/Settings/TelegramLink.tsx` | Telegram linking page with code input |
| Create | `src/pages/Settings/TelegramLink.css` | Styles |
| Modify | `src/api/client.ts` | Add telegram link/unlink/status API functions |
| Modify | `src/types.ts` | Add TelegramLink types |
| Modify | `src/App.tsx` | Add /settings/telegram route |
| Modify | `src/components/Layout.tsx` | Add settings nav item |

### Mobile App (gurkan-mobile/)

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/(tabs)/settings.tsx` | Settings screen with Telegram linking |
| Modify | `src/api/client.ts` | Add telegram link/unlink/status API functions |
| Modify | `src/api/types.ts` | Add TelegramLink types |
| Modify | `app/(tabs)/_layout.tsx` | Add Settings tab |

### Tests (GurkanApi.Tests/)

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `TelegramTests.cs` | Integration tests for linking and webhook auth |

---

## Task 1: TelegramUserLink Entity + Migration

**Files:**
- Create: `GurkanApi/Entities/TelegramUserLink.cs`
- Modify: `GurkanApi/Data/ApplicationDbContext.cs`
- Migration: auto-generated

- [ ] **Step 1: Create TelegramUserLink entity**

```csharp
// GurkanApi/Entities/TelegramUserLink.cs
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
```

- [ ] **Step 2: Add DbSet and configuration to ApplicationDbContext**

Add `DbSet<TelegramUserLink>` and fluent configuration in `OnModelCreating`:

```csharp
// DbSet
public DbSet<TelegramUserLink> TelegramUserLinks { get; set; }

// In OnModelCreating
modelBuilder.Entity<TelegramUserLink>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
    entity.Property(e => e.TelegramUsername).HasMaxLength(200);
    entity.Property(e => e.LinkCode).HasMaxLength(6).IsRequired();
    entity.Property(e => e.CreatedAt).HasDefaultValueSql("now() at time zone 'utc'");

    entity.HasIndex(e => e.TelegramUserId).IsUnique();
    entity.HasIndex(e => e.UserId).IsUnique().HasFilter("\"UserId\" IS NOT NULL");
    entity.HasIndex(e => e.LinkCode);

    entity.HasOne(e => e.User)
        .WithOne()
        .HasForeignKey<TelegramUserLink>(e => e.UserId)
        .OnDelete(DeleteBehavior.Cascade)
        .IsRequired(false);
});
```

- [ ] **Step 3: Generate EF migration**

Run: `cd /home/karay/source/gurkan/GurkanApi && dotnet ef migrations add AddTelegramUserLink`

- [ ] **Step 4: Apply migration**

Run: `cd /home/karay/source/gurkan/GurkanApi && dotnet ef database update`

- [ ] **Step 5: Commit**

```bash
git add GurkanApi/Entities/TelegramUserLink.cs GurkanApi/Data/ApplicationDbContext.cs GurkanApi/Migrations/
git commit -m "feat: add TelegramUserLink entity and migration"
```

---

## Task 2: Telegram DTOs

**Files:**
- Create: `GurkanApi/DTOs/Telegram/TelegramLinkRequest.cs`
- Create: `GurkanApi/DTOs/Telegram/TelegramLinkResponse.cs`

- [ ] **Step 1: Create DTOs**

```csharp
// GurkanApi/DTOs/Telegram/TelegramLinkRequest.cs
namespace GurkanApi.DTOs.Telegram;

using System.ComponentModel.DataAnnotations;

public class TelegramLinkRequest
{
    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string LinkCode { get; set; } = null!;
}
```

```csharp
// GurkanApi/DTOs/Telegram/TelegramLinkResponse.cs
namespace GurkanApi.DTOs.Telegram;

public class TelegramLinkResponse
{
    public bool IsLinked { get; set; }
    public long? TelegramUserId { get; set; }
    public string? TelegramUsername { get; set; }
    public DateTime? LinkedAt { get; set; }
}
```

- [ ] **Step 2: Commit**

```bash
git add GurkanApi/DTOs/Telegram/
git commit -m "feat: add Telegram DTOs"
```

---

## Task 3: TelegramBotService

**Files:**
- Create: `GurkanApi/Services/ITelegramBotService.cs`
- Create: `GurkanApi/Services/TelegramBotService.cs`
- Modify: `GurkanApi/Program.cs` (NuGet + DI registration)

- [ ] **Step 1: Install Telegram.Bot NuGet package**

Run: `cd /home/karay/source/gurkan/GurkanApi && dotnet add package Telegram.Bot`

- [ ] **Step 2: Add Telegram config to appsettings.json**

Add to `appsettings.json` and `appsettings.Development.json`:

```json
"Telegram": {
  "BotToken": "YOUR_BOT_TOKEN_HERE",
  "WebhookSecret": "YOUR_WEBHOOK_SECRET_HERE"
}
```

- [ ] **Step 3: Create ITelegramBotService interface**

```csharp
// GurkanApi/Services/ITelegramBotService.cs
namespace GurkanApi.Services;

public interface ITelegramBotService
{
    Task SendMessageAsync(long chatId, string text);
    Task SendMessageWithKeyboardAsync(long chatId, string text, IEnumerable<IEnumerable<(string Text, string CallbackData)>> buttons);
    Task AnswerCallbackQueryAsync(string callbackQueryId);
    Task<byte[]> DownloadFileAsync(string fileId);
}
```

- [ ] **Step 4: Create TelegramBotService implementation**

```csharp
// GurkanApi/Services/TelegramBotService.cs
namespace GurkanApi.Services;

using Telegram.Bot;
using Telegram.Bot.Types.ReplyMarkups;

public class TelegramBotService : ITelegramBotService
{
    private readonly TelegramBotClient _bot;
    private readonly ILogger<TelegramBotService> _logger;

    public TelegramBotService(IConfiguration config, ILogger<TelegramBotService> logger)
    {
        _bot = new TelegramBotClient(config["Telegram:BotToken"]!);
        _logger = logger;
    }

    public async Task SendMessageAsync(long chatId, string text)
    {
        await _bot.SendMessage(chatId, text);
    }

    public async Task SendMessageWithKeyboardAsync(long chatId, string text,
        IEnumerable<IEnumerable<(string Text, string CallbackData)>> buttons)
    {
        var keyboard = new InlineKeyboardMarkup(
            buttons.Select(row =>
                row.Select(b => InlineKeyboardButton.WithCallbackData(b.Text, b.CallbackData))));

        await _bot.SendMessage(chatId, text, replyMarkup: keyboard);
    }

    public async Task AnswerCallbackQueryAsync(string callbackQueryId)
    {
        await _bot.AnswerCallbackQuery(callbackQueryId);
    }

    public async Task<byte[]> DownloadFileAsync(string fileId)
    {
        var file = await _bot.GetFile(fileId);
        using var stream = new MemoryStream();
        await _bot.DownloadFile(file.FilePath!, stream);
        return stream.ToArray();
    }
}
```

- [ ] **Step 5: Register service in Program.cs**

Add to `Program.cs` service registrations:

```csharp
builder.Services.AddSingleton<ITelegramBotService, TelegramBotService>();
```

- [ ] **Step 6: Verify build**

Run: `cd /home/karay/source/gurkan/GurkanApi && dotnet build`

- [ ] **Step 7: Commit**

```bash
git add GurkanApi/Services/ITelegramBotService.cs GurkanApi/Services/TelegramBotService.cs GurkanApi/Program.cs GurkanApi/GurkanApi.csproj GurkanApi/appsettings*.json
git commit -m "feat: add TelegramBotService with Telegram.Bot SDK"
```

---

## Task 4: BillParserService (Claude Vision API)

**Files:**
- Create: `GurkanApi/Services/IBillParserService.cs`
- Create: `GurkanApi/Services/BillParserService.cs`
- Modify: `GurkanApi/Program.cs` (HttpClient + DI)

- [ ] **Step 1: Add Anthropic config to appsettings.json**

```json
"Anthropic": {
  "ApiKey": "YOUR_ANTHROPIC_API_KEY_HERE",
  "Model": "claude-sonnet-4-20250514"
}
```

- [ ] **Step 2: Create IBillParserService interface**

```csharp
// GurkanApi/Services/IBillParserService.cs
namespace GurkanApi.Services;

using GurkanApi.Entities;

public class ParsedBill
{
    public BillType? BillType { get; set; }
    public decimal? Amount { get; set; }
    public Currency? Currency { get; set; }
    public DateTime? DueDate { get; set; }
    public string? SubscriberNo { get; set; }
    public string? Provider { get; set; }
    public bool IsRecognized { get; set; }
}

public interface IBillParserService
{
    Task<ParsedBill> ParseBillImageAsync(byte[] imageData);
    Task<ParsedBill> ParseBillTextAsync(string text);
}
```

- [ ] **Step 3: Create BillParserService implementation**

```csharp
// GurkanApi/Services/BillParserService.cs
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

    private static string DetectMediaType(byte[] data)
    {
        if (data.Length >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF) return "image/jpeg";
        if (data.Length >= 8 && data[0] == 0x89 && data[1] == 0x50) return "image/png";
        if (data.Length >= 4 && data[0] == 0x52 && data[1] == 0x49) return "image/webp";
        return "image/jpeg";
    }

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

    private static T? ParseEnum<T>(JsonElement root, string property) where T : struct, Enum
    {
        if (!root.TryGetProperty(property, out var val) || val.ValueKind != JsonValueKind.String)
            return null;
        return Enum.TryParse<T>(val.GetString(), true, out var result) ? result : null;
    }
}
```

- [ ] **Step 4: Register HttpClient and service in Program.cs**

```csharp
builder.Services.AddHttpClient("Anthropic", client =>
{
    client.BaseAddress = new Uri("https://api.anthropic.com/");
    client.DefaultRequestHeaders.Add("x-api-key", builder.Configuration["Anthropic:ApiKey"]);
    client.DefaultRequestHeaders.Add("anthropic-version", "2024-10-22");
});
builder.Services.AddScoped<IBillParserService, BillParserService>();
```

- [ ] **Step 5: Verify build**

Run: `cd /home/karay/source/gurkan/GurkanApi && dotnet build`

- [ ] **Step 6: Commit**

```bash
git add GurkanApi/Services/IBillParserService.cs GurkanApi/Services/BillParserService.cs GurkanApi/Program.cs GurkanApi/appsettings*.json
git commit -m "feat: add BillParserService with Claude Vision API integration"
```

---

## Task 5: SubscriptionMatcherService

**Files:**
- Create: `GurkanApi/Services/ISubscriptionMatcherService.cs`
- Create: `GurkanApi/Services/SubscriptionMatcherService.cs`

- [ ] **Step 1: Create ISubscriptionMatcherService interface**

```csharp
// GurkanApi/Services/ISubscriptionMatcherService.cs
namespace GurkanApi.Services;

using GurkanApi.Entities;

public class SubscriptionMatch
{
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = null!;
}

public interface ISubscriptionMatcherService
{
    Task<SubscriptionMatch?> FindMatchAsync(Guid userId, UserRole role, string? subscriberNo, BillType billType);
    Task<List<SubscriptionMatch>> GetAccessiblePropertiesAsync(Guid userId, UserRole role);
    Task UpdateSubscriptionNoAsync(Guid propertyId, BillType billType, string subscriberNo);
}
```

- [ ] **Step 2: Create SubscriptionMatcherService implementation**

```csharp
// GurkanApi/Services/SubscriptionMatcherService.cs
namespace GurkanApi.Services;

using GurkanApi.Data;
using GurkanApi.Entities;
using Microsoft.EntityFrameworkCore;

public class SubscriptionMatcherService : ISubscriptionMatcherService
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;

    public SubscriptionMatcherService(ApplicationDbContext db, IGroupAccessService access)
    {
        _db = db;
        _access = access;
    }

    public async Task<SubscriptionMatch?> FindMatchAsync(Guid userId, UserRole role, string? subscriberNo, BillType billType)
    {
        if (string.IsNullOrWhiteSpace(subscriberNo))
            return null;

        var subscriptionType = MapBillTypeToSubscriptionType(billType);
        var groupIds = await _access.GetUserGroupIdsAsync(userId);

        var match = await _db.PropertySubscriptions
            .Include(ps => ps.Property)
            .Where(ps =>
                ps.SubscriptionNo == subscriberNo &&
                ps.Type == subscriptionType &&
                ps.Property.GroupId != null &&
                (role == UserRole.SuperAdmin || groupIds.Contains(ps.Property.GroupId.Value)))
            .Select(ps => new SubscriptionMatch
            {
                PropertyId = ps.PropertyId,
                PropertyName = ps.Property.Name
            })
            .FirstOrDefaultAsync();

        return match;
    }

    public async Task<List<SubscriptionMatch>> GetAccessiblePropertiesAsync(Guid userId, UserRole role)
    {
        var groupIds = await _access.GetUserGroupIdsAsync(userId);

        return await _db.Properties
            .Where(p => role == UserRole.SuperAdmin || (p.GroupId != null && groupIds.Contains(p.GroupId.Value)))
            .Select(p => new SubscriptionMatch
            {
                PropertyId = p.Id,
                PropertyName = p.Name
            })
            .OrderBy(p => p.PropertyName)
            .ToListAsync();
    }

    public async Task UpdateSubscriptionNoAsync(Guid propertyId, BillType billType, string subscriberNo)
    {
        var subscriptionType = MapBillTypeToSubscriptionType(billType);
        var subscription = await _db.PropertySubscriptions
            .FirstOrDefaultAsync(ps => ps.PropertyId == propertyId && ps.Type == subscriptionType);

        if (subscription != null)
        {
            subscription.SubscriptionNo = subscriberNo;
        }
        else
        {
            _db.PropertySubscriptions.Add(new PropertySubscription
            {
                PropertyId = propertyId,
                Type = subscriptionType,
                SubscriptionNo = subscriberNo,
                HolderType = SubscriptionHolderType.User
            });
        }

        await _db.SaveChangesAsync();
    }

    private static SubscriptionType MapBillTypeToSubscriptionType(BillType billType) => billType switch
    {
        BillType.Water => SubscriptionType.Water,
        BillType.Electric => SubscriptionType.Electric,
        BillType.Gas => SubscriptionType.Gas,
        BillType.Internet => SubscriptionType.Internet,
        BillType.Dues => SubscriptionType.Dues,
        _ => throw new ArgumentOutOfRangeException(nameof(billType))
    };
}
```

- [ ] **Step 3: Register service in Program.cs**

```csharp
builder.Services.AddScoped<ISubscriptionMatcherService, SubscriptionMatcherService>();
```

- [ ] **Step 4: Verify build**

Run: `cd /home/karay/source/gurkan/GurkanApi && dotnet build`

- [ ] **Step 5: Commit**

```bash
git add GurkanApi/Services/ISubscriptionMatcherService.cs GurkanApi/Services/SubscriptionMatcherService.cs GurkanApi/Program.cs
git commit -m "feat: add SubscriptionMatcherService for bill-to-property matching"
```

---

## Task 6: TelegramBillHandler (Orchestrator)

**Files:**
- Create: `GurkanApi/Services/TelegramBillHandler.cs`

This is the core orchestrator that manages conversation state and coordinates parsing, matching, confirmation, and bill creation.

- [ ] **Step 1: Create TelegramBillHandler**

```csharp
// GurkanApi/Services/TelegramBillHandler.cs
namespace GurkanApi.Services;

using System.Collections.Concurrent;
using GurkanApi.Data;
using GurkanApi.Entities;
using Microsoft.EntityFrameworkCore;

public enum PendingBillStep
{
    AwaitingConfirmation,
    AwaitingPropertySelection,
    AwaitingTypeEdit,
    AwaitingAmountEdit,
    AwaitingDueDateEdit
}

public class PendingBillState
{
    public ParsedBill ParsedBill { get; set; } = null!;
    public Guid? PropertyId { get; set; }
    public string? PropertyName { get; set; }
    public PendingBillStep Step { get; set; }
    public Guid UserId { get; set; }
    public UserRole UserRole { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class TelegramBillHandler
{
    private static readonly ConcurrentDictionary<long, PendingBillState> _pendingBills = new();
    private static readonly ConcurrentDictionary<long, (int Count, DateTime WindowStart)> _rateLimits = new();

    private readonly IBillParserService _parser;
    private readonly ISubscriptionMatcherService _matcher;
    private readonly ITelegramBotService _bot;
    private readonly ApplicationDbContext _db;
    private readonly ILogger<TelegramBillHandler> _logger;

    public TelegramBillHandler(
        IBillParserService parser,
        ISubscriptionMatcherService matcher,
        ITelegramBotService bot,
        ApplicationDbContext db,
        ILogger<TelegramBillHandler> logger)
    {
        _parser = parser;
        _matcher = matcher;
        _bot = bot;
        _db = db;
        _logger = logger;
    }

    public async Task HandlePhotoAsync(long chatId, Guid userId, UserRole role, string fileId)
    {
        if (!CheckRateLimit(chatId)) { await _bot.SendMessageAsync(chatId, "Saatlik fatura limitine ulaştınız. Lütfen daha sonra tekrar deneyin."); return; }

        await _bot.SendMessageAsync(chatId, "Fatura analiz ediliyor...");
        var imageData = await _bot.DownloadFileAsync(fileId);
        var parsed = await _parser.ParseBillImageAsync(imageData);
        await ProcessParsedBill(chatId, userId, role, parsed);
    }

    public async Task HandleTextAsync(long chatId, Guid userId, UserRole role, string text)
    {
        if (_pendingBills.TryGetValue(chatId, out var state))
        {
            await HandleEditResponse(chatId, state, text);
            return;
        }

        if (!CheckRateLimit(chatId)) { await _bot.SendMessageAsync(chatId, "Saatlik fatura limitine ulaştınız. Lütfen daha sonra tekrar deneyin."); return; }

        await _bot.SendMessageAsync(chatId, "Metin analiz ediliyor...");
        var parsed = await _parser.ParseBillTextAsync(text);
        await ProcessParsedBill(chatId, userId, role, parsed);
    }

    public async Task HandleCallbackAsync(long chatId, string callbackQueryId, Guid userId, UserRole role, string data)
    {
        await _bot.AnswerCallbackQueryAsync(callbackQueryId);

        if (!_pendingBills.TryGetValue(chatId, out var state))
        {
            await _bot.SendMessageAsync(chatId, "Bu işlemin süresi dolmuş. Lütfen faturayı tekrar gönderin.");
            return;
        }

        switch (data)
        {
            case "confirm":
                await CreateBill(chatId, state);
                break;
            case "cancel":
                _pendingBills.TryRemove(chatId, out _);
                await _bot.SendMessageAsync(chatId, "İşlem iptal edildi.");
                break;
            case "edit":
                state.Step = PendingBillStep.AwaitingTypeEdit;
                await SendTypeSelection(chatId);
                break;
            case "confirm_duplicate":
                await CreateBill(chatId, state);
                break;
            case "cancel_duplicate":
                _pendingBills.TryRemove(chatId, out _);
                await _bot.SendMessageAsync(chatId, "İşlem iptal edildi.");
                break;
            default:
                if (data.StartsWith("prop:"))
                    await HandlePropertySelection(chatId, state, data);
                else if (data.StartsWith("type:"))
                    await HandleTypeSelection(chatId, state, data);
                break;
        }
    }

    private async Task ProcessParsedBill(long chatId, Guid userId, UserRole role, ParsedBill parsed)
    {
        if (!parsed.IsRecognized)
        {
            await _bot.SendMessageAsync(chatId, "Bu bir fatura gibi görünmüyor. Lütfen bir fatura fotoğrafı veya SMS metni gönderin.");
            return;
        }

        if (parsed.BillType == null || parsed.Amount == null)
        {
            await _bot.SendMessageAsync(chatId, "Fatura tipi veya tutarı okunamadı. Lütfen daha net bir fotoğraf gönderin veya bilgileri manuel girin.");
            return;
        }

        var state = new PendingBillState
        {
            ParsedBill = parsed,
            UserId = userId,
            UserRole = role,
            Step = PendingBillStep.AwaitingConfirmation
        };

        var match = await _matcher.FindMatchAsync(userId, role, parsed.SubscriberNo, parsed.BillType.Value);
        if (match != null)
        {
            state.PropertyId = match.PropertyId;
            state.PropertyName = match.PropertyName;
        }

        _pendingBills[chatId] = state;

        if (state.PropertyId == null)
        {
            state.Step = PendingBillStep.AwaitingPropertySelection;
            var properties = await _matcher.GetAccessiblePropertiesAsync(userId, role);
            if (properties.Count == 0)
            {
                await _bot.SendMessageAsync(chatId, "Erişebileceğiniz mülk bulunamadı.");
                _pendingBills.TryRemove(chatId, out _);
                return;
            }

            var buttons = properties.Select(p =>
                new[] { ($"{p.PropertyName}", $"prop:{p.PropertyId}") }.AsEnumerable());
            await _bot.SendMessageWithKeyboardAsync(chatId, "Bu fatura hangi mülke ait?", buttons);
            return;
        }

        await SendConfirmation(chatId, state);
    }

    private async Task HandlePropertySelection(long chatId, PendingBillState state, string data)
    {
        if (!Guid.TryParse(data[5..], out var propertyId)) { await _bot.SendMessageAsync(chatId, "Geçersiz seçim."); return; }
        var properties = await _matcher.GetAccessiblePropertiesAsync(state.UserId, state.UserRole);
        var selected = properties.FirstOrDefault(p => p.PropertyId == propertyId);
        if (selected == null) { await _bot.SendMessageAsync(chatId, "Geçersiz seçim."); return; }

        state.PropertyId = selected.PropertyId;
        state.PropertyName = selected.PropertyName;
        state.Step = PendingBillStep.AwaitingConfirmation;

        if (state.ParsedBill.SubscriberNo != null && state.ParsedBill.BillType != null)
            await _matcher.UpdateSubscriptionNoAsync(propertyId, state.ParsedBill.BillType.Value, state.ParsedBill.SubscriberNo);

        await SendConfirmation(chatId, state);
    }

    private async Task SendConfirmation(long chatId, PendingBillState state)
    {
        var bill = state.ParsedBill;
        var typeLabel = GetTurkishBillType(bill.BillType!.Value);
        var amountText = $"{bill.Amount:N2} {bill.Currency ?? Entities.Currency.TRY}";
        var dateText = bill.DueDate?.ToString("dd MMMM yyyy", new System.Globalization.CultureInfo("tr-TR")) ?? "Belirtilmemiş";

        var duplicate = await CheckDuplicate(state);

        var text = $"Fatura Algılandı\n\nTip: {typeLabel}\nTutar: {amountText}\nSon Ödeme: {dateText}\nMülk: {state.PropertyName}";

        if (duplicate)
        {
            text += "\n\nBu fatura zaten kayıtlı gibi görünüyor. Yine de kaydetmek ister misiniz?";
            var buttons = new[] {
                new[] { ("Evet, Kaydet", "confirm_duplicate"), ("Hayır", "cancel_duplicate") }.AsEnumerable()
            };
            await _bot.SendMessageWithKeyboardAsync(chatId, text, buttons);
        }
        else
        {
            var buttons = new[] {
                new[] { ("Kaydet", "confirm"), ("İptal", "cancel"), ("Düzelt", "edit") }.AsEnumerable()
            };
            await _bot.SendMessageWithKeyboardAsync(chatId, text, buttons);
        }
    }

    private async Task<bool> CheckDuplicate(PendingBillState state)
    {
        if (state.PropertyId == null || state.ParsedBill.BillType == null || state.ParsedBill.Amount == null)
            return false;

        return await _db.Bills.AnyAsync(b =>
            b.PropertyId == state.PropertyId &&
            b.Type == state.ParsedBill.BillType &&
            b.Amount == state.ParsedBill.Amount &&
            (state.ParsedBill.DueDate == null || b.DueDate.Date == state.ParsedBill.DueDate.Value.Date));
    }

    private async Task SendTypeSelection(long chatId)
    {
        var buttons = new[]
        {
            new[] { ("Su", "type:Water"), ("Elektrik", "type:Electric") }.AsEnumerable(),
            new[] { ("Doğalgaz", "type:Gas"), ("İnternet", "type:Internet") }.AsEnumerable(),
            new[] { ("Aidat", "type:Dues") }.AsEnumerable()
        };
        await _bot.SendMessageWithKeyboardAsync(chatId, "Fatura tipini seçin:", buttons);
    }

    private async Task HandleTypeSelection(long chatId, PendingBillState state, string data)
    {
        var typeStr = data[5..];
        if (Enum.TryParse<BillType>(typeStr, out var billType))
        {
            state.ParsedBill.BillType = billType;
            state.Step = PendingBillStep.AwaitingAmountEdit;
            await _bot.SendMessageAsync(chatId, $"Tutarı girin (örn: 125,50):");
        }
    }

    private async Task HandleEditResponse(long chatId, PendingBillState state, string text)
    {
        switch (state.Step)
        {
            case PendingBillStep.AwaitingAmountEdit:
                var normalized = text.Replace(",", ".").Trim();
                if (decimal.TryParse(normalized, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var amount))
                {
                    state.ParsedBill.Amount = amount;
                    state.Step = PendingBillStep.AwaitingDueDateEdit;
                    await _bot.SendMessageAsync(chatId, "Son ödeme tarihini girin (GG.AA.YYYY):");
                }
                else
                {
                    await _bot.SendMessageAsync(chatId, "Geçersiz tutar. Örnek: 125,50");
                }
                break;

            case PendingBillStep.AwaitingDueDateEdit:
                if (DateTime.TryParseExact(text.Trim(), new[] { "dd.MM.yyyy", "dd/MM/yyyy", "yyyy-MM-dd" },
                    System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var date))
                {
                    state.ParsedBill.DueDate = date;
                    state.Step = PendingBillStep.AwaitingConfirmation;
                    await SendConfirmation(chatId, state);
                }
                else
                {
                    await _bot.SendMessageAsync(chatId, "Geçersiz tarih. Örnek: 15.04.2026");
                }
                break;

            default:
                await _bot.SendMessageAsync(chatId, "Bir fatura fotoğrafı veya SMS metni gönderin.");
                break;
        }
    }

    private async Task CreateBill(long chatId, PendingBillState state)
    {
        var bill = new Bill
        {
            PropertyId = state.PropertyId!.Value,
            Type = state.ParsedBill.BillType!.Value,
            Amount = state.ParsedBill.Amount!.Value,
            Currency = state.ParsedBill.Currency ?? Entities.Currency.TRY,
            DueDate = state.ParsedBill.DueDate ?? DateTime.UtcNow.AddDays(30),
            Status = BillPaymentStatus.Pending,
            Notes = "Telegram bot ile oluşturuldu"
        };

        _db.Bills.Add(bill);
        await _db.SaveChangesAsync();
        _pendingBills.TryRemove(chatId, out _);

        _logger.LogInformation("Bill created via Telegram: BillId={BillId}, PropertyId={PropertyId}, UserId={UserId}",
            bill.Id, bill.PropertyId, state.UserId);

        var typeLabel = GetTurkishBillType(bill.Type);
        await _bot.SendMessageAsync(chatId, $"{typeLabel} faturası kaydedildi ({bill.Amount:N2} {bill.Currency}).");
    }

    private bool CheckRateLimit(long chatId)
    {
        var now = DateTime.UtcNow;
        var entry = _rateLimits.AddOrUpdate(chatId,
            _ => (1, now),
            (_, existing) => (now - existing.WindowStart).TotalHours >= 1
                ? (1, now)
                : (existing.Count + 1, existing.WindowStart));
        return entry.Count <= 10;
    }

    public static void CleanupExpiredStates()
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-30);
        foreach (var kvp in _pendingBills)
        {
            if (kvp.Value.CreatedAt < cutoff)
                _pendingBills.TryRemove(kvp.Key, out _);
        }
    }

    private static string GetTurkishBillType(BillType type) => type switch
    {
        BillType.Water => "Su",
        BillType.Electric => "Elektrik",
        BillType.Gas => "Doğalgaz",
        BillType.Internet => "İnternet",
        BillType.Dues => "Aidat",
        _ => type.ToString()
    };
}
```

- [ ] **Step 1b: Create ITelegramBillHandler interface**

```csharp
// GurkanApi/Services/ITelegramBillHandler.cs
namespace GurkanApi.Services;

public interface ITelegramBillHandler
{
    Task HandlePhotoAsync(long chatId, Guid userId, UserRole role, string fileId);
    Task HandleTextAsync(long chatId, Guid userId, UserRole role, string text);
    Task HandleCallbackAsync(long chatId, string callbackQueryId, Guid userId, UserRole role, string data);
}
```

- [ ] **Step 2: Register in Program.cs**

```csharp
builder.Services.AddScoped<ITelegramBillHandler, TelegramBillHandler>();

// Background cleanup for expired pending bill states (every 5 min)
builder.Services.AddHostedService<TelegramStateCleanupService>();
```

Also create a simple hosted service for cleanup:

```csharp
// Add to bottom of TelegramBillHandler.cs or as separate file
public class TelegramStateCleanupService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            TelegramBillHandler.CleanupExpiredStates();
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}
```

- [ ] **Step 3: Verify build**

Run: `cd /home/karay/source/gurkan/GurkanApi && dotnet build`

- [ ] **Step 4: Commit**

```bash
git add GurkanApi/Services/TelegramBillHandler.cs GurkanApi/Program.cs
git commit -m "feat: add TelegramBillHandler orchestrator with state management"
```

---

## Task 7: TelegramController

**Files:**
- Create: `GurkanApi/Controllers/TelegramController.cs`

- [ ] **Step 1: Create TelegramController**

```csharp
// GurkanApi/Controllers/TelegramController.cs
namespace GurkanApi.Controllers;

using GurkanApi.Data;
using GurkanApi.DTOs.Telegram;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;

[ApiController]
[Route("api/telegram")]
public class TelegramController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ITelegramBillHandler _handler;
    private readonly ITelegramBotService _bot;
    private readonly IConfiguration _config;
    private readonly ILogger<TelegramController> _logger;

    public TelegramController(
        ApplicationDbContext db,
        ITelegramBillHandler handler,
        ITelegramBotService bot,
        IConfiguration config,
        ILogger<TelegramController> logger)
    {
        _db = db;
        _handler = handler;
        _bot = bot;
        _config = config;
        _logger = logger;
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook([FromBody] Update update)
    {
        var secret = Request.Headers["X-Telegram-Bot-Api-Secret-Token"].FirstOrDefault();
        if (secret != _config["Telegram:WebhookSecret"])
            return Unauthorized();

        try
        {
            await ProcessUpdate(update);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Telegram webhook processing error");
        }

        return Ok();
    }

    [HttpPost("link")]
    [Authorize]
    public async Task<IActionResult> Link([FromBody] TelegramLinkRequest request)
    {
        var userId = User.GetUserId();

        var link = await _db.TelegramUserLinks
            .FirstOrDefaultAsync(l => l.LinkCode == request.LinkCode && !l.IsLinked && l.LinkCodeExpiresAt > DateTime.UtcNow);

        if (link == null)
            return BadRequest(new { error = "invalid_code", message = "Geçersiz veya süresi dolmuş kod." });

        var existingForTelegram = await _db.TelegramUserLinks
            .FirstOrDefaultAsync(l => l.TelegramUserId == link.TelegramUserId && l.IsLinked && l.Id != link.Id);
        if (existingForTelegram != null)
            return BadRequest(new { error = "already_linked", message = "Bu Telegram hesabı başka bir kullanıcıya bağlı." });

        var existingForUser = await _db.TelegramUserLinks
            .FirstOrDefaultAsync(l => l.UserId == userId && l.Id != link.Id);
        if (existingForUser != null)
            _db.TelegramUserLinks.Remove(existingForUser);

        link.UserId = userId;
        link.IsLinked = true;
        link.LinkedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _bot.SendMessageAsync(link.TelegramUserId, "Hesabınız başarıyla bağlandı! Artık fatura fotoğrafı veya SMS metni gönderebilirsiniz.");

        _logger.LogInformation("Telegram linked: UserId={UserId}, TelegramUserId={TelegramUserId}", userId, link.TelegramUserId);

        return Ok(MapLinkResponse(link));
    }

    [HttpGet("status")]
    [Authorize]
    public async Task<IActionResult> GetStatus()
    {
        var userId = User.GetUserId();
        var link = await _db.TelegramUserLinks.FirstOrDefaultAsync(l => l.UserId == userId && l.IsLinked);
        return Ok(link != null ? MapLinkResponse(link) : new TelegramLinkResponse { IsLinked = false });
    }

    [HttpDelete("link")]
    [Authorize]
    public async Task<IActionResult> Unlink()
    {
        var userId = User.GetUserId();
        var link = await _db.TelegramUserLinks.FirstOrDefaultAsync(l => l.UserId == userId);

        if (link == null)
            return NotFound(new { error = "not_found", message = "Telegram bağlantısı bulunamadı." });

        if (link.IsLinked)
            await _bot.SendMessageAsync(link.TelegramUserId, "Hesap bağlantınız kaldırıldı.");

        _db.TelegramUserLinks.Remove(link);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private async Task ProcessUpdate(Update update)
    {

        if (update.Type == UpdateType.Message && update.Message != null)
        {
            var message = update.Message;
            var chatId = message.Chat.Id;

            if (message.Text == "/start")
            {
                await HandleStart(chatId, message.From!);
                return;
            }

            var link = await _db.TelegramUserLinks.FirstOrDefaultAsync(l => l.TelegramUserId == chatId && l.IsLinked);
            if (link == null)
            {
                await _bot.SendMessageAsync(chatId, "Hesabınız bağlı değil. /start yazarak bağlantı kodu alın.");
                return;
            }

            var user = await _db.Users.FindAsync(link.UserId);
            if (user == null) return;

            if (message.Photo != null && message.Photo.Length > 0)
            {
                var photo = message.Photo.OrderByDescending(p => p.FileSize).First();
                await _handler.HandlePhotoAsync(chatId, user.Id, user.Role, photo.FileId);
            }
            else if (!string.IsNullOrWhiteSpace(message.Text))
            {
                await _handler.HandleTextAsync(chatId, user.Id, user.Role, message.Text);
            }
        }
        else if (update.Type == UpdateType.CallbackQuery && update.CallbackQuery != null)
        {
            var callback = update.CallbackQuery;
            var chatId = callback.Message!.Chat.Id;

            var link = await _db.TelegramUserLinks.FirstOrDefaultAsync(l => l.TelegramUserId == chatId && l.IsLinked);
            if (link == null) return;

            var user = await _db.Users.FindAsync(link.UserId);
            if (user == null) return;

            await _handler.HandleCallbackAsync(chatId, callback.Id, user.Id, user.Role, callback.Data!);
        }
    }

    private async Task HandleStart(long chatId, Telegram.Bot.Types.User telegramUser)
    {
        var code = Random.Shared.Next(100000, 999999).ToString();

        var existing = await _db.TelegramUserLinks.FirstOrDefaultAsync(l => l.TelegramUserId == chatId);
        if (existing != null)
        {
            if (existing.IsLinked)
            {
                await _bot.SendMessageAsync(chatId, "Hesabınız zaten bağlı. Fatura fotoğrafı veya SMS metni gönderebilirsiniz.");
                return;
            }
            existing.LinkCode = code;
            existing.LinkCodeExpiresAt = DateTime.UtcNow.AddMinutes(10);
            existing.TelegramUsername = telegramUser.Username;
        }
        else
        {
            _db.TelegramUserLinks.Add(new TelegramUserLink
            {
                TelegramUserId = chatId,
                TelegramUsername = telegramUser.Username,
                LinkCode = code,
                LinkCodeExpiresAt = DateTime.UtcNow.AddMinutes(10)
            });
        }

        await _db.SaveChangesAsync();

        await _bot.SendMessageAsync(chatId,
            $"Bağlantı kodunuz: {code}\n\nBu kodu 10 dakika içinde Gürkan uygulamasından girin.\n(Ayarlar → Telegram Bağla)");
    }

    private static TelegramLinkResponse MapLinkResponse(TelegramUserLink link) => new()
    {
        IsLinked = link.IsLinked,
        TelegramUserId = link.TelegramUserId,
        TelegramUsername = link.TelegramUsername,
        LinkedAt = link.LinkedAt
    };
}
```

- [ ] **Step 2: Verify build**

Run: `cd /home/karay/source/gurkan/GurkanApi && dotnet build`

- [ ] **Step 3: Commit**

```bash
git add GurkanApi/Controllers/TelegramController.cs
git commit -m "feat: add TelegramController with webhook, linking, and status endpoints"
```

---

## Task 8: Integration Tests

**Files:**
- Create: `GurkanApi.Tests/TelegramTests.cs`

- [ ] **Step 1: Create TelegramTests**

Tests for the link/status/unlink endpoints (webhook tested manually with real Telegram).

First, register a no-op `ITelegramBotService` in the test factory so Telegram API calls don't fail:

```csharp
// In CustomWebApplicationFactory.ConfigureWebHost, add:
services.AddSingleton<ITelegramBotService, NoOpTelegramBotService>();

// NoOpTelegramBotService — stub that does nothing
public class NoOpTelegramBotService : ITelegramBotService
{
    public Task SendMessageAsync(long chatId, string text) => Task.CompletedTask;
    public Task SendMessageWithKeyboardAsync(long chatId, string text, IEnumerable<IEnumerable<(string, string)>> buttons) => Task.CompletedTask;
    public Task AnswerCallbackQueryAsync(string callbackQueryId) => Task.CompletedTask;
    public Task<byte[]> DownloadFileAsync(string fileId) => Task.FromResult(Array.Empty<byte>());
}
```

Then the test file:

```csharp
// GurkanApi.Tests/TelegramTests.cs
namespace GurkanApi.Tests;

using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.Telegram;
using GurkanApi.Data;
using Microsoft.Extensions.DependencyInjection;

[Trait("Category", "Telegram")]
public class TelegramTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _adminClient;

    public TelegramTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _adminClient = factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();
        await _adminClient.LoginAsAsync("admin@gurkan.com", "Admin123!");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetStatus_NoLink_ReturnsUnlinked()
    {
        var response = await _adminClient.GetAsync("/api/telegram/status");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var status = await response.Content.ReadAsApiJsonAsync<TelegramLinkResponse>();
        Assert.False(status.IsLinked);
    }

    [Fact]
    public async Task Link_InvalidCode_ReturnsBadRequest()
    {
        var response = await _adminClient.PostAsJsonAsync("/api/telegram/link", new { linkCode = "000000" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Link_ValidCode_Succeeds()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.TelegramUserLinks.Add(new Entities.TelegramUserLink
        {
            TelegramUserId = 12345,
            TelegramUsername = "testuser",
            LinkCode = "123456",
            LinkCodeExpiresAt = DateTime.UtcNow.AddMinutes(10)
        });
        await db.SaveChangesAsync();

        var response = await _adminClient.PostAsJsonAsync("/api/telegram/link", new { linkCode = "123456" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadAsApiJsonAsync<TelegramLinkResponse>();
        Assert.True(result.IsLinked);
        Assert.Equal(12345, result.TelegramUserId);
    }

    [Fact]
    public async Task Link_ExpiredCode_ReturnsBadRequest()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.TelegramUserLinks.Add(new Entities.TelegramUserLink
        {
            TelegramUserId = 99999,
            LinkCode = "999999",
            LinkCodeExpiresAt = DateTime.UtcNow.AddMinutes(-1)
        });
        await db.SaveChangesAsync();

        var response = await _adminClient.PostAsJsonAsync("/api/telegram/link", new { linkCode = "999999" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Unlink_NoLink_ReturnsNotFound()
    {
        var response = await _adminClient.DeleteAsync("/api/telegram/link");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task FullLinkUnlinkCycle()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.TelegramUserLinks.Add(new Entities.TelegramUserLink
        {
            TelegramUserId = 55555,
            TelegramUsername = "cycletest",
            LinkCode = "555555",
            LinkCodeExpiresAt = DateTime.UtcNow.AddMinutes(10)
        });
        await db.SaveChangesAsync();

        var linkResponse = await _adminClient.PostAsJsonAsync("/api/telegram/link", new { linkCode = "555555" });
        Assert.Equal(HttpStatusCode.OK, linkResponse.StatusCode);

        var statusResponse = await _adminClient.GetAsync("/api/telegram/status");
        var status = await statusResponse.Content.ReadAsApiJsonAsync<TelegramLinkResponse>();
        Assert.True(status.IsLinked);

        var unlinkResponse = await _adminClient.DeleteAsync("/api/telegram/link");
        Assert.Equal(HttpStatusCode.NoContent, unlinkResponse.StatusCode);

        var afterUnlink = await _adminClient.GetAsync("/api/telegram/status");
        var afterStatus = await afterUnlink.Content.ReadAsApiJsonAsync<TelegramLinkResponse>();
        Assert.False(afterStatus.IsLinked);
    }

    [Fact]
    public async Task Webhook_NoSecret_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/telegram/webhook", new { });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cd /home/karay/source/gurkan && dotnet test GurkanApi.Tests/ --filter "Category=Telegram" -v normal`

- [ ] **Step 3: Fix any failures**

- [ ] **Step 4: Commit**

```bash
git add GurkanApi.Tests/TelegramTests.cs
git commit -m "test: add Telegram linking and webhook integration tests"
```

---

## Task 9: Web App — Telegram Linking Page

**Files:**
- Modify: `gurkan-ui/src/api/client.ts` (add API functions)
- Modify: `gurkan-ui/src/types.ts` (add types)
- Create: `gurkan-ui/src/pages/Settings/TelegramLink.tsx`
- Create: `gurkan-ui/src/pages/Settings/TelegramLink.css`
- Modify: `gurkan-ui/src/App.tsx` (add route)
- Modify: `gurkan-ui/src/components/Layout.tsx` (add nav item)

- [ ] **Step 1: Add types to `gurkan-ui/src/types.ts`**

```typescript
export interface TelegramLinkResponse {
  isLinked: boolean;
  telegramUserId: number | null;
  telegramUsername: string | null;
  linkedAt: string | null;
}
```

- [ ] **Step 2: Add API functions to `gurkan-ui/src/api/client.ts`**

```typescript
export async function getTelegramStatus(): Promise<TelegramLinkResponse> {
  const res = await api.get('/telegram/status');
  return res.data;
}

export async function linkTelegram(linkCode: string): Promise<TelegramLinkResponse> {
  const res = await api.post('/telegram/link', { linkCode });
  return res.data;
}

export async function unlinkTelegram(): Promise<void> {
  await api.delete('/telegram/link');
}
```

- [ ] **Step 3: Create TelegramLink page**

Create `gurkan-ui/src/pages/Settings/TelegramLink.tsx` — a settings page with:
- Status display (linked/unlinked, username, linked date)
- Link form: 6-digit code input + submit button
- Unlink button with confirmation
- Follow existing page patterns (useState, useEffect, error banner, loading states)
- Turkish labels throughout

- [ ] **Step 4: Create TelegramLink.css**

Follow existing CSS patterns from other pages (form-card, status-card, etc).

- [ ] **Step 5: Add route to App.tsx**

```tsx
<Route path="/settings/telegram" element={<TelegramLink />} />
```

- [ ] **Step 6: Add nav item to Layout.tsx**

Add "Ayarlar" section in sidebar with "Telegram" sub-item linking to `/settings/telegram`.

- [ ] **Step 7: Verify web app builds**

Run: `cd /home/karay/source/gurkan/gurkan-ui && npm run build`

- [ ] **Step 8: Commit**

```bash
git add gurkan-ui/src/
git commit -m "feat: add Telegram linking page to web app"
```

---

## Task 10: Mobile App — Settings Tab with Telegram Linking

**Files:**
- Modify: `gurkan-mobile/src/api/client.ts` (add API functions)
- Modify: `gurkan-mobile/src/api/types.ts` (add types)
- Create: `gurkan-mobile/app/(tabs)/settings.tsx` (settings screen)
- Modify: `gurkan-mobile/app/(tabs)/_layout.tsx` (add tab)

- [ ] **Step 1: Add types to `gurkan-mobile/src/api/types.ts`**

```typescript
export interface TelegramLinkResponse {
  isLinked: boolean;
  telegramUserId: number | null;
  telegramUsername: string | null;
  linkedAt: string | null;
}
```

- [ ] **Step 2: Add API functions to `gurkan-mobile/src/api/client.ts`**

```typescript
export async function getTelegramStatus(): Promise<TelegramLinkResponse> {
  const res = await api.get('/telegram/status');
  return res.data;
}

export async function linkTelegram(linkCode: string): Promise<TelegramLinkResponse> {
  const res = await api.post('/telegram/link', { linkCode });
  return res.data;
}

export async function unlinkTelegram(): Promise<void> {
  await api.delete('/telegram/link');
}
```

- [ ] **Step 3: Create Settings screen**

Create `gurkan-mobile/app/(tabs)/settings.tsx` — settings screen with:
- Telegram link status (linked/unlinked)
- Link form: 6-digit code input + link button
- Unlink button with Alert.alert confirmation
- Follow existing mobile screen patterns (ScrollView, theme tokens, card-based layout)
- Turkish labels

- [ ] **Step 4: Add Settings tab to layout**

Modify `gurkan-mobile/app/(tabs)/_layout.tsx` — add 4th tab:

```tsx
<Tabs.Screen
  name="settings"
  options={{
    title: 'Ayarlar',
    tabBarIcon: ({ color, size }) => (
      <MaterialIcons name="settings" size={size} color={color} />
    ),
  }}
/>
```

- [ ] **Step 5: Verify mobile app builds**

Run: `cd /home/karay/source/gurkan/gurkan-mobile && npx expo export --platform web`

- [ ] **Step 6: Commit**

```bash
git add gurkan-mobile/
git commit -m "feat: add Settings tab with Telegram linking to mobile app"
```

---

## Task 11: Webhook Setup & Manual Testing

- [ ] **Step 1: Create Telegram bot via @BotFather**

1. Open Telegram, message @BotFather
2. `/newbot` → name: "Gürkan Fatura Bot" → username: pick a unique one
3. Copy the bot token to `appsettings.json` → `Telegram:BotToken`

- [ ] **Step 2: Set webhook with secret**

Generate a webhook secret and set it in `appsettings.json` → `Telegram:WebhookSecret`, then register:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<YOUR_DOMAIN>/api/telegram/webhook", "secret_token": "<SECRET>"}'
```

- [ ] **Step 3: Set Anthropic API key**

Add valid Claude API key to `appsettings.json` → `Anthropic:ApiKey`.

- [ ] **Step 4: Manual test — full flow**

1. Send `/start` to bot → receive link code
2. Enter code in web/mobile app → link confirmation
3. Send a bill photo → bot shows parsed summary
4. Tap "Kaydet" → bill created
5. Verify bill appears in Gürkan app bill list

- [ ] **Step 5: Commit config (without secrets)**

Ensure `appsettings.Development.json` has placeholder values, real secrets in environment variables or user secrets.

```bash
git add -A
git commit -m "chore: finalize Telegram bot configuration"
```
