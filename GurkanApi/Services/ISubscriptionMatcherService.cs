namespace GurkanApi.Services;

using GurkanApi.Entities;

public class SubscriptionMatch
{
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = null!;
}

public interface ISubscriptionMatcherService
{
    Task<SubscriptionMatch?> FindMatchAsync(Guid userId, UserRole role, string? subscriberNo, BillType billType);
    Task<List<SubscriptionMatch>> GetAccessiblePropertiesAsync(Guid userId, UserRole role);
    Task UpdateSubscriptionNoAsync(Guid propertyId, BillType billType, string subscriberNo);
}
