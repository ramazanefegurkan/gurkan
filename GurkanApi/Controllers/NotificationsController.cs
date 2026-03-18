using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationComputeService _notificationComputeService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(
        INotificationComputeService notificationComputeService,
        ILogger<NotificationsController> logger)
    {
        _notificationComputeService = notificationComputeService;
        _logger = logger;
    }

    /// <summary>
    /// Compute notifications at query time (no DB persistence).
    /// Covers: late rent, upcoming/overdue bills, lease expiry, rent increases.
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
}
