using GurkanApi.Data;
using GurkanApi.DTOs.Auth;
using GurkanApi.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        ApplicationDbContext db,
        IPasswordHasher<User> passwordHasher,
        ITokenService tokenService,
        ILogger<AuthService> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<TokenResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user is null)
        {
            _logger.LogWarning("Auth login failed: user not found for {Email}", request.Email);
            return null;
        }

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            _logger.LogWarning("Auth login failed: invalid password for {Email}", request.Email);
            return null;
        }

        var memberships = await _db.GroupMembers
            .Where(gm => gm.UserId == user.Id)
            .ToListAsync();

        var accessToken = _tokenService.GenerateAccessToken(user, memberships);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var saved = await _tokenService.SaveRefreshTokenAsync(user.Id, refreshToken);

        _logger.LogInformation("Auth login succeeded: {UserId} ({Email})", user.Id, user.Email);

        return new TokenResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15), // matches TokenService expiry
        };
    }

    public async Task<TokenResponse?> RegisterAsync(RegisterRequest request)
    {
        var exists = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
        {
            _logger.LogWarning("Auth register failed: email already exists {Email}", request.Email);
            return null;
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            FullName = request.FullName,
            Role = UserRole.User,
            CreatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var accessToken = _tokenService.GenerateAccessToken(user, []);
        var refreshToken = _tokenService.GenerateRefreshToken();
        await _tokenService.SaveRefreshTokenAsync(user.Id, refreshToken);

        _logger.LogInformation("Auth register succeeded: {UserId} ({Email})", user.Id, user.Email);

        return new TokenResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15),
        };
    }

    public async Task<TokenResponse?> RefreshTokenAsync(string refreshToken)
    {
        var existing = await _tokenService.ValidateRefreshTokenAsync(refreshToken);
        if (existing is null)
        {
            _logger.LogWarning("Auth refresh failed: invalid or expired refresh token");
            return null;
        }

        // Revoke the old token (rotation)
        await _tokenService.RevokeRefreshTokenAsync(existing);

        var user = existing.User;
        var memberships = await _db.GroupMembers
            .Where(gm => gm.UserId == user.Id)
            .ToListAsync();

        var newAccessToken = _tokenService.GenerateAccessToken(user, memberships);
        var newRefreshToken = _tokenService.GenerateRefreshToken();
        await _tokenService.SaveRefreshTokenAsync(user.Id, newRefreshToken);

        _logger.LogInformation("Auth refresh succeeded: {UserId}", user.Id);

        return new TokenResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15),
        };
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null)
        {
            _logger.LogWarning("Auth change-password failed: user not found {UserId}", userId);
            return false;
        }

        var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (verify == PasswordVerificationResult.Failed)
        {
            _logger.LogWarning("Auth change-password failed: wrong current password for {UserId}", userId);
            return false;
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Auth change-password succeeded: {UserId}", userId);
        return true;
    }
}
