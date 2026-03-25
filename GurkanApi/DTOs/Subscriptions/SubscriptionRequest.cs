using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.Subscriptions;

public class UpsertSubscriptionRequest
{
    [Required]
    public SubscriptionType Type { get; set; }

    [MaxLength(50)]
    public string? SubscriptionNo { get; set; }

    [Required]
    public SubscriptionHolderType HolderType { get; set; }

    public Guid? HolderUserId { get; set; }
    public bool HasAutoPayment { get; set; }
    public Guid? AutoPaymentBankId { get; set; }
}
