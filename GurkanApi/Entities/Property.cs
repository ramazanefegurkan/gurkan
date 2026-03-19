namespace GurkanApi.Entities;

public class Property
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public PropertyType Type { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public decimal? Area { get; set; }
    public int? RoomCount { get; set; }
    public int? Floor { get; set; }
    public int? TotalFloors { get; set; }
    public int? BuildYear { get; set; }
    public Currency Currency { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // ── Ownership & subscription info ──
    public string? TitleDeedOwner { get; set; }
    public string? SubscriptionHolder { get; set; }

    // ── Utility subscription numbers ──
    public string? ElectricSubscriptionNo { get; set; }
    public string? GasSubscriptionNo { get; set; }
    public string? WaterSubscriptionNo { get; set; }
    public string? InternetSubscriptionNo { get; set; }
    public string? DuesSubscriptionNo { get; set; }

    // ── Default bank account for rent income ──
    public Guid? DefaultBankAccountId { get; set; }
    public BankAccount? DefaultBankAccount { get; set; }

    public Guid? GroupId { get; set; }
    public Group? Group { get; set; }

    public ICollection<PropertyNote> Notes { get; set; } = new List<PropertyNote>();
}
