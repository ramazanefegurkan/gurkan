using GurkanApi.Entities;

namespace GurkanApi.Services;

public interface ITokenService
{
    string GenerateAccessToken(User user, List<GroupMember> memberships);
    string GenerateRefreshToken();
    Task<RefreshToken> SaveRefreshTokenAsync(Guid userId, string token);
    Task<RefreshToken?> ValidateRefreshTokenAsync(string token);
    Task RevokeRefreshTokenAsync(RefreshToken token);
}
