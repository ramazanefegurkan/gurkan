using GurkanApi.Data;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/push")]
[Authorize]
public class PushController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly INotificationComputeService _notificationComputeService;
    private readonly IPushNotificationService _pushNotificationService;
    private readonly ILogger<PushController> _logger;

    public PushController(
        ApplicationDbContext db,
        INotificationComputeService notificationComputeService,
        IPushNotificationService pushNotificationService,
        ILogger<PushController> logger)
    {
        _db = db;
        _notificationComputeService = notificationComputeService;
        _pushNotificationService = pushNotificationService;
        _logger = logger;
    }

    /// <summary>
    /// Compute current notifications and send push to the user's registered devices.
    /// </summary>
    [HttpPost("trigger")]
    public async Task<IActionResult> Trigger()
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        // Get user's device tokens
        var deviceTokens = await _db.DeviceTokens
            .Where(dt => dt.UserId == userId)
            .Select(dt => dt.ExpoPushToken)
            .ToListAsync();

        if (deviceTokens.Count == 0)
        {
            _logger.LogInformation("Push trigger: no device tokens for UserId={UserId}", userId);
            return Ok(new { message = "No device tokens registered", results = Array.Empty<object>() });
        }

        // Compute notifications
        var notifications = await _notificationComputeService.ComputeNotificationsAsync(userId, role);

        if (notifications.Count == 0)
        {
            _logger.LogInformation("Push trigger: no notifications for UserId={UserId}", userId);
            return Ok(new { message = "No notifications to push", results = Array.Empty<object>() });
        }

        // Group notifications by type and send one consolidated push per type
        var grouped = notifications.GroupBy(n => n.Type);
        var pushResults = new List<object>();

        foreach (var group in grouped)
        {
            var items = group.ToList();
            var (title, body) = BuildPushMessage(group.Key, items);

            var result = await _pushNotificationService.SendPushAsync(
                deviceTokens, title, body,
                new { type = group.Key, count = items.Count });

            pushResults.Add(new
            {
                notificationType = group.Key,
                notificationCount = items.Count,
                ticketCount = result.TicketCount,
                errors = result.Errors,
            });
        }

        _logger.LogInformation(
            "Push trigger completed: UserId={UserId}, NotificationTypes={TypeCount}, Tokens={TokenCount}",
            userId, pushResults.Count, deviceTokens.Count);

        return Ok(new { message = "Push notifications sent", results = pushResults });
    }

    private static (string Title, string Body) BuildPushMessage(string type, List<DTOs.Notifications.NotificationItem> items)
    {
        var count = items.Count;

        return type switch
        {
            "LateRent" => (
                $"{count} gecikmiş kira ödemesi",
                string.Join("\n", items.Select(i => i.Message).Take(5))
            ),
            "UpcomingBill" => (
                $"{count} fatura bildirimi",
                string.Join("\n", items.Select(i => i.Message).Take(5))
            ),
            "LeaseExpiry" => (
                $"{count} sözleşme bitiş bildirimi",
                string.Join("\n", items.Select(i => i.Message).Take(5))
            ),
            "RentIncrease" => (
                $"{count} kira artışı bildirimi",
                string.Join("\n", items.Select(i => i.Message).Take(5))
            ),
            _ => (
                $"{count} bildirim",
                string.Join("\n", items.Select(i => i.Message).Take(5))
            ),
        };
    }
}
