namespace GurkanApi.Services;

using GurkanApi.Data;
using GurkanApi.Entities;
using Microsoft.EntityFrameworkCore;

public class SubscriptionMatcherService : ISubscriptionMatcherService
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;

    public SubscriptionMatcherService(ApplicationDbContext db, IGroupAccessService access)
    {
        _db = db;
        _access = access;
    }

    public async Task<SubscriptionMatch?> FindMatchAsync(Guid userId, UserRole role, string? subscriberNo, BillType billType)
    {
        if (string.IsNullOrWhiteSpace(subscriberNo))
            return null;

        var subscriptionType = MapBillTypeToSubscriptionType(billType);
        var groupIds = await _access.GetUserGroupIdsAsync(userId);

        var match = await _db.PropertySubscriptions
            .Include(ps => ps.Property)
            .Where(ps =>
                ps.SubscriptionNo == subscriberNo &&
                ps.Type == subscriptionType &&
                ps.Property.GroupId != null &&
                (role == UserRole.SuperAdmin || groupIds.Contains(ps.Property.GroupId.Value)))
            .Select(ps => new SubscriptionMatch
            {
                PropertyId = ps.PropertyId,
                PropertyName = ps.Property.Name
            })
            .FirstOrDefaultAsync();

        return match;
    }

    public async Task<List<SubscriptionMatch>> GetAccessiblePropertiesAsync(Guid userId, UserRole role)
    {
        var groupIds = await _access.GetUserGroupIdsAsync(userId);

        return await _db.Properties
            .Where(p => role == UserRole.SuperAdmin || (p.GroupId != null && groupIds.Contains(p.GroupId.Value)))
            .Select(p => new SubscriptionMatch
            {
                PropertyId = p.Id,
                PropertyName = p.Name
            })
            .OrderBy(p => p.PropertyName)
            .ToListAsync();
    }

    public async Task UpdateSubscriptionNoAsync(Guid propertyId, BillType billType, string subscriberNo)
    {
        var subscriptionType = MapBillTypeToSubscriptionType(billType);
        var subscription = await _db.PropertySubscriptions
            .FirstOrDefaultAsync(ps => ps.PropertyId == propertyId && ps.Type == subscriptionType);

        if (subscription != null)
        {
            subscription.SubscriptionNo = subscriberNo;
        }
        else
        {
            _db.PropertySubscriptions.Add(new PropertySubscription
            {
                PropertyId = propertyId,
                Type = subscriptionType,
                SubscriptionNo = subscriberNo,
                HolderType = SubscriptionHolderType.User
            });
        }

        await _db.SaveChangesAsync();
    }

    private static SubscriptionType MapBillTypeToSubscriptionType(BillType billType) => billType switch
    {
        BillType.Water => SubscriptionType.Water,
        BillType.Electric => SubscriptionType.Electric,
        BillType.Gas => SubscriptionType.Gas,
        BillType.Internet => SubscriptionType.Internet,
        BillType.Dues => SubscriptionType.Dues,
        _ => throw new ArgumentOutOfRangeException(nameof(billType))
    };
}
