using GurkanApi.Data;
using GurkanApi.Entities;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Services;

public class GroupAccessService : IGroupAccessService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<GroupAccessService> _logger;

    public GroupAccessService(ApplicationDbContext db, ILogger<GroupAccessService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<bool> IsUserInGroupAsync(Guid userId, Guid groupId)
    {
        return await _db.GroupMembers
            .AnyAsync(gm => gm.UserId == userId && gm.GroupId == groupId);
    }

    public async Task<bool> IsGroupAdminAsync(Guid userId, Guid groupId)
    {
        return await _db.GroupMembers
            .AnyAsync(gm => gm.UserId == userId && gm.GroupId == groupId && gm.Role == GroupMemberRole.Admin);
    }

    public async Task<List<Guid>> GetUserGroupIdsAsync(Guid userId)
    {
        return await _db.GroupMembers
            .Where(gm => gm.UserId == userId)
            .Select(gm => gm.GroupId)
            .ToListAsync();
    }

    public async Task<bool> CanManageGroupAsync(Guid userId, Guid groupId, UserRole globalRole)
    {
        if (globalRole == UserRole.SuperAdmin)
        {
            _logger.LogDebug("Group access granted (superadmin): UserId={UserId}, GroupId={GroupId}", userId, groupId);
            return true;
        }

        var isGroupAdmin = await IsGroupAdminAsync(userId, groupId);
        if (isGroupAdmin)
        {
            _logger.LogDebug("Group access granted (group admin): UserId={UserId}, GroupId={GroupId}", userId, groupId);
            return true;
        }

        _logger.LogInformation("Group access denied: UserId={UserId}, GroupId={GroupId}, Action=manage", userId, groupId);
        return false;
    }

    public async Task<bool> CanAccessPropertyAsync(Guid userId, Guid propertyId, UserRole globalRole)
    {
        if (globalRole == UserRole.SuperAdmin)
            return true;

        var property = await _db.Properties.FindAsync(propertyId);
        if (property is null || property.GroupId is null)
            return false;

        var inGroup = await IsUserInGroupAsync(userId, property.GroupId.Value);
        if (!inGroup)
        {
            _logger.LogInformation("Property access denied: UserId={UserId}, PropertyId={PropertyId}", userId, propertyId);
        }
        return inGroup;
    }
}
