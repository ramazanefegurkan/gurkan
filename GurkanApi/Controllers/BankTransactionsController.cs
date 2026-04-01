using GurkanApi.Data;
using GurkanApi.DTOs.BankAccounts;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/bank-accounts/{bankAccountId:guid}/transactions")]
[Authorize]
public class BankTransactionsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<BankTransactionsController> _logger;

    public BankTransactionsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<BankTransactionsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid bankAccountId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var (account, errorResult) = await LoadAccountAndCheckAccess(bankAccountId);
        if (account is null) return errorResult!;

        var query = _db.BankTransactions.Where(bt => bt.BankAccountId == bankAccountId);

        if (from.HasValue)
            query = query.Where(bt => bt.Date >= from.Value);

        if (to.HasValue)
            query = query.Where(bt => bt.Date <= to.Value);

        var transactions = await query.OrderByDescending(bt => bt.Date).ToListAsync();

        return Ok(transactions.Select(MapResponse).ToList());
    }

    [HttpGet("balance")]
    public async Task<IActionResult> GetBalance(Guid bankAccountId)
    {
        var (account, errorResult) = await LoadAccountAndCheckAccess(bankAccountId);
        if (account is null) return errorResult!;

        var income = await _db.BankTransactions
            .Where(bt => bt.BankAccountId == bankAccountId && bt.Type == BankTransactionType.Income)
            .Select(bt => (decimal?)bt.Amount).SumAsync() ?? 0m;

        var outgoing = await _db.BankTransactions
            .Where(bt => bt.BankAccountId == bankAccountId && bt.Type != BankTransactionType.Income)
            .Select(bt => (decimal?)bt.Amount).SumAsync() ?? 0m;

        return Ok(new BankAccountBalanceResponse
        {
            BankAccountId = bankAccountId,
            Balance = income - outgoing,
            Currency = account.Currency,
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid bankAccountId, [FromBody] CreateBankTransactionRequest request)
    {
        var userId = User.GetUserId();
        var (account, errorResult) = await LoadAccountAndCheckAccess(bankAccountId);
        if (account is null) return errorResult!;

        if (request.Type == BankTransactionType.CreditCardPayment)
            return BadRequest(new { error = "bad_request", message = "CreditCardPayment transactions are created automatically via statement pay." });

        var transaction = new BankTransaction
        {
            Id = Guid.NewGuid(),
            BankAccountId = bankAccountId,
            Type = request.Type,
            Description = request.Description,
            Amount = request.Amount,
            Date = request.Date,
            CreatedAt = DateTime.UtcNow,
        };

        _db.BankTransactions.Add(transaction);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Bank transaction created: Id={Id}, BankAccount={BankAccountId}, By={UserId}",
            transaction.Id, bankAccountId, userId);

        return StatusCode(201, MapResponse(transaction));
    }

    [HttpPut("{transactionId:guid}")]
    public async Task<IActionResult> Update(Guid bankAccountId, Guid transactionId, [FromBody] UpdateBankTransactionRequest request)
    {
        var userId = User.GetUserId();
        var (account, errorResult) = await LoadAccountAndCheckAccess(bankAccountId);
        if (account is null) return errorResult!;

        var transaction = await _db.BankTransactions
            .FirstOrDefaultAsync(bt => bt.Id == transactionId && bt.BankAccountId == bankAccountId);

        if (transaction is null)
            return NotFound(new { error = "not_found", message = "Transaction not found." });

        if (transaction.Type == BankTransactionType.CreditCardPayment)
            return BadRequest(new { error = "bad_request", message = "Cannot edit CreditCardPayment transactions." });

        if (request.Type == BankTransactionType.CreditCardPayment)
            return BadRequest(new { error = "bad_request", message = "Cannot edit CreditCardPayment transactions." });

        if (request.Type.HasValue) transaction.Type = request.Type.Value;
        if (request.Description is not null) transaction.Description = request.Description;
        if (request.Amount.HasValue) transaction.Amount = request.Amount.Value;
        if (request.Date.HasValue) transaction.Date = request.Date.Value;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Bank transaction updated: Id={Id}, BankAccount={BankAccountId}, By={UserId}",
            transactionId, bankAccountId, userId);

        return Ok(MapResponse(transaction));
    }

    [HttpDelete("{transactionId:guid}")]
    public async Task<IActionResult> Delete(Guid bankAccountId, Guid transactionId)
    {
        var userId = User.GetUserId();
        var (account, errorResult) = await LoadAccountAndCheckAccess(bankAccountId);
        if (account is null) return errorResult!;

        var transaction = await _db.BankTransactions
            .FirstOrDefaultAsync(bt => bt.Id == transactionId && bt.BankAccountId == bankAccountId);

        if (transaction is null)
            return NotFound(new { error = "not_found", message = "Transaction not found." });

        if (transaction.Type == BankTransactionType.CreditCardPayment)
            return BadRequest(new { error = "bad_request", message = "Cannot delete CreditCardPayment transactions." });

        _db.BankTransactions.Remove(transaction);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Bank transaction deleted: Id={Id}, BankAccount={BankAccountId}, By={UserId}",
            transactionId, bankAccountId, userId);

        return NoContent();
    }

    private async Task<(BankAccount? Account, IActionResult? ErrorResult)> LoadAccountAndCheckAccess(Guid bankAccountId)
    {
        var account = await _db.BankAccounts.FindAsync(bankAccountId);
        if (account is null)
            return (null, NotFound(new { error = "not_found", message = "Bank account not found." }));

        var userId = User.GetUserId();
        var role = User.GetRole();

        if (role != UserRole.SuperAdmin && !await _access.IsUserInGroupAsync(userId, account.GroupId))
            return (null, StatusCode(403, new { error = "forbidden", message = "You don't have access to this bank account." }));

        return (account, null);
    }

    private static BankTransactionResponse MapResponse(BankTransaction bt) => new()
    {
        Id = bt.Id,
        BankAccountId = bt.BankAccountId,
        Type = bt.Type,
        Description = bt.Description,
        Amount = bt.Amount,
        Date = bt.Date,
        RelatedStatementId = bt.RelatedStatementId,
        CreatedAt = bt.CreatedAt,
    };
}
