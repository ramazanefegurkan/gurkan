namespace GurkanApi.Entities;

public class Expense
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public ExpenseCategory Category { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
    public DateTime Date { get; set; }
    public bool IsRecurring { get; set; }
    public string? RecurrenceInterval { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public Property Property { get; set; } = null!;
}
