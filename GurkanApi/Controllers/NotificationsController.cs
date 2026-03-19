using GurkanApi.Data;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationComputeService _notificationComputeService;
    private readonly ApplicationDbContext _db;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(
        INotificationComputeService notificationComputeService,
        ApplicationDbContext db,
        ILogger<NotificationsController> logger)
    {
        _notificationComputeService = notificationComputeService;
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Compute notifications at query time.
    /// Dismissed notifications are filtered out.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        var notifications = await _notificationComputeService.ComputeNotificationsAsync(userId, role);

        _logger.LogInformation("Notifications requested: UserId={UserId}, Count={Count}",
            userId, notifications.Count);

        return Ok(notifications);
    }

    /// <summary>
    /// Dismiss a notification by its key so it won't appear again.
    /// </summary>
    [HttpPost("dismiss")]
    public async Task<IActionResult> Dismiss([FromBody] DismissRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Key))
            return BadRequest(new { error = "invalid_key", message = "Notification key is required." });

        var userId = User.GetUserId();

        var exists = await _db.DismissedNotifications
            .AnyAsync(dn => dn.UserId == userId && dn.NotificationKey == request.Key);

        if (!exists)
        {
            _db.DismissedNotifications.Add(new DismissedNotification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                NotificationKey = request.Key,
                DismissedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
        }

        _logger.LogInformation("Notification dismissed: UserId={UserId}, Key={Key}", userId, request.Key);
        return NoContent();
    }

    /// <summary>
    /// Dismiss multiple notifications at once.
    /// </summary>
    [HttpPost("dismiss-all")]
    public async Task<IActionResult> DismissAll([FromBody] DismissAllRequest request)
    {
        if (request.Keys is null || request.Keys.Count == 0)
            return BadRequest(new { error = "invalid_keys", message = "At least one notification key is required." });

        var userId = User.GetUserId();

        var alreadyDismissed = await _db.DismissedNotifications
            .Where(dn => dn.UserId == userId && request.Keys.Contains(dn.NotificationKey))
            .Select(dn => dn.NotificationKey)
            .ToHashSetAsync();

        var newKeys = request.Keys.Where(k => !alreadyDismissed.Contains(k)).ToList();

        foreach (var key in newKeys)
        {
            _db.DismissedNotifications.Add(new DismissedNotification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                NotificationKey = key,
                DismissedAt = DateTime.UtcNow,
            });
        }

        if (newKeys.Count > 0)
            await _db.SaveChangesAsync();

        _logger.LogInformation("Notifications dismissed: UserId={UserId}, Count={Count}", userId, newKeys.Count);
        return NoContent();
    }
}

public class DismissRequest
{
    public string Key { get; set; } = string.Empty;
}

public class DismissAllRequest
{
    public List<string> Keys { get; set; } = [];
}
