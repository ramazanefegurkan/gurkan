using GurkanApi.Data;
using GurkanApi.DTOs.Tenants;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/properties/{propertyId:guid}/tenants")]
[Authorize]
public class TenantsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<TenantsController> _logger;

    public TenantsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<TenantsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// List tenants for a property. Optional filter: ?active=true/false.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid propertyId, [FromQuery] bool? active)
    {
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        IQueryable<Tenant> query = _db.Tenants.Where(t => t.PropertyId == propertyId);

        if (active.HasValue)
            query = query.Where(t => t.IsActive == active.Value);

        var tenants = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

        var response = tenants.Select(t => new TenantListResponse
        {
            Id = t.Id,
            FullName = t.FullName,
            Phone = t.Phone,
            Email = t.Email,
            LeaseStart = t.LeaseStart,
            LeaseEnd = t.LeaseEnd,
            MonthlyRent = t.MonthlyRent,
            Currency = t.Currency,
            IsActive = t.IsActive,
        }).ToList();

        return Ok(response);
    }

    /// <summary>
    /// Get single tenant detail.
    /// </summary>
    [HttpGet("{tenantId:guid}")]
    public async Task<IActionResult> GetById(Guid propertyId, Guid tenantId)
    {
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var tenant = await _db.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId && t.PropertyId == propertyId);

        if (tenant is null)
            return NotFound(new { error = "not_found", message = "Tenant not found." });

        return Ok(MapTenantResponse(tenant));
    }

    /// <summary>
    /// Create tenant. Enforces single active tenant per property.
    /// Auto-generates monthly RentPayment records from LeaseStart to LeaseEnd.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create(Guid propertyId, [FromBody] CreateTenantRequest request)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        if (request.LeaseEnd <= request.LeaseStart)
            return BadRequest(new { error = "validation_error", message = "LeaseEnd must be after LeaseStart." });

        // Check no other active tenant exists for this property
        var existingActive = await _db.Tenants
            .AnyAsync(t => t.PropertyId == propertyId && t.IsActive);

        if (existingActive)
        {
            _logger.LogInformation("Tenant create conflict: PropertyId={PropertyId} already has active tenant, By={UserId}",
                propertyId, userId);
            return Conflict(new { error = "conflict", message = "This property already has an active tenant. Terminate the existing tenant first." });
        }

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            PropertyId = propertyId,
            FullName = request.FullName,
            Phone = request.Phone,
            Email = request.Email,
            IdentityNumber = request.IdentityNumber,
            LeaseStart = request.LeaseStart,
            LeaseEnd = request.LeaseEnd,
            MonthlyRent = request.MonthlyRent,
            Deposit = request.Deposit,
            Currency = request.Currency,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Tenants.Add(tenant);

        // Auto-generate monthly RentPayment records
        var payments = GenerateMonthlyPayments(tenant);
        _db.RentPayments.AddRange(payments);

        await _db.SaveChangesAsync();

        _logger.LogInformation("Tenant created: TenantId={TenantId}, PropertyId={PropertyId}, By={UserId}, PaymentsGenerated={PaymentCount}",
            tenant.Id, propertyId, userId, payments.Count);

        return StatusCode(201, MapTenantResponse(tenant));
    }

    /// <summary>
    /// Update tenant info.
    /// </summary>
    [HttpPut("{tenantId:guid}")]
    public async Task<IActionResult> Update(Guid propertyId, Guid tenantId, [FromBody] UpdateTenantRequest request)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var tenant = await _db.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId && t.PropertyId == propertyId);

        if (tenant is null)
            return NotFound(new { error = "not_found", message = "Tenant not found." });

        tenant.FullName = request.FullName;
        tenant.Phone = request.Phone;
        tenant.Email = request.Email;
        tenant.IdentityNumber = request.IdentityNumber;

        if (request.LeaseStart.HasValue) tenant.LeaseStart = request.LeaseStart.Value;
        if (request.LeaseEnd.HasValue) tenant.LeaseEnd = request.LeaseEnd.Value;
        if (request.MonthlyRent.HasValue) tenant.MonthlyRent = request.MonthlyRent.Value;
        if (request.Deposit.HasValue) tenant.Deposit = request.Deposit.Value;
        if (request.Currency.HasValue) tenant.Currency = request.Currency.Value;

        tenant.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Tenant updated: TenantId={TenantId}, PropertyId={PropertyId}, By={UserId}",
            tenantId, propertyId, userId);

        return Ok(MapTenantResponse(tenant));
    }

    /// <summary>
    /// Terminate tenant: set IsActive=false, set LeaseEnd to today, cancel future Pending payments.
    /// </summary>
    [HttpPost("{tenantId:guid}/terminate")]
    public async Task<IActionResult> Terminate(Guid propertyId, Guid tenantId)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var tenant = await _db.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId && t.PropertyId == propertyId);

        if (tenant is null)
            return NotFound(new { error = "not_found", message = "Tenant not found." });

        if (!tenant.IsActive)
            return BadRequest(new { error = "validation_error", message = "Tenant is already terminated." });

        tenant.IsActive = false;
        tenant.LeaseEnd = DateTime.UtcNow;
        tenant.UpdatedAt = DateTime.UtcNow;

        // Cancel all future Pending payments
        var now = DateTime.UtcNow;
        var futurePayments = await _db.RentPayments
            .Where(p => p.TenantId == tenantId
                        && p.Status == RentPaymentStatus.Pending
                        && p.DueDate > now)
            .ToListAsync();

        foreach (var payment in futurePayments)
        {
            payment.Status = RentPaymentStatus.Cancelled;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Tenant terminated: TenantId={TenantId}, PropertyId={PropertyId}, By={UserId}, PaymentsCancelled={CancelCount}",
            tenantId, propertyId, userId, futurePayments.Count);

        return Ok(MapTenantResponse(tenant));
    }

    [HttpPost("{tenantId:guid}/renew")]
    public async Task<IActionResult> Renew(Guid propertyId, Guid tenantId, [FromBody] RenewLeaseRequest request)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckPropertyAccess(propertyId);
        if (!allowed) return errorResult!;

        var tenant = await _db.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId && t.PropertyId == propertyId);

        if (tenant is null)
            return NotFound(new { error = "not_found", message = "Tenant not found." });

        if (!tenant.IsActive)
            return BadRequest(new { error = "validation_error", message = "Sözleşmesi sonlanmış kiracı yenilenemez." });

        if (request.NewLeaseEnd <= tenant.LeaseEnd)
            return BadRequest(new { error = "validation_error", message = "Yeni bitiş tarihi mevcut bitiş tarihinden sonra olmalıdır." });

        var oldLeaseEnd = tenant.LeaseEnd;
        var previousRent = tenant.MonthlyRent;

        if (request.NewMonthlyRent != previousRent)
        {
            var increaseRate = previousRent > 0
                ? Math.Round((request.NewMonthlyRent - previousRent) / previousRent * 100, 2)
                : 0;

            var rentIncrease = new RentIncrease
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PreviousAmount = previousRent,
                NewAmount = request.NewMonthlyRent,
                IncreaseRate = increaseRate,
                EffectiveDate = oldLeaseEnd,
                Notes = request.Notes,
                CreatedAt = DateTime.UtcNow,
            };

            _db.RentIncreases.Add(rentIncrease);
            tenant.MonthlyRent = request.NewMonthlyRent;
        }

        tenant.LeaseEnd = request.NewLeaseEnd;
        tenant.UpdatedAt = DateTime.UtcNow;

        var newPayments = new List<RentPayment>();
        var current = oldLeaseEnd;
        var baseDate = tenant.LeaseStart;

        var monthsOffset = ((current.Year - baseDate.Year) * 12) + current.Month - baseDate.Month;
        if (current.Day < baseDate.Day) monthsOffset--;

        monthsOffset++;
        current = baseDate.AddMonths(monthsOffset);

        while (current < request.NewLeaseEnd)
        {
            newPayments.Add(new RentPayment
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Amount = request.NewMonthlyRent,
                Currency = tenant.Currency,
                DueDate = current,
                Status = RentPaymentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
            });

            monthsOffset++;
            current = baseDate.AddMonths(monthsOffset);
        }

        _db.RentPayments.AddRange(newPayments);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Tenant lease renewed: TenantId={TenantId}, PropertyId={PropertyId}, OldEnd={OldEnd}, NewEnd={NewEnd}, NewRent={NewRent}, PaymentsGenerated={PaymentCount}, By={UserId}",
            tenantId, propertyId, oldLeaseEnd, request.NewLeaseEnd, request.NewMonthlyRent, newPayments.Count, userId);

        return Ok(MapTenantResponse(tenant));
    }

    // ---------- Helpers ----------

    private List<RentPayment> GenerateMonthlyPayments(Tenant tenant)
    {
        var payments = new List<RentPayment>();
        var current = tenant.LeaseStart;

        while (current < tenant.LeaseEnd)
        {
            payments.Add(new RentPayment
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                Amount = tenant.MonthlyRent,
                Currency = tenant.Currency,
                DueDate = current,
                Status = RentPaymentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
            });

            // Advance by one month, keeping the same day-of-month as LeaseStart
            current = tenant.LeaseStart.AddMonths(payments.Count);
        }

        return payments;
    }

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

    private static TenantResponse MapTenantResponse(Tenant t) => new()
    {
        Id = t.Id,
        PropertyId = t.PropertyId,
        FullName = t.FullName,
        Phone = t.Phone,
        Email = t.Email,
        IdentityNumber = t.IdentityNumber,
        LeaseStart = t.LeaseStart,
        LeaseEnd = t.LeaseEnd,
        MonthlyRent = t.MonthlyRent,
        Deposit = t.Deposit,
        Currency = t.Currency,
        IsActive = t.IsActive,
        CreatedAt = t.CreatedAt,
        UpdatedAt = t.UpdatedAt,
    };
}
