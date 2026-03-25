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
        await _bot.DownloadFile(file, stream);
        return stream.ToArray();
    }
}
