namespace GurkanApi.Entities;

public class ShortTermRental
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public string? GuestName { get; set; }
    public DateTime CheckIn { get; set; }
    public DateTime CheckOut { get; set; }
    public int NightCount { get; set; }
    public decimal NightlyRate { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PlatformFee { get; set; }
    public decimal NetAmount { get; set; }
    public RentalPlatform Platform { get; set; }
    public Currency Currency { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public Property Property { get; set; } = null!;
}
