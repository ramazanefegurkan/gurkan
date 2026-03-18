using GurkanApi.Data;
using GurkanApi.DTOs.RentPayments;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/properties/{propertyId:guid}/tenants/{tenantId:guid}/rent-payments")]
[Authorize]
public class RentPaymentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<RentPaymentsController> _logger;

    public RentPaymentsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<RentPaymentsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// List payments for a tenant. Late detection: Pending + DueDate+5days &lt; UtcNow → "Late" in response.
    /// Optional filter: ?status=Pending/Paid/Late/Cancelled
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid propertyId, Guid tenantId, [FromQuery] string? status)
    {
        var (allowed, errorResult) = await CheckTenantAccess(propertyId, tenantId);
        if (!allowed) return errorResult!;

        var payments = await _db.RentPayments
            .Where(p => p.TenantId == tenantId)
            .OrderBy(p => p.DueDate)
            .ToListAsync();

        var now = DateTime.UtcNow;
        var response = payments.Select(p => MapPaymentResponse(p, now)).ToList();

        // Apply status filter after late detection computation
        if (!string.IsNullOrEmpty(status))
        {
            response = response
                .Where(r => r.Status.Equals(status, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return Ok(response);
    }

    /// <summary>
    /// Mark a payment as paid. Rejects if already Paid or Cancelled.
    /// </summary>
    [HttpPatch("{paymentId:guid}/pay")]
    public async Task<IActionResult> Pay(Guid propertyId, Guid tenantId, Guid paymentId, [FromBody] UpdateRentPaymentRequest request)
    {
        var userId = User.GetUserId();
        var (allowed, errorResult) = await CheckTenantAccess(propertyId, tenantId);
        if (!allowed) return errorResult!;

        var payment = await _db.RentPayments
            .FirstOrDefaultAsync(p => p.Id == paymentId && p.TenantId == tenantId);

        if (payment is null)
            return NotFound(new { error = "not_found", message = "Payment not found." });

        if (payment.Status == RentPaymentStatus.Paid)
            return BadRequest(new { error = "validation_error", message = "Payment is already marked as paid." });

        if (payment.Status == RentPaymentStatus.Cancelled)
            return BadRequest(new { error = "validation_error", message = "Cannot pay a cancelled payment." });

        payment.Status = RentPaymentStatus.Paid;
        payment.PaidDate = request.PaidDate ?? DateTime.UtcNow;
        payment.PaymentMethod = request.PaymentMethod;

        if (request.Notes is not null)
            payment.Notes = request.Notes;

        await _db.SaveChangesAsync();

        _logger.LogInformation("RentPayment paid: PaymentId={PaymentId}, TenantId={TenantId}, By={UserId}",
            paymentId, tenantId, userId);

        return Ok(MapPaymentResponse(payment, DateTime.UtcNow));
    }

    // ---------- Helpers ----------

    private static RentPaymentResponse MapPaymentResponse(RentPayment p, DateTime now)
    {
        // Compute effective status: Pending + DueDate+5 < now → Late
        var effectiveStatus = p.Status.ToString();
        if (p.Status == RentPaymentStatus.Pending && p.DueDate.AddDays(5) < now)
        {
            effectiveStatus = "Late";
        }

        return new RentPaymentResponse
        {
            Id = p.Id,
            TenantId = p.TenantId,
            Amount = p.Amount,
            Currency = p.Currency,
            DueDate = p.DueDate,
            PaidDate = p.PaidDate,
            Status = effectiveStatus,
            PaymentMethod = p.PaymentMethod?.ToString(),
            Notes = p.Notes,
            CreatedAt = p.CreatedAt,
        };
    }

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
