namespace GurkanApi.Entities;

public class PropertyNote
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }

    public Property Property { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
}
