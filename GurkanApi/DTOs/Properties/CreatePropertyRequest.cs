using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.Properties;

public class CreatePropertyRequest
{
    [Required]
    [MaxLength(300)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public PropertyType Type { get; set; }

    [Required]
    [MaxLength(500)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string District { get; set; } = string.Empty;

    public decimal? Area { get; set; }
    public int? RoomCount { get; set; }
    public int? Floor { get; set; }
    public int? TotalFloors { get; set; }
    public int? BuildYear { get; set; }

    [Required]
    public Currency Currency { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    [MaxLength(200)]
    public string? TitleDeedOwner { get; set; }

    public Guid? DefaultBankAccountId { get; set; }

    [Required]
    public Guid GroupId { get; set; }
}
