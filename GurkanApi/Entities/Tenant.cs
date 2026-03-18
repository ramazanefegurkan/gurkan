namespace GurkanApi.Entities;

public class Tenant
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? IdentityNumber { get; set; }
    public DateTime LeaseStart { get; set; }
    public DateTime LeaseEnd { get; set; }
    public decimal MonthlyRent { get; set; }
    public decimal Deposit { get; set; }
    public Currency Currency { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Property Property { get; set; } = null!;
    public ICollection<RentPayment> RentPayments { get; set; } = new List<RentPayment>();
    public ICollection<RentIncrease> RentIncreases { get; set; } = new List<RentIncrease>();
}
