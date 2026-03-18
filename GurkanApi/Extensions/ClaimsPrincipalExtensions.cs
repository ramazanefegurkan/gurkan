using System.Security.Claims;
using System.Text.Json;
using GurkanApi.Entities;

namespace GurkanApi.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("NameIdentifier claim is missing");
        return Guid.Parse(sub);
    }

    public static UserRole GetRole(this ClaimsPrincipal principal)
    {
        var role = principal.FindFirstValue(ClaimTypes.Role)
            ?? throw new InvalidOperationException("Role claim is missing");
        return Enum.Parse<UserRole>(role);
    }

    public static List<(Guid GroupId, GroupMemberRole Role)> GetGroupMemberships(this ClaimsPrincipal principal)
    {
        var claim = principal.FindFirstValue("GroupMemberships");
        if (string.IsNullOrEmpty(claim))
            return [];

        var items = JsonSerializer.Deserialize<List<GroupMembershipClaim>>(claim) ?? [];
        return items.Select(i => (i.GroupId, Enum.Parse<GroupMemberRole>(i.Role))).ToList();
    }

    public static bool IsSuperAdmin(this ClaimsPrincipal principal)
    {
        return principal.GetRole() == UserRole.SuperAdmin;
    }

    private sealed class GroupMembershipClaim
    {
        public Guid GroupId { get; set; }
        public string Role { get; set; } = string.Empty;
    }
}
