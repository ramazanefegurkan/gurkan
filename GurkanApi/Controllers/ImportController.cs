using GurkanApi.Data;
using GurkanApi.DTOs.Import;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/import")]
[Authorize]
public class ImportController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<ImportController> _logger;

    public ImportController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<ImportController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// Import Airbnb CSV data. dryRun=true (default) returns a preview; dryRun=false commits records.
    /// </summary>
    [HttpPost("airbnb-csv")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> ImportAirbnbCsv(
        IFormFile file,
        [FromQuery] Guid propertyId,
        [FromQuery] bool dryRun = true)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        // Validate file
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "invalid_file", message = "File is required and must not be empty." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".csv")
            return BadRequest(new { error = "invalid_file_type", message = "Only .csv files are accepted." });

        // Check property access
        var property = await _db.Properties.FindAsync(propertyId);
        if (property is null)
            return NotFound(new { error = "not_found", message = "Property not found." });

        if (!await _access.CanAccessPropertyAsync(userId, propertyId, role))
        {
            _logger.LogInformation("Import access denied: UserId={UserId}, PropertyId={PropertyId}", userId, propertyId);
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this property." });
        }

        // Parse CSV
        var parser = new AirbnbCsvParser();
        List<AirbnbImportRow> rows;

        await using (var stream = file.OpenReadStream())
        {
            rows = await parser.ParseAsync(stream, propertyId);
        }

        // Duplicate detection: check existing records
        foreach (var row in rows.Where(r => r.Status != "Error" && r.CheckIn.HasValue))
        {
            var isDuplicate = await _db.ShortTermRentals.AnyAsync(s =>
                s.PropertyId == propertyId &&
                s.CheckIn == row.CheckIn!.Value &&
                s.GuestName == row.GuestName);

            if (isDuplicate)
            {
                row.Status = "Warning";
                var existingWarning = row.WarningMessage;
                var dupMsg = $"Duplicate: reservation for '{row.GuestName}' on {row.CheckIn:yyyy-MM-dd} already exists";
                row.WarningMessage = string.IsNullOrEmpty(existingWarning)
                    ? dupMsg
                    : $"{existingWarning}; {dupMsg}";
            }
        }

        // Build summary
        var summary = BuildSummary(rows.Select(r => (r.Status, r.WarningMessage)).ToList());

        // If not dry run and no errors, create records
        if (!dryRun && summary.ErrorCount == 0)
        {
            var created = 0;
            foreach (var row in rows.Where(r => r.Status is "Success" or "Warning"))
            {
                var rental = new ShortTermRental
                {
                    Id = Guid.NewGuid(),
                    PropertyId = propertyId,
                    GuestName = row.GuestName,
                    CheckIn = row.CheckIn!.Value,
                    CheckOut = row.CheckOut ?? row.CheckIn.Value.AddDays(row.NightCount ?? 1),
                    NightCount = row.NightCount ?? 1,
                    NightlyRate = row.NightlyRate ?? 0m,
                    TotalAmount = row.TotalAmount ?? 0m,
                    PlatformFee = row.PlatformFee ?? 0m,
                    NetAmount = row.NetAmount ?? 0m,
                    Platform = RentalPlatform.Airbnb,
                    Currency = property.Currency,
                    Notes = "Imported from CSV",
                    CreatedAt = DateTime.UtcNow,
                };

                _db.ShortTermRentals.Add(rental);
                created++;
            }

            await _db.SaveChangesAsync();
            summary.ImportedCount = created;

            _logger.LogInformation(
                "Import completed: Type={ImportType}, PropertyId={PropertyId}, TotalRows={Total}, Imported={Imported}, Errors={Errors}, By={UserId}",
                "AirbnbCsv", propertyId, summary.TotalRows, summary.ImportedCount, summary.ErrorCount, userId);
        }

        return Ok(new ImportPreviewResponse<AirbnbImportRow>
        {
            Summary = summary,
            Rows = rows,
        });
    }

    /// <summary>
    /// Import rent payment CSV data. dryRun=true (default) returns a preview; dryRun=false commits records.
    /// </summary>
    [HttpPost("rent-payments")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> ImportRentPayments(
        IFormFile file,
        [FromQuery] bool dryRun = true)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        // Validate file
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "invalid_file", message = "File is required and must not be empty." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".csv")
            return BadRequest(new { error = "invalid_file_type", message = "Only .csv files are accepted." });

        // Parse CSV
        var parser = new RentPaymentCsvParser();
        List<RentPaymentImportRow> rows;

        await using (var stream = file.OpenReadStream())
        {
            rows = await parser.ParseAsync(stream, _db, userId, role, _access);
        }

        // Build summary
        var summary = BuildSummary(rows.Select(r => (r.Status, r.WarningMessage)).ToList());

        // If not dry run and no errors, create records
        if (!dryRun && summary.ErrorCount == 0)
        {
            var created = 0;
            foreach (var row in rows.Where(r => r.Status is "Success" or "Warning"))
            {
                if (!row.TenantId.HasValue || !row.DueDate.HasValue || !row.Amount.HasValue)
                    continue;

                // Determine currency
                var currency = Currency.TRY; // default
                if (!string.IsNullOrEmpty(row.Currency) &&
                    Enum.TryParse<Currency>(row.Currency, ignoreCase: true, out var parsedCurrency))
                {
                    currency = parsedCurrency;
                }

                // Determine status
                var status = RentPaymentStatus.Pending;
                if (!string.IsNullOrEmpty(row.PaymentStatus) &&
                    Enum.TryParse<RentPaymentStatus>(row.PaymentStatus, ignoreCase: true, out var parsedStatus))
                {
                    status = parsedStatus;
                }

                // Determine payment method
                PaymentMethod? paymentMethod = null;
                if (!string.IsNullOrEmpty(row.PaymentMethod) &&
                    Enum.TryParse<PaymentMethod>(row.PaymentMethod, ignoreCase: true, out var parsedMethod))
                {
                    paymentMethod = parsedMethod;
                }

                var payment = new RentPayment
                {
                    Id = Guid.NewGuid(),
                    TenantId = row.TenantId.Value,
                    Amount = row.Amount.Value,
                    Currency = currency,
                    DueDate = row.DueDate.Value,
                    PaidDate = row.PaidDate,
                    Status = status,
                    PaymentMethod = paymentMethod,
                    Notes = "Imported from CSV",
                    CreatedAt = DateTime.UtcNow,
                };

                _db.RentPayments.Add(payment);
                created++;
            }

            await _db.SaveChangesAsync();
            summary.ImportedCount = created;

            _logger.LogInformation(
                "Import completed: Type={ImportType}, PropertyId={PropertyId}, TotalRows={Total}, Imported={Imported}, Errors={Errors}, By={UserId}",
                "RentPaymentCsv", "multiple", summary.TotalRows, summary.ImportedCount, summary.ErrorCount, userId);
        }

        return Ok(new ImportPreviewResponse<RentPaymentImportRow>
        {
            Summary = summary,
            Rows = rows,
        });
    }

    // ---------- Helpers ----------

    private static ImportSummary BuildSummary(List<(string Status, string? WarningMessage)> rows)
    {
        var summary = new ImportSummary
        {
            TotalRows = rows.Count,
            ErrorCount = rows.Count(r => r.Status == "Error"),
            WarningCount = rows.Count(r => r.Status == "Warning"),
        };

        // Count duplicates (warnings that contain "Duplicate:")
        summary.DuplicateCount = rows.Count(r =>
            r.Status == "Warning" &&
            r.WarningMessage?.Contains("Duplicate:") == true);

        return summary;
    }
}
