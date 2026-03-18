using GurkanApi.Entities;

namespace GurkanApi.DTOs.RentPayments;

public class UpdateRentPaymentRequest
{
    public DateTime? PaidDate { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }

    [System.ComponentModel.DataAnnotations.MaxLength(2000)]
    public string? Notes { get; set; }
}
