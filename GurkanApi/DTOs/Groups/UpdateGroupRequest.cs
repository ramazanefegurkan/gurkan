using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.Groups;

public class UpdateGroupRequest
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }
}
