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
[Route("api/credit-cards/{creditCardId:guid}/spendings")]
[Authorize]
public class CreditCardSpendingsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<CreditCardSpendingsController> _logger;

    public CreditCardSpendingsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<CreditCardSpendingsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid creditCardId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var (card, errorResult) = await LoadCardAndCheckAccess(creditCardId);
        if (card is null) return errorResult!;

        var query = _db.CreditCardSpendings.Where(cs => cs.CreditCardId == creditCardId);

        if (from.HasValue)
            query = query.Where(cs => cs.Date >= from.Value);

        if (to.HasValue)
            query = query.Where(cs => cs.Date <= to.Value);

        var spendings = await query.OrderByDescending(cs => cs.Date).ToListAsync();

        return Ok(spendings.Select(MapResponse).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid creditCardId, [FromBody] CreateCreditCardSpendingRequest request)
    {
        var userId = User.GetUserId();
        var (card, errorResult) = await LoadCardAndCheckAccess(creditCardId);
        if (card is null) return errorResult!;

        var spending = new CreditCardSpending
        {
            Id = Guid.NewGuid(),
            CreditCardId = creditCardId,
            Description = request.Description,
            Amount = request.Amount,
            Date = request.Date,
            CreatedAt = DateTime.UtcNow,
        };

        _db.CreditCardSpendings.Add(spending);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Credit card spending created: Id={Id}, CreditCard={CreditCardId}, By={UserId}",
            spending.Id, creditCardId, userId);

        return StatusCode(201, MapResponse(spending));
    }

    [HttpPut("{spendingId:guid}")]
    public async Task<IActionResult> Update(Guid creditCardId, Guid spendingId, [FromBody] UpdateCreditCardSpendingRequest request)
    {
        var userId = User.GetUserId();
        var (card, errorResult) = await LoadCardAndCheckAccess(creditCardId);
        if (card is null) return errorResult!;

        var spending = await _db.CreditCardSpendings
            .FirstOrDefaultAsync(cs => cs.Id == spendingId && cs.CreditCardId == creditCardId);

        if (spending is null)
            return NotFound(new { error = "not_found", message = "Spending not found." });

        if (request.Description is not null) spending.Description = request.Description;
        if (request.Amount.HasValue) spending.Amount = request.Amount.Value;
        if (request.Date.HasValue) spending.Date = request.Date.Value;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Credit card spending updated: Id={Id}, CreditCard={CreditCardId}, By={UserId}",
            spendingId, creditCardId, userId);

        return Ok(MapResponse(spending));
    }

    [HttpDelete("{spendingId:guid}")]
    public async Task<IActionResult> Delete(Guid creditCardId, Guid spendingId)
    {
        var userId = User.GetUserId();
        var (card, errorResult) = await LoadCardAndCheckAccess(creditCardId);
        if (card is null) return errorResult!;

        var spending = await _db.CreditCardSpendings
            .FirstOrDefaultAsync(cs => cs.Id == spendingId && cs.CreditCardId == creditCardId);

        if (spending is null)
            return NotFound(new { error = "not_found", message = "Spending not found." });

        _db.CreditCardSpendings.Remove(spending);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Credit card spending deleted: Id={Id}, CreditCard={CreditCardId}, By={UserId}",
            spendingId, creditCardId, userId);

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

    private static CreditCardSpendingResponse MapResponse(CreditCardSpending cs) => new()
    {
        Id = cs.Id,
        CreditCardId = cs.CreditCardId,
        Description = cs.Description,
        Amount = cs.Amount,
        Date = cs.Date,
        CreatedAt = cs.CreatedAt,
    };
}
