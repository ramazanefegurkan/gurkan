using GurkanApi.Entities;

namespace GurkanApi.DTOs.Documents;

public class DocumentResponse
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public DocumentCategory Category { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public Guid UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
}
