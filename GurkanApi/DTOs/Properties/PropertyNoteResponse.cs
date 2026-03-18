namespace GurkanApi.DTOs.Properties;

public class PropertyNoteResponse
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
