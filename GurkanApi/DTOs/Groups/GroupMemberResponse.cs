using GurkanApi.Entities;

namespace GurkanApi.DTOs.Groups;

public class GroupMemberResponse
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public GroupMemberRole Role { get; set; }
    public DateTime JoinedAt { get; set; }
}
