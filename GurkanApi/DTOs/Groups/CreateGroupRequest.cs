using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.Groups;

public class CreateGroupRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }
}
