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
[Route("api/credit-cards")]
[Authorize]
public class CreditCardsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<CreditCardsController> _logger;

    public CreditCardsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<CreditCardsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? groupId)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        IQueryable<CreditCard> query = _db.CreditCards;

        if (role != UserRole.SuperAdmin)
        {
            var groupIds = await _access.GetUserGroupIdsAsync(userId);
            query = query.Where(cc => groupIds.Contains(cc.GroupId));
        }

        if (groupId.HasValue)
            query = query.Where(cc => cc.GroupId == groupId.Value);

        var cards = await query.OrderBy(cc => cc.Name).ToListAsync();

        var response = new List<CreditCardListResponse>();
        foreach (var card in cards)
        {
            response.Add(new CreditCardListResponse
            {
                Id = card.Id,
                Name = card.Name,
                BankName = card.BankName,
                Currency = card.Currency,
                IsActive = card.IsActive,
                CurrentDebt = await ComputeCurrentDebt(card.Id),
            });
        }

        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var card = await _db.CreditCards.FindAsync(id);
        if (card is null)
            return NotFound(new { error = "not_found", message = "Credit card not found." });

        var (allowed, errorResult) = await CheckGroupAccess(card.GroupId);
        if (!allowed) return errorResult!;

        return Ok(new CreditCardResponse
        {
            Id = card.Id,
            GroupId = card.GroupId,
            Name = card.Name,
            BankName = card.BankName,
            BillingDay = card.BillingDay,
            DueDay = card.DueDay,
            Currency = card.Currency,
            IsActive = card.IsActive,
            CurrentDebt = await ComputeCurrentDebt(card.Id),
            CreatedAt = card.CreatedAt,
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCreditCardRequest request)
    {
        var userId = User.GetUserId();

        var group = await _db.Groups.FindAsync(request.GroupId);
        if (group is null)
            return NotFound(new { error = "not_found", message = "Group not found." });

        var (allowed, errorResult) = await CheckGroupAccess(request.GroupId);
        if (!allowed) return errorResult!;

        var card = new CreditCard
        {
            Id = Guid.NewGuid(),
            GroupId = request.GroupId,
            Name = request.Name,
            BankName = request.BankName,
            BillingDay = request.BillingDay,
            DueDay = request.DueDay,
            Currency = request.Currency,
            CreatedAt = DateTime.UtcNow,
        };

        _db.CreditCards.Add(card);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Credit card created: Id={Id}, Group={GroupId}, By={UserId}",
            card.Id, card.GroupId, userId);

        return StatusCode(201, new CreditCardResponse
        {
            Id = card.Id,
            GroupId = card.GroupId,
            Name = card.Name,
            BankName = card.BankName,
            BillingDay = card.BillingDay,
            DueDay = card.DueDay,
            Currency = card.Currency,
            IsActive = card.IsActive,
            CurrentDebt = 0,
            CreatedAt = card.CreatedAt,
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCreditCardRequest request)
    {
        var userId = User.GetUserId();

        var card = await _db.CreditCards.FindAsync(id);
        if (card is null)
            return NotFound(new { error = "not_found", message = "Credit card not found." });

        var (allowed, errorResult) = await CheckGroupAccess(card.GroupId);
        if (!allowed) return errorResult!;

        if (request.Name is not null) card.Name = request.Name;
        if (request.BankName is not null) card.BankName = request.BankName;
        if (request.BillingDay.HasValue) card.BillingDay = request.BillingDay.Value;
        if (request.DueDay.HasValue) card.DueDay = request.DueDay.Value;
        if (request.Currency.HasValue) card.Currency = request.Currency.Value;
        if (request.IsActive.HasValue) card.IsActive = request.IsActive.Value;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Credit card updated: Id={Id}, By={UserId}", id, userId);

        return Ok(new CreditCardResponse
        {
            Id = card.Id,
            GroupId = card.GroupId,
            Name = card.Name,
            BankName = card.BankName,
            BillingDay = card.BillingDay,
            DueDay = card.DueDay,
            Currency = card.Currency,
            IsActive = card.IsActive,
            CurrentDebt = await ComputeCurrentDebt(card.Id),
            CreatedAt = card.CreatedAt,
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = User.GetUserId();

        var card = await _db.CreditCards.FindAsync(id);
        if (card is null)
            return NotFound(new { error = "not_found", message = "Credit card not found." });

        var (allowed, errorResult) = await CheckGroupAccess(card.GroupId);
        if (!allowed) return errorResult!;

        _db.CreditCards.Remove(card);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Credit card deleted: Id={Id}, By={UserId}", id, userId);
        return NoContent();
    }

    private async Task<(bool Allowed, IActionResult? ErrorResult)> CheckGroupAccess(Guid groupId)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        if (role != UserRole.SuperAdmin && !await _access.IsUserInGroupAsync(userId, groupId))
            return (false, StatusCode(403, new { error = "forbidden", message = "You don't have access to this group." }));

        return (true, null);
    }

    private async Task<decimal> ComputeCurrentDebt(Guid creditCardId)
    {
        var unpaidStatements = await _db.CreditCardStatements
            .Where(s => s.CreditCardId == creditCardId && !s.IsPaid)
            .Select(s => (decimal?)s.TotalAmount)
            .SumAsync() ?? 0m;

        var latestStatementDate = await _db.CreditCardStatements
            .Where(s => s.CreditCardId == creditCardId)
            .OrderByDescending(s => s.StatementDate)
            .Select(s => (DateTime?)s.StatementDate)
            .FirstOrDefaultAsync();

        var unbilledQuery = _db.CreditCardSpendings
            .Where(cs => cs.CreditCardId == creditCardId);

        if (latestStatementDate.HasValue)
            unbilledQuery = unbilledQuery.Where(cs => cs.Date > latestStatementDate.Value);

        var unbilledSpendings = await unbilledQuery
            .Select(cs => (decimal?)cs.Amount)
            .SumAsync() ?? 0m;

        return unpaidStatements + unbilledSpendings;
    }
}
