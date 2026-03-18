namespace GurkanApi.DTOs.Groups;

public class GroupResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<GroupMemberResponse> Members { get; set; } = [];
    public int PropertyCount { get; set; }
}
