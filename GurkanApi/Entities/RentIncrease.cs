namespace GurkanApi.Entities;

public class RentIncrease
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public decimal PreviousAmount { get; set; }
    public decimal NewAmount { get; set; }
    public decimal IncreaseRate { get; set; }
    public DateTime EffectiveDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
}
