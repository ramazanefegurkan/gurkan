using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.Expenses;

public class CreateExpenseRequest
{
    [Required]
    public ExpenseCategory Category { get; set; }

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Range(0, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    public Currency Currency { get; set; }

    [Required]
    public DateTime Date { get; set; }

    public bool IsRecurring { get; set; }

    [MaxLength(50)]
    public string? RecurrenceInterval { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }
}
