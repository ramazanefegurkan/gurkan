namespace GurkanApi.Services;

public interface ITelegramBotService
{
    Task SendMessageAsync(long chatId, string text);
    Task SendMessageWithKeyboardAsync(long chatId, string text, IEnumerable<IEnumerable<(string Text, string CallbackData)>> buttons);
    Task AnswerCallbackQueryAsync(string callbackQueryId);
    Task<byte[]> DownloadFileAsync(string fileId);
}
