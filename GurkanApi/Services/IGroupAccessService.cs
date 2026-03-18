using GurkanApi.Entities;

namespace GurkanApi.Services;

public interface IGroupAccessService
{
    Task<bool> IsUserInGroupAsync(Guid userId, Guid groupId);
    Task<bool> IsGroupAdminAsync(Guid userId, Guid groupId);
    Task<List<Guid>> GetUserGroupIdsAsync(Guid userId);
    Task<bool> CanManageGroupAsync(Guid userId, Guid groupId, UserRole globalRole);
    Task<bool> CanAccessPropertyAsync(Guid userId, Guid propertyId, UserRole globalRole);
}
