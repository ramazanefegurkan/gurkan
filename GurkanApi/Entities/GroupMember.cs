namespace GurkanApi.Entities;

public class GroupMember
{
    public Guid UserId { get; set; }
    public Guid GroupId { get; set; }
    public GroupMemberRole Role { get; set; }
    public DateTime JoinedAt { get; set; }

    public User User { get; set; } = null!;
    public Group Group { get; set; } = null!;
}
