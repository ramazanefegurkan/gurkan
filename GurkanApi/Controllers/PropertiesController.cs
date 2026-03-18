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
[Route("api/[controller]")]
[Authorize]
public class PropertiesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<PropertiesController> _logger;

    public PropertiesController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<PropertiesController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// List properties. Superadmin sees all; others see only properties in their groups.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        IQueryable<Property> query = _db.Properties.Include(p => p.Group);

        if (role != UserRole.SuperAdmin)
        {
            var groupIds = await _access.GetUserGroupIdsAsync(userId);
            query = query.Where(p => p.GroupId != null && groupIds.Contains(p.GroupId.Value));
        }

        var properties = await query.OrderBy(p => p.Name).ToListAsync();

        var response = properties.Select(p => new PropertyListResponse
        {
            Id = p.Id,
            Name = p.Name,
            Type = p.Type,
            City = p.City,
            Currency = p.Currency,
            GroupId = p.GroupId,
            GroupName = p.Group?.Name,
        }).ToList();

        return Ok(response);
    }

    /// <summary>
    /// Get single property. Checks group-based access.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var property = await _db.Properties
            .Include(p => p.Group)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (property is null)
            return NotFound(new { error = "not_found", message = "Property not found." });

        var userId = User.GetUserId();
        var role = User.GetRole();

        if (!await _access.CanAccessPropertyAsync(userId, id, role))
        {
            _logger.LogInformation("Property access denied: UserId={UserId}, PropertyId={PropertyId}", userId, id);
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this property." });
        }

        return Ok(MapPropertyResponse(property));
    }

    /// <summary>
    /// Create a property. Superadmin can create in any group; members must belong to the specified group.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePropertyRequest request)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        // Verify the target group exists
        var group = await _db.Groups.FindAsync(request.GroupId);
        if (group is null)
            return NotFound(new { error = "not_found", message = "Group not found." });

        // Superadmin can create in any group; others must be in the group
        if (role != UserRole.SuperAdmin && !await _access.IsUserInGroupAsync(userId, request.GroupId))
        {
            _logger.LogInformation("Property access denied: UserId={UserId}, PropertyId={PropertyId}", userId, Guid.Empty);
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this group." });
        }

        var property = new Property
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Type = request.Type,
            Address = request.Address,
            City = request.City,
            District = request.District,
            Area = request.Area,
            RoomCount = request.RoomCount,
            Floor = request.Floor,
            TotalFloors = request.TotalFloors,
            BuildYear = request.BuildYear,
            Currency = request.Currency,
            Description = request.Description,
            GroupId = request.GroupId,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Properties.Add(property);
        await _db.SaveChangesAsync();

        // Reload with group for response mapping
        await _db.Entry(property).Reference(p => p.Group).LoadAsync();

        _logger.LogInformation("Property created: PropertyId={PropertyId}, By={UserId}", property.Id, userId);

        return StatusCode(201, MapPropertyResponse(property));
    }

    /// <summary>
    /// Update property. Checks group-based access. Applies only non-null fields.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePropertyRequest request)
    {
        var property = await _db.Properties
            .Include(p => p.Group)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (property is null)
            return NotFound(new { error = "not_found", message = "Property not found." });

        var userId = User.GetUserId();
        var role = User.GetRole();

        if (!await _access.CanAccessPropertyAsync(userId, id, role))
        {
            _logger.LogInformation("Property access denied: UserId={UserId}, PropertyId={PropertyId}", userId, id);
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this property." });
        }

        if (request.Name is not null) property.Name = request.Name;
        if (request.Type is not null) property.Type = request.Type.Value;
        if (request.Address is not null) property.Address = request.Address;
        if (request.City is not null) property.City = request.City;
        if (request.District is not null) property.District = request.District;
        if (request.Area is not null) property.Area = request.Area;
        if (request.RoomCount is not null) property.RoomCount = request.RoomCount;
        if (request.Floor is not null) property.Floor = request.Floor;
        if (request.TotalFloors is not null) property.TotalFloors = request.TotalFloors;
        if (request.BuildYear is not null) property.BuildYear = request.BuildYear;
        if (request.Currency is not null) property.Currency = request.Currency.Value;
        if (request.Description is not null) property.Description = request.Description;

        property.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Property updated: PropertyId={PropertyId}, By={UserId}", id, userId);

        return Ok(MapPropertyResponse(property));
    }

    /// <summary>
    /// Delete property. Superadmin or group admin only.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var property = await _db.Properties.FindAsync(id);

        if (property is null)
            return NotFound(new { error = "not_found", message = "Property not found." });

        var userId = User.GetUserId();
        var role = User.GetRole();

        // Superadmin can delete any property; group admin can delete properties in their group
        if (role != UserRole.SuperAdmin)
        {
            if (property.GroupId is null || !await _access.CanManageGroupAsync(userId, property.GroupId.Value, role))
            {
                _logger.LogInformation("Property access denied: UserId={UserId}, PropertyId={PropertyId}", userId, id);
                return StatusCode(403, new { error = "forbidden", message = "You don't have permission to delete this property." });
            }
        }

        _db.Properties.Remove(property);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Property deleted: PropertyId={PropertyId}, By={UserId}", id, userId);

        return NoContent();
    }

    // ---------- Mapping helpers ----------

    private static PropertyResponse MapPropertyResponse(Property p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Type = p.Type,
        Address = p.Address,
        City = p.City,
        District = p.District,
        Area = p.Area,
        RoomCount = p.RoomCount,
        Floor = p.Floor,
        TotalFloors = p.TotalFloors,
        BuildYear = p.BuildYear,
        Currency = p.Currency,
        Description = p.Description,
        GroupId = p.GroupId,
        GroupName = p.Group?.Name,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
    };
}
