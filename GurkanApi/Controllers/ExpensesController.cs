using GurkanApi.Data;
using GurkanApi.DTOs.Expenses;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/properties/{propertyId:guid}/expenses")]
[Authorize]
public class ExpensesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<ExpensesController> _logger;

    public ExpensesController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<ExpensesController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// List expenses for a property, ordered by Date descending. Optional ?category= filter.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid propertyId, [FromQuery] ExpenseCategory? category)
    {
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var query = _db.Expenses.Where(e => e.PropertyId == propertyId);

        if (category.HasValue)
            query = query.Where(e => e.Category == category.Value);

        var expenses = await query
            .OrderByDescending(e => e.Date)
            .ToListAsync();

        var response = expenses.Select(MapExpenseResponse).ToList();
        return Ok(response);
    }

    /// <summary>
    /// Get single expense detail.
    /// </summary>
    [HttpGet("{expenseId:guid}")]
    public async Task<IActionResult> GetById(Guid propertyId, Guid expenseId)
    {
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var expense = await _db.Expenses
            .FirstOrDefaultAsync(e => e.Id == expenseId && e.PropertyId == propertyId);

        if (expense is null)
            return NotFound(new { error = "not_found", message = "Expense not found." });

        return Ok(MapExpenseResponse(expense));
    }

    /// <summary>
    /// Create an expense.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create(Guid propertyId, [FromBody] CreateExpenseRequest request)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var expense = new Expense
        {
            Id = Guid.NewGuid(),
            PropertyId = propertyId,
            Category = request.Category,
            Description = request.Description,
            Amount = request.Amount,
            Currency = request.Currency,
            Date = request.Date,
            IsRecurring = request.IsRecurring,
            RecurrenceInterval = request.RecurrenceInterval,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Expense created: ExpenseId={ExpenseId}, PropertyId={PropertyId}, By={UserId}",
            expense.Id, propertyId, userId);

        return StatusCode(201, MapExpenseResponse(expense));
    }

    /// <summary>
    /// Update an expense.
    /// </summary>
    [HttpPut("{expenseId:guid}")]
    public async Task<IActionResult> Update(Guid propertyId, Guid expenseId, [FromBody] UpdateExpenseRequest request)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var expense = await _db.Expenses
            .FirstOrDefaultAsync(e => e.Id == expenseId && e.PropertyId == propertyId);

        if (expense is null)
            return NotFound(new { error = "not_found", message = "Expense not found." });

        expense.Category = request.Category;
        expense.Description = request.Description;
        expense.Amount = request.Amount;
        expense.Currency = request.Currency;
        expense.Date = request.Date;
        expense.IsRecurring = request.IsRecurring;
        expense.RecurrenceInterval = request.RecurrenceInterval;
        expense.Notes = request.Notes;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Expense updated: ExpenseId={ExpenseId}, PropertyId={PropertyId}, By={UserId}",
            expenseId, propertyId, userId);

        return Ok(MapExpenseResponse(expense));
    }

    /// <summary>
    /// Delete an expense.
    /// </summary>
    [HttpDelete("{expenseId:guid}")]
    public async Task<IActionResult> Delete(Guid propertyId, Guid expenseId)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var expense = await _db.Expenses
            .FirstOrDefaultAsync(e => e.Id == expenseId && e.PropertyId == propertyId);

        if (expense is null)
            return NotFound(new { error = "not_found", message = "Expense not found." });

        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Expense deleted: ExpenseId={ExpenseId}, PropertyId={PropertyId}, By={UserId}",
            expenseId, propertyId, userId);

        return NoContent();
    }

    // ---------- Helpers ----------

    private async Task<(bool Allowed, IActionResult? ErrorResult)> CheckPropertyAccess(Guid propertyId)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        var property = await _db.Properties.FindAsync(propertyId);
        if (property is null)
            return (false, NotFound(new { error = "not_found", message = "Property not found." }));

        if (!await _access.CanAccessPropertyAsync(userId, propertyId, role))
        {
            _logger.LogInformation("Property access denied: UserId={UserId}, PropertyId={PropertyId}", userId, propertyId);
            return (false, StatusCode(403, new { error = "forbidden", message = "You don't have access to this property." }));
        }

        return (true, null);
    }

    private static ExpenseResponse MapExpenseResponse(Expense e) => new()
    {
        Id = e.Id,
        PropertyId = e.PropertyId,
        Category = e.Category,
        Description = e.Description,
        Amount = e.Amount,
        Currency = e.Currency,
        Date = e.Date,
        IsRecurring = e.IsRecurring,
        RecurrenceInterval = e.RecurrenceInterval,
        Notes = e.Notes,
        CreatedAt = e.CreatedAt,
    };
}
