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

public class TelegramBillHandler : ITelegramBillHandler
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
            case "confirm_duplicate":
                await CreateBill(chatId, state);
                break;
            case "cancel":
            case "cancel_duplicate":
                _pendingBills.TryRemove(chatId, out _);
                await _bot.SendMessageAsync(chatId, "İşlem iptal edildi.");
                break;
            case "edit":
                state.Step = PendingBillStep.AwaitingTypeEdit;
                await SendTypeSelection(chatId);
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
            ParsedBill = parsed, UserId = userId, UserRole = role,
            Step = PendingBillStep.AwaitingConfirmation
        };
        var match = await _matcher.FindMatchAsync(userId, role, parsed.SubscriberNo, parsed.BillType.Value);
        if (match != null) { state.PropertyId = match.PropertyId; state.PropertyName = match.PropertyName; }
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
            var buttons = properties.Select(p => new[] { (p.PropertyName, $"prop:{p.PropertyId}") }.AsEnumerable());
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
        var amountText = $"{bill.Amount:N2} {bill.Currency ?? Currency.TRY}";
        var dateText = bill.DueDate?.ToString("dd MMMM yyyy", new System.Globalization.CultureInfo("tr-TR")) ?? "Belirtilmemiş";
        var duplicate = await CheckDuplicate(state);
        var text = $"Fatura Algılandı\n\nTip: {typeLabel}\nTutar: {amountText}\nSon Ödeme: {dateText}\nMülk: {state.PropertyName}";
        if (duplicate)
        {
            text += "\n\nBu fatura zaten kayıtlı gibi görünüyor. Yine de kaydetmek ister misiniz?";
            var buttons = new[] { new[] { ("Evet, Kaydet", "confirm_duplicate"), ("Hayır", "cancel_duplicate") }.AsEnumerable() };
            await _bot.SendMessageWithKeyboardAsync(chatId, text, buttons);
        }
        else
        {
            var buttons = new[] { new[] { ("Kaydet", "confirm"), ("İptal", "cancel"), ("Düzelt", "edit") }.AsEnumerable() };
            await _bot.SendMessageWithKeyboardAsync(chatId, text, buttons);
        }
    }

    private async Task<bool> CheckDuplicate(PendingBillState state)
    {
        if (state.PropertyId == null || state.ParsedBill.BillType == null || state.ParsedBill.Amount == null) return false;
        return await _db.Bills.AnyAsync(b =>
            b.PropertyId == state.PropertyId && b.Type == state.ParsedBill.BillType &&
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
            await _bot.SendMessageAsync(chatId, "Tutarı girin (örn: 125,50):");
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
                    await _bot.SendMessageAsync(chatId, "Geçersiz tutar. Örnek: 125,50");
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
                    await _bot.SendMessageAsync(chatId, "Geçersiz tarih. Örnek: 15.04.2026");
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
            Currency = state.ParsedBill.Currency ?? Currency.TRY,
            DueDate = state.ParsedBill.DueDate ?? DateTime.UtcNow.AddDays(30),
            Status = BillPaymentStatus.Pending,
            Notes = "Telegram bot ile oluşturuldu"
        };
        _db.Bills.Add(bill);
        await _db.SaveChangesAsync();
        _pendingBills.TryRemove(chatId, out _);
        _logger.LogInformation("Bill created via Telegram: BillId={BillId}, PropertyId={PropertyId}, UserId={UserId}", bill.Id, bill.PropertyId, state.UserId);
        var typeLabel = GetTurkishBillType(bill.Type);
        await _bot.SendMessageAsync(chatId, $"{typeLabel} faturası kaydedildi ({bill.Amount:N2} {bill.Currency}).");
    }

    private bool CheckRateLimit(long chatId)
    {
        var now = DateTime.UtcNow;
        var entry = _rateLimits.AddOrUpdate(chatId,
            _ => (1, now),
            (_, existing) => (now - existing.WindowStart).TotalHours >= 1 ? (1, now) : (existing.Count + 1, existing.WindowStart));
        return entry.Count <= 10;
    }

    public static void CleanupExpiredStates()
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-30);
        foreach (var kvp in _pendingBills)
            if (kvp.Value.CreatedAt < cutoff)
                _pendingBills.TryRemove(kvp.Key, out _);
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
