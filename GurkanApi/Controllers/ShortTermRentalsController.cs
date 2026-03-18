using GurkanApi.Data;
using GurkanApi.DTOs.ShortTermRentals;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/properties/{propertyId:guid}/short-term-rentals")]
[Authorize]
public class ShortTermRentalsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<ShortTermRentalsController> _logger;

    public ShortTermRentalsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<ShortTermRentalsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// List short-term rentals for a property, ordered by CheckIn descending.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid propertyId)
    {
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var rentals = await _db.ShortTermRentals
            .Where(r => r.PropertyId == propertyId)
            .OrderByDescending(r => r.CheckIn)
            .ToListAsync();

        var response = rentals.Select(MapRentalResponse).ToList();
        return Ok(response);
    }

    /// <summary>
    /// Get single short-term rental detail.
    /// </summary>
    [HttpGet("{rentalId:guid}")]
    public async Task<IActionResult> GetById(Guid propertyId, Guid rentalId)
    {
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var rental = await _db.ShortTermRentals
            .FirstOrDefaultAsync(r => r.Id == rentalId && r.PropertyId == propertyId);

        if (rental is null)
            return NotFound(new { error = "not_found", message = "Short-term rental not found." });

        return Ok(MapRentalResponse(rental));
    }

    /// <summary>
    /// Create a short-term rental. Validates CheckOut &gt; CheckIn and checks for date overlap.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create(Guid propertyId, [FromBody] CreateShortTermRentalRequest request)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        if (request.CheckOut <= request.CheckIn)
            return BadRequest(new { error = "validation_error", message = "CheckOut must be after CheckIn." });

        // Check for date overlap with existing rentals
        var overlap = await _db.ShortTermRentals
            .AnyAsync(r => r.PropertyId == propertyId
                           && r.CheckIn < request.CheckOut
                           && r.CheckOut > request.CheckIn);

        if (overlap)
            return Conflict(new { error = "conflict", message = "Date range overlaps with an existing short-term rental for this property." });

        var nightCount = (int)(request.CheckOut.Date - request.CheckIn.Date).TotalDays;

        var rental = new ShortTermRental
        {
            Id = Guid.NewGuid(),
            PropertyId = propertyId,
            GuestName = request.GuestName,
            CheckIn = request.CheckIn,
            CheckOut = request.CheckOut,
            NightCount = nightCount,
            NightlyRate = request.NightlyRate,
            TotalAmount = request.TotalAmount,
            PlatformFee = request.PlatformFee,
            NetAmount = request.NetAmount,
            Platform = request.Platform,
            Currency = request.Currency,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _db.ShortTermRentals.Add(rental);
        await _db.SaveChangesAsync();

        _logger.LogInformation("ShortTermRental created: RentalId={RentalId}, PropertyId={PropertyId}, By={UserId}",
            rental.Id, propertyId, userId);

        return StatusCode(201, MapRentalResponse(rental));
    }

    /// <summary>
    /// Update a short-term rental. Applies only non-null fields.
    /// </summary>
    [HttpPut("{rentalId:guid}")]
    public async Task<IActionResult> Update(Guid propertyId, Guid rentalId, [FromBody] UpdateShortTermRentalRequest request)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var rental = await _db.ShortTermRentals
            .FirstOrDefaultAsync(r => r.Id == rentalId && r.PropertyId == propertyId);

        if (rental is null)
            return NotFound(new { error = "not_found", message = "Short-term rental not found." });

        if (request.GuestName is not null) rental.GuestName = request.GuestName;
        if (request.CheckIn.HasValue) rental.CheckIn = request.CheckIn.Value;
        if (request.CheckOut.HasValue) rental.CheckOut = request.CheckOut.Value;
        if (request.NightlyRate.HasValue) rental.NightlyRate = request.NightlyRate.Value;
        if (request.TotalAmount.HasValue) rental.TotalAmount = request.TotalAmount.Value;
        if (request.PlatformFee.HasValue) rental.PlatformFee = request.PlatformFee.Value;
        if (request.NetAmount.HasValue) rental.NetAmount = request.NetAmount.Value;
        if (request.Platform.HasValue) rental.Platform = request.Platform.Value;
        if (request.Currency.HasValue) rental.Currency = request.Currency.Value;
        if (request.Notes is not null) rental.Notes = request.Notes;

        // Recompute NightCount
        rental.NightCount = (int)(rental.CheckOut.Date - rental.CheckIn.Date).TotalDays;

        // Validate dates after applying updates
        if (rental.CheckOut <= rental.CheckIn)
            return BadRequest(new { error = "validation_error", message = "CheckOut must be after CheckIn." });

        // Check for date overlap (exclude self)
        var overlap = await _db.ShortTermRentals
            .AnyAsync(r => r.PropertyId == propertyId
                           && r.Id != rentalId
                           && r.CheckIn < rental.CheckOut
                           && r.CheckOut > rental.CheckIn);

        if (overlap)
            return Conflict(new { error = "conflict", message = "Updated date range overlaps with an existing short-term rental." });

        await _db.SaveChangesAsync();

        _logger.LogInformation("ShortTermRental updated: RentalId={RentalId}, PropertyId={PropertyId}, By={UserId}",
            rentalId, propertyId, userId);

        return Ok(MapRentalResponse(rental));
    }

    /// <summary>
    /// Delete a short-term rental.
    /// </summary>
    [HttpDelete("{rentalId:guid}")]
    public async Task<IActionResult> Delete(Guid propertyId, Guid rentalId)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var rental = await _db.ShortTermRentals
            .FirstOrDefaultAsync(r => r.Id == rentalId && r.PropertyId == propertyId);

        if (rental is null)
            return NotFound(new { error = "not_found", message = "Short-term rental not found." });

        _db.ShortTermRentals.Remove(rental);
        await _db.SaveChangesAsync();

        _logger.LogInformation("ShortTermRental deleted: RentalId={RentalId}, PropertyId={PropertyId}, By={UserId}",
            rentalId, propertyId, userId);

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

    private static ShortTermRentalResponse MapRentalResponse(ShortTermRental r) => new()
    {
        Id = r.Id,
        PropertyId = r.PropertyId,
        GuestName = r.GuestName,
        CheckIn = r.CheckIn,
        CheckOut = r.CheckOut,
        NightCount = r.NightCount,
        NightlyRate = r.NightlyRate,
        TotalAmount = r.TotalAmount,
        PlatformFee = r.PlatformFee,
        NetAmount = r.NetAmount,
        Platform = r.Platform,
        Currency = r.Currency,
        Notes = r.Notes,
        CreatedAt = r.CreatedAt,
    };
}
