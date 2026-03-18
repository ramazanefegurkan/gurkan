using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.Bills;

public class UpdateBillRequest
{
    [Required]
    public BillType Type { get; set; }

    [Required]
    [Range(0, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    public Currency Currency { get; set; }

    [Required]
    public DateTime DueDate { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }
}
