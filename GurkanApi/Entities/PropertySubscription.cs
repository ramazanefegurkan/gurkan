namespace GurkanApi.Entities;

public class PropertySubscription
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public SubscriptionType Type { get; set; }
    public string? SubscriptionNo { get; set; }
    public SubscriptionHolderType HolderType { get; set; }
    public Guid? HolderUserId { get; set; }
    public bool HasAutoPayment { get; set; }
    public Guid? AutoPaymentBankId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Property Property { get; set; } = null!;
    public User? HolderUser { get; set; }
    public Bank? AutoPaymentBank { get; set; }
}
