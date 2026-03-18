using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.Groups;

public class AssignPropertyRequest
{
    [Required]
    public Guid PropertyId { get; set; }
}
