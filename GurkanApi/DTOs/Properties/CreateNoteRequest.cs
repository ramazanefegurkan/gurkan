using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.Properties;

public class CreateNoteRequest
{
    [Required]
    [MaxLength(5000)]
    public string Content { get; set; } = string.Empty;
}
