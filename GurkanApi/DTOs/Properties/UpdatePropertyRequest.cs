using GurkanApi.Entities;

namespace GurkanApi.DTOs.Properties;

public class UpdatePropertyRequest
{
    public string? Name { get; set; }
    public PropertyType? Type { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public decimal? Area { get; set; }
    public int? RoomCount { get; set; }
    public int? Floor { get; set; }
    public int? TotalFloors { get; set; }
    public int? BuildYear { get; set; }
    public Currency? Currency { get; set; }
    public string? Description { get; set; }
}
