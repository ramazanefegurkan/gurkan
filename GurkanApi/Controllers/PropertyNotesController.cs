using GurkanApi.Data;
using GurkanApi.DTOs.Properties;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/properties/{propertyId:guid}/notes")]
[Authorize]
public class PropertyNotesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<PropertyNotesController> _logger;

    public PropertyNotesController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<PropertyNotesController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// List notes for a property, ordered by most recent first.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid propertyId)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        var property = await _db.Properties.FindAsync(propertyId);
        if (property is null)
            return NotFound(new { error = "not_found", message = "Property not found." });

        if (!await _access.CanAccessPropertyAsync(userId, propertyId, role))
        {
            _logger.LogInformation("Property access denied: UserId={UserId}, PropertyId={PropertyId}", userId, propertyId);
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this property." });
        }

        var notes = await _db.PropertyNotes
            .Where(n => n.PropertyId == propertyId)
            .Include(n => n.CreatedByUser)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        var response = notes.Select(n => new PropertyNoteResponse
        {
            Id = n.Id,
            Content = n.Content,
            CreatedByName = n.CreatedByUser.FullName,
            CreatedAt = n.CreatedAt,
        }).ToList();

        return Ok(response);
    }

    /// <summary>
    /// Create a note for a property.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create(Guid propertyId, [FromBody] CreateNoteRequest request)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        var property = await _db.Properties.FindAsync(propertyId);
        if (property is null)
            return NotFound(new { error = "not_found", message = "Property not found." });

        if (!await _access.CanAccessPropertyAsync(userId, propertyId, role))
        {
            _logger.LogInformation("Property access denied: UserId={UserId}, PropertyId={PropertyId}", userId, propertyId);
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this property." });
        }

        var note = new PropertyNote
        {
            Id = Guid.NewGuid(),
            PropertyId = propertyId,
            Content = request.Content,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
        };

        _db.PropertyNotes.Add(note);
        await _db.SaveChangesAsync();

        // Load creator for response
        await _db.Entry(note).Reference(n => n.CreatedByUser).LoadAsync();

        _logger.LogInformation("PropertyNote created: NoteId={NoteId}, PropertyId={PropertyId}, By={UserId}",
            note.Id, propertyId, userId);

        return StatusCode(201, new PropertyNoteResponse
        {
            Id = note.Id,
            Content = note.Content,
            CreatedByName = note.CreatedByUser.FullName,
            CreatedAt = note.CreatedAt,
        });
    }

    /// <summary>
    /// Update a note. Only the creator or superadmin can update.
    /// </summary>
    [HttpPut("{noteId:guid}")]
    public async Task<IActionResult> Update(Guid propertyId, Guid noteId, [FromBody] UpdateNoteRequest request)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        var property = await _db.Properties.FindAsync(propertyId);
        if (property is null)
            return NotFound(new { error = "not_found", message = "Property not found." });

        if (!await _access.CanAccessPropertyAsync(userId, propertyId, role))
        {
            _logger.LogInformation("Property access denied: UserId={UserId}, PropertyId={PropertyId}", userId, propertyId);
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this property." });
        }

        var note = await _db.PropertyNotes
            .Include(n => n.CreatedByUser)
            .FirstOrDefaultAsync(n => n.Id == noteId && n.PropertyId == propertyId);

        if (note is null)
            return NotFound(new { error = "not_found", message = "Note not found." });

        if (role != UserRole.SuperAdmin && note.CreatedBy != userId)
        {
            _logger.LogInformation("PropertyNote access denied: UserId={UserId}, NoteId={NoteId}", userId, noteId);
            return StatusCode(403, new { error = "forbidden", message = "Only the note creator or superadmin can update this note." });
        }

        note.Content = request.Content;
        await _db.SaveChangesAsync();

        _logger.LogInformation("PropertyNote updated: NoteId={NoteId}, PropertyId={PropertyId}, By={UserId}",
            noteId, propertyId, userId);

        return Ok(new PropertyNoteResponse
        {
            Id = note.Id,
            Content = note.Content,
            CreatedByName = note.CreatedByUser.FullName,
            CreatedAt = note.CreatedAt,
        });
    }

    /// <summary>
    /// Delete a note. Only the creator or superadmin can delete.
    /// </summary>
    [HttpDelete("{noteId:guid}")]
    public async Task<IActionResult> Delete(Guid propertyId, Guid noteId)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        var property = await _db.Properties.FindAsync(propertyId);
        if (property is null)
            return NotFound(new { error = "not_found", message = "Property not found." });

        if (!await _access.CanAccessPropertyAsync(userId, propertyId, role))
        {
            _logger.LogInformation("Property access denied: UserId={UserId}, PropertyId={PropertyId}", userId, propertyId);
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this property." });
        }

        var note = await _db.PropertyNotes
            .FirstOrDefaultAsync(n => n.Id == noteId && n.PropertyId == propertyId);

        if (note is null)
            return NotFound(new { error = "not_found", message = "Note not found." });

        if (role != UserRole.SuperAdmin && note.CreatedBy != userId)
        {
            _logger.LogInformation("PropertyNote access denied: UserId={UserId}, NoteId={NoteId}", userId, noteId);
            return StatusCode(403, new { error = "forbidden", message = "Only the note creator or superadmin can delete this note." });
        }

        _db.PropertyNotes.Remove(note);
        await _db.SaveChangesAsync();

        _logger.LogInformation("PropertyNote deleted: NoteId={NoteId}, PropertyId={PropertyId}, By={UserId}",
            noteId, propertyId, userId);

        return NoContent();
    }
}
