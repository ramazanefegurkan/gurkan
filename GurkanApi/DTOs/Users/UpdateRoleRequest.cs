using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.Users;

public class UpdateRoleRequest
{
    [Required]
    public UserRole Role { get; set; }
}
