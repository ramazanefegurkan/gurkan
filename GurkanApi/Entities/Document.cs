namespace GurkanApi.Entities;

public class Document
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public DocumentCategory Category { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public Guid UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }

    // Navigation properties
    public Property Property { get; set; } = null!;
    public User Uploader { get; set; } = null!;
}
