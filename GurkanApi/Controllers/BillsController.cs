using GurkanApi.Data;
using GurkanApi.DTOs.Bills;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/properties/{propertyId:guid}/bills")]
[Authorize]
public class BillsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<BillsController> _logger;

    public BillsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<BillsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// List bills for a property, ordered by DueDate descending. Optional ?status= filter.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid propertyId, [FromQuery] BillPaymentStatus? status)
    {
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var query = _db.Bills.Where(b => b.PropertyId == propertyId);

        if (status.HasValue)
            query = query.Where(b => b.Status == status.Value);

        var bills = await query
            .OrderByDescending(b => b.DueDate)
            .ToListAsync();

        var response = bills.Select(MapBillResponse).ToList();
        return Ok(response);
    }

    /// <summary>
    /// Get single bill detail.
    /// </summary>
    [HttpGet("{billId:guid}")]
    public async Task<IActionResult> GetById(Guid propertyId, Guid billId)
    {
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var bill = await _db.Bills
            .FirstOrDefaultAsync(b => b.Id == billId && b.PropertyId == propertyId);

        if (bill is null)
            return NotFound(new { error = "not_found", message = "Bill not found." });

        return Ok(MapBillResponse(bill));
    }

    /// <summary>
    /// Create a bill.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create(Guid propertyId, [FromBody] CreateBillRequest request)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var bill = new Bill
        {
            Id = Guid.NewGuid(),
            PropertyId = propertyId,
            Type = request.Type,
            Amount = request.Amount,
            Currency = request.Currency,
            DueDate = request.DueDate,
            Status = BillPaymentStatus.Pending,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Bills.Add(bill);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Bill created: BillId={BillId}, PropertyId={PropertyId}, By={UserId}",
            bill.Id, propertyId, userId);

        return StatusCode(201, MapBillResponse(bill));
    }

    /// <summary>
    /// Update a bill (type, amount, currency, due date, notes — not status or paid date).
    /// </summary>
    [HttpPut("{billId:guid}")]
    public async Task<IActionResult> Update(Guid propertyId, Guid billId, [FromBody] UpdateBillRequest request)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var bill = await _db.Bills
            .FirstOrDefaultAsync(b => b.Id == billId && b.PropertyId == propertyId);

        if (bill is null)
            return NotFound(new { error = "not_found", message = "Bill not found." });

        bill.Type = request.Type;
        bill.Amount = request.Amount;
        bill.Currency = request.Currency;
        bill.DueDate = request.DueDate;
        bill.Notes = request.Notes;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Bill updated: BillId={BillId}, PropertyId={PropertyId}, By={UserId}",
            billId, propertyId, userId);

        return Ok(MapBillResponse(bill));
    }

    /// <summary>
    /// Delete a bill.
    /// </summary>
    [HttpDelete("{billId:guid}")]
    public async Task<IActionResult> Delete(Guid propertyId, Guid billId)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var bill = await _db.Bills
            .FirstOrDefaultAsync(b => b.Id == billId && b.PropertyId == propertyId);

        if (bill is null)
            return NotFound(new { error = "not_found", message = "Bill not found." });

        _db.Bills.Remove(bill);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Bill deleted: BillId={BillId}, PropertyId={PropertyId}, By={UserId}",
            billId, propertyId, userId);

        return NoContent();
    }

    /// <summary>
    /// Mark a bill as paid. Sets Status=Paid and PaidDate=now.
    /// </summary>
    [HttpPatch("{billId:guid}/pay")]
    public async Task<IActionResult> MarkAsPaid(Guid propertyId, Guid billId)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var bill = await _db.Bills
            .FirstOrDefaultAsync(b => b.Id == billId && b.PropertyId == propertyId);

        if (bill is null)
            return NotFound(new { error = "not_found", message = "Bill not found." });

        bill.Status = BillPaymentStatus.Paid;
        bill.PaidDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Bill paid: BillId={BillId}, PropertyId={PropertyId}, By={UserId}",
            billId, propertyId, userId);

        return Ok(MapBillResponse(bill));
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

    private static BillResponse MapBillResponse(Bill b) => new()
    {
        Id = b.Id,
        PropertyId = b.PropertyId,
        Type = b.Type,
        Amount = b.Amount,
        Currency = b.Currency,
        DueDate = b.DueDate,
        PaidDate = b.PaidDate,
        Status = b.Status,
        Notes = b.Notes,
        CreatedAt = b.CreatedAt,
    };
}
