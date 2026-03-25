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
        ApplicationDbContext db, ITelegramBillHandler handler, ITelegramBotService bot,
        IConfiguration config, ILogger<TelegramController> logger)
    {
        _db = db; _handler = handler; _bot = bot; _config = config; _logger = logger;
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook([FromBody] Update update)
    {
        var secret = Request.Headers["X-Telegram-Bot-Api-Secret-Token"].FirstOrDefault();
        if (secret != _config["Telegram:WebhookSecret"])
            return Unauthorized();
        try { await ProcessUpdate(update); }
        catch (Exception ex) { _logger.LogError(ex, "Telegram webhook processing error"); }
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
            if (message.Text == "/start") { await HandleStart(chatId, message.From!); return; }

            var link = await _db.TelegramUserLinks.FirstOrDefaultAsync(l => l.TelegramUserId == chatId && l.IsLinked);
            if (link == null) { await _bot.SendMessageAsync(chatId, "Hesabınız bağlı değil. /start yazarak bağlantı kodu alın."); return; }

            var user = await _db.Users.FindAsync(link.UserId);
            if (user == null) return;

            if (message.Photo != null && message.Photo.Length > 0)
            {
                var photo = message.Photo.OrderByDescending(p => p.FileSize).First();
                await _handler.HandlePhotoAsync(chatId, user.Id, user.Role, photo.FileId);
            }
            else if (!string.IsNullOrWhiteSpace(message.Text))
                await _handler.HandleTextAsync(chatId, user.Id, user.Role, message.Text);
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
        await _bot.SendMessageAsync(chatId, $"Bağlantı kodunuz: {code}\n\nBu kodu 10 dakika içinde Gürkan uygulamasından girin.\n(Ayarlar \u2192 Telegram Bağla)");
    }

    private static TelegramLinkResponse MapLinkResponse(TelegramUserLink link) => new()
    {
        IsLinked = link.IsLinked,
        TelegramUserId = link.TelegramUserId,
        TelegramUsername = link.TelegramUsername,
        LinkedAt = link.LinkedAt
    };
}
