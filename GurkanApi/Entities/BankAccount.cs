namespace GurkanApi.Entities;

public class BankAccount
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public string HolderName { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string? IBAN { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }

    public Group Group { get; set; } = null!;
}
