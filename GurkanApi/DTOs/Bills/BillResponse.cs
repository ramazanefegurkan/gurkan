using GurkanApi.Entities;

namespace GurkanApi.DTOs.Bills;

public class BillResponse
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public BillType Type { get; set; }
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? PaidDate { get; set; }
    public BillPaymentStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}
