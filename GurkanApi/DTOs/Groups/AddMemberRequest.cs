using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.Groups;

public class AddMemberRequest
{
    [Required]
    public Guid UserId { get; set; }

    [Required]
    public GroupMemberRole Role { get; set; }
}
