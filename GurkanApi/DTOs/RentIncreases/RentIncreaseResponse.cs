namespace GurkanApi.DTOs.RentIncreases;

public class RentIncreaseResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public decimal PreviousAmount { get; set; }
    public decimal NewAmount { get; set; }
    public decimal IncreaseRate { get; set; }
    public DateTime EffectiveDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}
