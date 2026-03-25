using GurkanApi.Entities;

namespace GurkanApi.DTOs.Subscriptions;

public class SubscriptionResponse
{
    public Guid Id { get; set; }
    public SubscriptionType Type { get; set; }
    public string? SubscriptionNo { get; set; }
    public SubscriptionHolderType HolderType { get; set; }
    public Guid? HolderUserId { get; set; }
    public string? HolderUserName { get; set; }
    public bool HasAutoPayment { get; set; }
    public Guid? AutoPaymentBankId { get; set; }
    public string? AutoPaymentBankName { get; set; }
}
