using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.Auth;

public class RefreshRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
