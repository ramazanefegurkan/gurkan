using GurkanApi.Entities;

namespace GurkanApi.DTOs.Properties;

public class PropertyListResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public PropertyType Type { get; set; }
    public string City { get; set; } = string.Empty;
    public Currency Currency { get; set; }
    public Guid? GroupId { get; set; }
    public string? GroupName { get; set; }
}
