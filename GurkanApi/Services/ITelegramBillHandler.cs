namespace GurkanApi.Services;

using GurkanApi.Entities;

public interface ITelegramBillHandler
{
    Task HandlePhotoAsync(long chatId, Guid userId, UserRole role, string fileId);
    Task HandleTextAsync(long chatId, Guid userId, UserRole role, string text);
    Task HandleCallbackAsync(long chatId, string callbackQueryId, Guid userId, UserRole role, string data);
}
