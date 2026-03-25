using GurkanApi.DTOs.Subscriptions;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.Properties;

public class PropertyResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public PropertyType Type { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public decimal? Area { get; set; }
    public int? RoomCount { get; set; }
    public int? Floor { get; set; }
    public int? TotalFloors { get; set; }
    public int? BuildYear { get; set; }
    public Currency Currency { get; set; }
    public string? Description { get; set; }

    public string? TitleDeedOwner { get; set; }
    public List<SubscriptionResponse> Subscriptions { get; set; } = new();

    public Guid? DefaultBankAccountId { get; set; }
    public string? DefaultBankAccountName { get; set; }

    public Guid? GroupId { get; set; }
    public string? GroupName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
