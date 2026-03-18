using GurkanApi.Data;
using GurkanApi.DTOs.RentIncreases;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/properties/{propertyId:guid}/tenants/{tenantId:guid}/rent-increases")]
[Authorize]
public class RentIncreasesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<RentIncreasesController> _logger;

    public RentIncreasesController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<RentIncreasesController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// List rent increases for a tenant, ordered by EffectiveDate descending.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid propertyId, Guid tenantId)
    {
        var (allowed, errorResult) = await CheckTenantAccess(propertyId, tenantId);
        if (!allowed) return errorResult!;

        var increases = await _db.RentIncreases
            .Where(r => r.TenantId == tenantId)
            .OrderByDescending(r => r.EffectiveDate)
            .ToListAsync();

        var response = increases.Select(MapIncreaseResponse).ToList();
        return Ok(response);
    }

    /// <summary>
    /// Create a rent increase. Records PreviousAmount, computes IncreaseRate,
    /// updates Tenant.MonthlyRent, and updates all future Pending payments.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create(Guid propertyId, Guid tenantId, [FromBody] CreateRentIncreaseRequest request)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckTenantAccess(propertyId, tenantId);
        if (!allowed) return errorResult!;

        var tenant = await _db.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId && t.PropertyId == propertyId);

        if (tenant is null)
            return NotFound(new { error = "not_found", message = "Tenant not found." });

        var previousAmount = tenant.MonthlyRent;
        var increaseRate = previousAmount > 0
            ? (request.NewAmount - previousAmount) / previousAmount * 100
            : 0;

        var increase = new RentIncrease
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PreviousAmount = previousAmount,
            NewAmount = request.NewAmount,
            IncreaseRate = Math.Round(increaseRate, 2),
            EffectiveDate = request.EffectiveDate,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _db.RentIncreases.Add(increase);

        // Update tenant's monthly rent
        tenant.MonthlyRent = request.NewAmount;
        tenant.UpdatedAt = DateTime.UtcNow;

        // Update all future Pending payments (DueDate >= EffectiveDate) to new amount
        var futurePayments = await _db.RentPayments
            .Where(p => p.TenantId == tenantId
                        && p.Status == RentPaymentStatus.Pending
                        && p.DueDate >= request.EffectiveDate)
            .ToListAsync();

        foreach (var payment in futurePayments)
        {
            payment.Amount = request.NewAmount;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("RentIncrease created: IncreaseId={IncreaseId}, TenantId={TenantId}, PropertyId={PropertyId}, By={UserId}, PreviousAmount={PreviousAmount}, NewAmount={NewAmount}, PaymentsUpdated={PaymentCount}",
            increase.Id, tenantId, propertyId, userId, previousAmount, request.NewAmount, futurePayments.Count);

        return StatusCode(201, MapIncreaseResponse(increase));
    }

    // ---------- Helpers ----------

    private static RentIncreaseResponse MapIncreaseResponse(RentIncrease r) => new()
    {
        Id = r.Id,
        TenantId = r.TenantId,
        PreviousAmount = r.PreviousAmount,
        NewAmount = r.NewAmount,
        IncreaseRate = r.IncreaseRate,
        EffectiveDate = r.EffectiveDate,
        Notes = r.Notes,
        CreatedAt = r.CreatedAt,
    };

    private async Task<(bool Allowed, IActionResult? ErrorResult)> CheckTenantAccess(Guid propertyId, Guid tenantId)
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

        // Verify tenant belongs to this property
        var tenantExists = await _db.Tenants
            .AnyAsync(t => t.Id == tenantId && t.PropertyId == propertyId);

        if (!tenantExists)
            return (false, NotFound(new { error = "not_found", message = "Tenant not found for this property." }));

        return (true, null);
    }
}
