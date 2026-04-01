using GurkanApi.Data;
using GurkanApi.DTOs.CreditCards;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/credit-cards/{creditCardId:guid}/statements")]
[Authorize]
public class CreditCardStatementsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<CreditCardStatementsController> _logger;

    public CreditCardStatementsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<CreditCardStatementsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid creditCardId)
    {
        var (card, errorResult) = await LoadCardAndCheckAccess(creditCardId);
        if (card is null) return errorResult!;

        var statements = await _db.CreditCardStatements
            .Where(s => s.CreditCardId == creditCardId)
            .OrderByDescending(s => s.StatementDate)
            .ToListAsync();

        var response = new List<CreditCardStatementResponse>();
        foreach (var s in statements)
            response.Add(await MapStatementResponse(s, creditCardId));

        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid creditCardId, [FromBody] CreateStatementRequest request)
    {
        var userId = User.GetUserId();
        var (card, errorResult) = await LoadCardAndCheckAccess(creditCardId);
        if (card is null) return errorResult!;

        var now = DateTime.UtcNow;
        var month = request.Month ?? now.Month;
        var year = request.Year ?? now.Year;

        var billingDay = Math.Min(card.BillingDay, DateTime.DaysInMonth(year, month));
        var statementDate = new DateTime(year, month, billingDay, 0, 0, 0, DateTimeKind.Utc);

        int dueMonth, dueYear;
        if (card.DueDay < card.BillingDay)
        {
            dueMonth = month == 12 ? 1 : month + 1;
            dueYear = month == 12 ? year + 1 : year;
        }
        else
        {
            dueMonth = month;
            dueYear = year;
        }
        var dueDay = Math.Min(card.DueDay, DateTime.DaysInMonth(dueYear, dueMonth));
        var dueDate = new DateTime(dueYear, dueMonth, dueDay, 0, 0, 0, DateTimeKind.Utc);

        var duplicateExists = await _db.CreditCardStatements
            .AnyAsync(s => s.CreditCardId == creditCardId
                && s.StatementDate.Month == month
                && s.StatementDate.Year == year);

        if (duplicateExists)
            return StatusCode(409, new { error = "conflict", message = "A statement already exists for this period." });

        var previousStatementDate = await _db.CreditCardStatements
            .Where(ps => ps.CreditCardId == creditCardId && ps.StatementDate < statementDate)
            .OrderByDescending(ps => ps.StatementDate)
            .Select(ps => (DateTime?)ps.StatementDate)
            .FirstOrDefaultAsync();

        var spendingsQuery = _db.CreditCardSpendings
            .Where(cs => cs.CreditCardId == creditCardId && cs.Date <= statementDate);

        if (previousStatementDate.HasValue)
            spendingsQuery = spendingsQuery.Where(cs => cs.Date > previousStatementDate.Value);

        var itemizedTotal = await spendingsQuery
            .Select(cs => (decimal?)cs.Amount)
            .SumAsync() ?? 0m;

        if (request.TotalAmount < itemizedTotal)
            return BadRequest(new { error = "bad_request", message = "TotalAmount cannot be less than the sum of itemized spendings in the billing period." });

        var statement = new CreditCardStatement
        {
            Id = Guid.NewGuid(),
            CreditCardId = creditCardId,
            StatementDate = statementDate,
            DueDate = dueDate,
            TotalAmount = request.TotalAmount,
            IsPaid = false,
            CreatedAt = DateTime.UtcNow,
        };

        _db.CreditCardStatements.Add(statement);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Credit card statement created: Id={Id}, CreditCard={CreditCardId}, By={UserId}",
            statement.Id, creditCardId, userId);

        return StatusCode(201, await MapStatementResponse(statement, creditCardId));
    }

    [HttpPatch("{statementId:guid}/pay")]
    public async Task<IActionResult> Pay(Guid creditCardId, Guid statementId, [FromBody] PayStatementRequest request)
    {
        var userId = User.GetUserId();
        var (card, errorResult) = await LoadCardAndCheckAccess(creditCardId);
        if (card is null) return errorResult!;

        var statement = await _db.CreditCardStatements
            .FirstOrDefaultAsync(s => s.Id == statementId && s.CreditCardId == creditCardId);

        if (statement is null)
            return NotFound(new { error = "not_found", message = "Statement not found." });

        if (statement.IsPaid)
            return BadRequest(new { error = "bad_request", message = "Statement is already paid." });

        if (request.BankAccountId.HasValue)
        {
            var bankAccount = await _db.BankAccounts.FindAsync(request.BankAccountId.Value);
            if (bankAccount is null)
                return NotFound(new { error = "not_found", message = "Bank account not found." });

            if (bankAccount.GroupId != card.GroupId)
                return BadRequest(new { error = "bad_request", message = "Bank account does not belong to the same group as the credit card." });

            var transaction = new BankTransaction
            {
                Id = Guid.NewGuid(),
                BankAccountId = bankAccount.Id,
                Type = BankTransactionType.CreditCardPayment,
                Description = $"{card.Name} ekstre ödemesi",
                Amount = statement.TotalAmount,
                Date = DateTime.UtcNow,
                RelatedStatementId = statement.Id,
                CreatedAt = DateTime.UtcNow,
            };

            _db.BankTransactions.Add(transaction);
        }

        statement.IsPaid = true;
        statement.PaidDate = DateTime.UtcNow;
        statement.PaidFromBankAccountId = request.BankAccountId;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Credit card statement paid: Id={Id}, CreditCard={CreditCardId}, By={UserId}",
            statementId, creditCardId, userId);

        return Ok(await MapStatementResponse(statement, creditCardId));
    }

    [HttpDelete("{statementId:guid}")]
    public async Task<IActionResult> Delete(Guid creditCardId, Guid statementId)
    {
        var userId = User.GetUserId();
        var (card, errorResult) = await LoadCardAndCheckAccess(creditCardId);
        if (card is null) return errorResult!;

        var statement = await _db.CreditCardStatements
            .FirstOrDefaultAsync(s => s.Id == statementId && s.CreditCardId == creditCardId);

        if (statement is null)
            return NotFound(new { error = "not_found", message = "Statement not found." });

        _db.CreditCardStatements.Remove(statement);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Credit card statement deleted: Id={Id}, CreditCard={CreditCardId}, By={UserId}",
            statementId, creditCardId, userId);

        return NoContent();
    }

    private async Task<(CreditCard? Card, IActionResult? ErrorResult)> LoadCardAndCheckAccess(Guid creditCardId)
    {
        var card = await _db.CreditCards.FindAsync(creditCardId);
        if (card is null)
            return (null, NotFound(new { error = "not_found", message = "Credit card not found." }));

        var userId = User.GetUserId();
        var role = User.GetRole();

        if (role != UserRole.SuperAdmin && !await _access.IsUserInGroupAsync(userId, card.GroupId))
            return (null, StatusCode(403, new { error = "forbidden", message = "You don't have access to this group." }));

        return (card, null);
    }

    private async Task<CreditCardStatementResponse> MapStatementResponse(CreditCardStatement s, Guid creditCardId)
    {
        var previousStatementDate = await _db.CreditCardStatements
            .Where(ps => ps.CreditCardId == creditCardId && ps.StatementDate < s.StatementDate)
            .OrderByDescending(ps => ps.StatementDate)
            .Select(ps => (DateTime?)ps.StatementDate)
            .FirstOrDefaultAsync();

        var spendingsQuery = _db.CreditCardSpendings
            .Where(cs => cs.CreditCardId == creditCardId && cs.Date <= s.StatementDate);

        if (previousStatementDate.HasValue)
            spendingsQuery = spendingsQuery.Where(cs => cs.Date > previousStatementDate.Value);

        var spendings = await spendingsQuery.OrderByDescending(cs => cs.Date).ToListAsync();
        var itemizedTotal = spendings.Sum(cs => cs.Amount);

        return new CreditCardStatementResponse
        {
            Id = s.Id,
            CreditCardId = s.CreditCardId,
            StatementDate = s.StatementDate,
            DueDate = s.DueDate,
            TotalAmount = s.TotalAmount,
            IsPaid = s.IsPaid,
            PaidDate = s.PaidDate,
            PaidFromBankAccountId = s.PaidFromBankAccountId,
            ItemizedTotal = itemizedTotal,
            GeneralAmount = s.TotalAmount - itemizedTotal,
            ItemizedSpendings = spendings.Select(cs => new CreditCardSpendingResponse
            {
                Id = cs.Id,
                CreditCardId = cs.CreditCardId,
                Description = cs.Description,
                Amount = cs.Amount,
                Date = cs.Date,
                CreatedAt = cs.CreatedAt,
            }).ToList(),
            CreatedAt = s.CreatedAt,
        };
    }
}
