using GurkanApi.Data;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/device-tokens")]
[Authorize]
public class DeviceTokensController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<DeviceTokensController> _logger;

    public DeviceTokensController(ApplicationDbContext db, ILogger<DeviceTokensController> logger)
    {
        _db = db;
        _logger = logger;
    }

    public sealed class RegisterTokenRequest
    {
        public string ExpoPushToken { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
    }

    public sealed class UnregisterTokenRequest
    {
        public string ExpoPushToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// Register (upsert) a device push token for the current user.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ExpoPushToken))
            return BadRequest(new { error = "expoPushToken is required" });

        if (!request.ExpoPushToken.StartsWith("ExponentPushToken[") &&
            !request.ExpoPushToken.StartsWith("ExpoPushToken["))
            return BadRequest(new { error = "Invalid Expo push token format" });

        var platform = request.Platform?.ToLowerInvariant() ?? "";
        if (platform != "ios" && platform != "android")
            return BadRequest(new { error = "Platform must be 'ios' or 'android'" });

        var userId = User.GetUserId();

        var existing = await _db.DeviceTokens
            .FirstOrDefaultAsync(dt => dt.ExpoPushToken == request.ExpoPushToken);

        if (existing != null)
        {
            // Upsert: reassign to current user if different, update timestamp
            existing.UserId = userId;
            existing.Platform = platform;
            existing.CreatedAt = DateTime.UtcNow;
        }
        else
        {
            existing = new DeviceToken
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ExpoPushToken = request.ExpoPushToken,
                Platform = platform,
                CreatedAt = DateTime.UtcNow,
            };
            _db.DeviceTokens.Add(existing);
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Device token registered: UserId={UserId}, Token={Token}",
            userId, request.ExpoPushToken[..Math.Min(30, request.ExpoPushToken.Length)] + "...");

        return Ok(new
        {
            existing.Id,
            existing.UserId,
            existing.ExpoPushToken,
            existing.Platform,
            existing.CreatedAt,
        });
    }

    /// <summary>
    /// Unregister a device push token for the current user.
    /// </summary>
    [HttpDelete]
    public async Task<IActionResult> Unregister([FromBody] UnregisterTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ExpoPushToken))
            return BadRequest(new { error = "expoPushToken is required" });

        var userId = User.GetUserId();

        var token = await _db.DeviceTokens
            .FirstOrDefaultAsync(dt => dt.ExpoPushToken == request.ExpoPushToken && dt.UserId == userId);

        if (token == null)
            return NotFound(new { error = "Device token not found" });

        _db.DeviceTokens.Remove(token);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Device token unregistered: UserId={UserId}, Token={Token}",
            userId, request.ExpoPushToken[..Math.Min(30, request.ExpoPushToken.Length)] + "...");

        return NoContent();
    }
}
