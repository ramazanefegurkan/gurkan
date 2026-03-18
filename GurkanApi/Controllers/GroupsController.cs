using GurkanApi.Data;
using GurkanApi.DTOs.Groups;
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
public class GroupsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<GroupsController> _logger;

    public GroupsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<GroupsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// List groups. Superadmin sees all; members see only their own groups.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        IQueryable<Group> query = _db.Groups
            .Include(g => g.Members)
            .Include(g => g.Properties);

        if (role != UserRole.SuperAdmin)
        {
            var groupIds = await _access.GetUserGroupIdsAsync(userId);
            query = query.Where(g => groupIds.Contains(g.Id));
        }

        var groups = await query.OrderBy(g => g.Name).ToListAsync();

        var response = groups.Select(MapGroupResponse).ToList();
        return Ok(response);
    }

    /// <summary>
    /// Get group detail. Superadmin or group member only.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var group = await _db.Groups
            .Include(g => g.Members).ThenInclude(m => m.User)
            .Include(g => g.Properties)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group is null)
            return NotFound(new { error = "not_found", message = "Group not found." });

        var userId = User.GetUserId();
        var role = User.GetRole();

        if (role != UserRole.SuperAdmin && !await _access.IsUserInGroupAsync(userId, id))
        {
            _logger.LogInformation("Group access denied: UserId={UserId}, GroupId={GroupId}, Action=view", userId, id);
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this group." });
        }

        return Ok(MapGroupResponseWithMembers(group));
    }

    /// <summary>
    /// Create a new group. Superadmin only.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGroupRequest request)
    {
        if (!User.IsSuperAdmin())
            return StatusCode(403, new { error = "forbidden", message = "Only superadmin can create groups." });

        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Groups.Add(group);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Group created: GroupId={GroupId}, Name={GroupName}, By={UserId}",
            group.Id, group.Name, User.GetUserId());

        return StatusCode(201, MapGroupResponse(group));
    }

    /// <summary>
    /// Update group. Superadmin or group admin.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateGroupRequest request)
    {
        var group = await _db.Groups
            .Include(g => g.Members)
            .Include(g => g.Properties)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group is null)
            return NotFound(new { error = "not_found", message = "Group not found." });

        var userId = User.GetUserId();
        var role = User.GetRole();

        if (!await _access.CanManageGroupAsync(userId, id, role))
            return StatusCode(403, new { error = "forbidden", message = "You don't have permission to update this group." });

        if (request.Name is not null)
            group.Name = request.Name;
        if (request.Description is not null)
            group.Description = request.Description;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Group updated: GroupId={GroupId}, By={UserId}", id, userId);
        return Ok(MapGroupResponse(group));
    }

    /// <summary>
    /// Delete group. Superadmin only. Properties become unassigned (GroupId=null).
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!User.IsSuperAdmin())
            return StatusCode(403, new { error = "forbidden", message = "Only superadmin can delete groups." });

        var group = await _db.Groups
            .Include(g => g.Properties)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group is null)
            return NotFound(new { error = "not_found", message = "Group not found." });

        // Unassign properties (set GroupId to null) before deleting the group
        foreach (var property in group.Properties)
        {
            property.GroupId = null;
        }

        _db.Groups.Remove(group);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Group deleted: GroupId={GroupId}, By={UserId}", id, User.GetUserId());
        return NoContent();
    }

    // ---------- Members ----------

    /// <summary>
    /// Add a member to a group. Superadmin or group admin.
    /// </summary>
    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddMemberRequest request)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        if (!await _access.CanManageGroupAsync(userId, id, role))
            return StatusCode(403, new { error = "forbidden", message = "You don't have permission to manage this group's members." });

        var group = await _db.Groups.FindAsync(id);
        if (group is null)
            return NotFound(new { error = "not_found", message = "Group not found." });

        var targetUser = await _db.Users.FindAsync(request.UserId);
        if (targetUser is null)
            return NotFound(new { error = "not_found", message = "User not found." });

        var existing = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.UserId == request.UserId && gm.GroupId == id);
        if (existing is not null)
            return Conflict(new { error = "already_member", message = "User is already a member of this group." });

        var member = new GroupMember
        {
            UserId = request.UserId,
            GroupId = id,
            Role = request.Role,
            JoinedAt = DateTime.UtcNow,
        };

        _db.GroupMembers.Add(member);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Member added: UserId={MemberUserId}, GroupId={GroupId}, Role={MemberRole}, By={ActorId}",
            request.UserId, id, request.Role, userId);

        return StatusCode(201, new GroupMemberResponse
        {
            UserId = targetUser.Id,
            FullName = targetUser.FullName,
            Email = targetUser.Email,
            Role = request.Role,
            JoinedAt = member.JoinedAt,
        });
    }

    /// <summary>
    /// Remove a member from a group. Superadmin or group admin.
    /// </summary>
    [HttpDelete("{id:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid memberId)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        if (!await _access.CanManageGroupAsync(userId, id, role))
            return StatusCode(403, new { error = "forbidden", message = "You don't have permission to manage this group's members." });

        var member = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.UserId == memberId && gm.GroupId == id);

        if (member is null)
            return NotFound(new { error = "not_found", message = "Member not found in this group." });

        _db.GroupMembers.Remove(member);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Member removed: UserId={MemberUserId}, GroupId={GroupId}, By={ActorId}",
            memberId, id, userId);

        return NoContent();
    }

    // ---------- Properties ----------

    /// <summary>
    /// Assign a property to a group. Superadmin or group admin.
    /// </summary>
    [HttpPost("{id:guid}/properties")]
    public async Task<IActionResult> AssignProperty(Guid id, [FromBody] AssignPropertyRequest request)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        if (!await _access.CanManageGroupAsync(userId, id, role))
            return StatusCode(403, new { error = "forbidden", message = "You don't have permission to manage this group's properties." });

        var group = await _db.Groups.FindAsync(id);
        if (group is null)
            return NotFound(new { error = "not_found", message = "Group not found." });

        var property = await _db.Properties.FindAsync(request.PropertyId);
        if (property is null)
            return NotFound(new { error = "not_found", message = "Property not found." });

        property.GroupId = id;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Property assigned: PropertyId={PropertyId}, GroupId={GroupId}, By={UserId}",
            request.PropertyId, id, userId);

        return StatusCode(201, new { propertyId = property.Id, groupId = id });
    }

    /// <summary>
    /// Unassign a property from a group. Superadmin or group admin.
    /// </summary>
    [HttpDelete("{id:guid}/properties/{propertyId:guid}")]
    public async Task<IActionResult> UnassignProperty(Guid id, Guid propertyId)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        if (!await _access.CanManageGroupAsync(userId, id, role))
            return StatusCode(403, new { error = "forbidden", message = "You don't have permission to manage this group's properties." });

        var property = await _db.Properties.FindAsync(propertyId);
        if (property is null || property.GroupId != id)
            return NotFound(new { error = "not_found", message = "Property not found in this group." });

        property.GroupId = null;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Property unassigned: PropertyId={PropertyId}, GroupId={GroupId}, By={UserId}",
            propertyId, id, userId);

        return NoContent();
    }

    // ---------- Mapping helpers ----------

    private static GroupResponse MapGroupResponse(Group group) => new()
    {
        Id = group.Id,
        Name = group.Name,
        Description = group.Description,
        CreatedAt = group.CreatedAt,
        Members = group.Members.Select(m => new GroupMemberResponse
        {
            UserId = m.UserId,
            FullName = m.User?.FullName ?? string.Empty,
            Email = m.User?.Email ?? string.Empty,
            Role = m.Role,
            JoinedAt = m.JoinedAt,
        }).ToList(),
        PropertyCount = group.Properties?.Count ?? 0,
    };

    private static GroupResponse MapGroupResponseWithMembers(Group group) => new()
    {
        Id = group.Id,
        Name = group.Name,
        Description = group.Description,
        CreatedAt = group.CreatedAt,
        Members = group.Members.Select(m => new GroupMemberResponse
        {
            UserId = m.UserId,
            FullName = m.User.FullName,
            Email = m.User.Email,
            Role = m.Role,
            JoinedAt = m.JoinedAt,
        }).ToList(),
        PropertyCount = group.Properties?.Count ?? 0,
    };
}
