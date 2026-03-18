using GurkanApi.Data;
using GurkanApi.DTOs.Documents;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/properties/{propertyId:guid}/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<DocumentsController> _logger;
    private readonly IConfiguration _configuration;

    private static readonly string[] AllowedExtensions =
        [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx"];

    private static readonly string[] AllowedContentTypes =
    [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    public DocumentsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<DocumentsController> logger,
        IConfiguration configuration)
    {
        _db = db;
        _access = access;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Upload a document for a property (multipart/form-data).
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<IActionResult> Upload(Guid propertyId, [FromForm] IFormFile file, [FromForm] DocumentCategory category)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        if (file is null || file.Length == 0)
            return BadRequest(new { error = "invalid_file", message = "File is required and must not be empty." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            return BadRequest(new { error = "invalid_file_type", message = $"File type '{extension}' is not allowed. Allowed types: {string.Join(", ", AllowedExtensions)}" });

        if (!AllowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
            return BadRequest(new { error = "invalid_content_type", message = $"Content type '{file.ContentType}' is not allowed." });

        var storedFileName = $"{Guid.NewGuid()}-{file.FileName}";
        var filePath = Path.Combine("documents", propertyId.ToString(), storedFileName);
        var basePath = GetUploadBasePath();
        var fullPath = Path.Combine(basePath, filePath);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var document = new Document
        {
            Id = Guid.NewGuid(),
            PropertyId = propertyId,
            FileName = storedFileName,
            OriginalFileName = file.FileName,
            Category = category,
            ContentType = file.ContentType,
            FileSize = file.Length,
            FilePath = filePath,
            UploadedBy = userId,
            UploadedAt = DateTime.UtcNow,
        };

        _db.Documents.Add(document);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Document uploaded: DocumentId={DocumentId}, PropertyId={PropertyId}, FileName={FileName}, Size={Size}, By={UserId}",
            document.Id, propertyId, file.FileName, file.Length, userId);

        return StatusCode(201, MapDocumentResponse(document));
    }

    /// <summary>
    /// List documents for a property, ordered by UploadedAt descending. Optional ?category= filter.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid propertyId, [FromQuery] DocumentCategory? category)
    {
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var query = _db.Documents.Where(d => d.PropertyId == propertyId);

        if (category.HasValue)
            query = query.Where(d => d.Category == category.Value);

        var documents = await query
            .OrderByDescending(d => d.UploadedAt)
            .ToListAsync();

        var response = documents.Select(MapDocumentResponse).ToList();
        return Ok(response);
    }

    /// <summary>
    /// Download a document file.
    /// </summary>
    [HttpGet("{documentId:guid}/download")]
    public async Task<IActionResult> Download(Guid propertyId, Guid documentId)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var document = await _db.Documents
            .FirstOrDefaultAsync(d => d.Id == documentId && d.PropertyId == propertyId);

        if (document is null)
            return NotFound(new { error = "not_found", message = "Document not found." });

        var basePath = GetUploadBasePath();
        var fullPath = Path.Combine(basePath, document.FilePath);

        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { error = "file_not_found", message = "Document file not found on disk." });

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read);

        _logger.LogInformation("Document downloaded: DocumentId={DocumentId}, By={UserId}",
            documentId, userId);

        return File(stream, document.ContentType, document.OriginalFileName);
    }

    /// <summary>
    /// Delete a document and its file.
    /// </summary>
    [HttpDelete("{documentId:guid}")]
    public async Task<IActionResult> Delete(Guid propertyId, Guid documentId)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var document = await _db.Documents
            .FirstOrDefaultAsync(d => d.Id == documentId && d.PropertyId == propertyId);

        if (document is null)
            return NotFound(new { error = "not_found", message = "Document not found." });

        // Delete file from disk (don't fail if already gone)
        var basePath = GetUploadBasePath();
        var fullPath = Path.Combine(basePath, document.FilePath);
        if (System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
        }

        _db.Documents.Remove(document);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Document deleted: DocumentId={DocumentId}, PropertyId={PropertyId}, By={UserId}",
            documentId, propertyId, userId);

        return NoContent();
    }

    // ---------- Helpers ----------

    private async Task<(bool Allowed, IActionResult? ErrorResult)> CheckPropertyAccess(Guid propertyId)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        var property = await _db.Properties.FindAsync(propertyId);
        if (property is null)
            return (false, NotFound(new { error = "not_found", message = "Property not found." }));

        if (!await _access.CanAccessPropertyAsync(userId, propertyId, role))
        {
            _logger.LogInformation("Property access denied: UserId={UserId}, PropertyId={PropertyId}", userId, propertyId);
            return (false, StatusCode(403, new { error = "forbidden", message = "You don't have access to this property." }));
        }

        return (true, null);
    }

    private string GetUploadBasePath()
    {
        return _configuration["FileStorage:BasePath"] ?? "uploads";
    }

    private static DocumentResponse MapDocumentResponse(Document d) => new()
    {
        Id = d.Id,
        PropertyId = d.PropertyId,
        OriginalFileName = d.OriginalFileName,
        Category = d.Category,
        ContentType = d.ContentType,
        FileSize = d.FileSize,
        UploadedBy = d.UploadedBy,
        UploadedAt = d.UploadedAt,
    };
}
