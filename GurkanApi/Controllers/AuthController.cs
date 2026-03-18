using GurkanApi.DTOs.Auth;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Login with email and password. Returns JWT access + refresh tokens.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        if (result is null)
            return Unauthorized(new { error = "invalid_credentials", message = "Email or password is incorrect." });

        return Ok(result);
    }

    /// <summary>
    /// Register a new user. Requires superadmin role.
    /// </summary>
    [HttpPost("register")]
    [Authorize]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!User.IsSuperAdmin())
            return StatusCode(403, new { error = "forbidden", message = "Only superadmin can register users." });

        var result = await _authService.RegisterAsync(request);
        if (result is null)
            return BadRequest(new { error = "email_taken", message = "A user with this email already exists." });

        return StatusCode(201, result);
    }

    /// <summary>
    /// Refresh access token using a valid refresh token (rotation).
    /// </summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        var result = await _authService.RefreshTokenAsync(request.RefreshToken);
        if (result is null)
            return Unauthorized(new { error = "invalid_refresh_token", message = "Refresh token is invalid or expired." });

        return Ok(result);
    }

    /// <summary>
    /// Change password for the authenticated user.
    /// </summary>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.GetUserId();
        var success = await _authService.ChangePasswordAsync(userId, request);
        if (!success)
            return BadRequest(new { error = "password_change_failed", message = "Current password is incorrect." });

        return Ok(new { message = "Password changed successfully." });
    }
}
