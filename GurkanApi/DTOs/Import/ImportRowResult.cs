namespace GurkanApi.DTOs.Import;

/// <summary>
/// Represents one parsed row from an Airbnb CSV import.
/// </summary>
public class AirbnbImportRow
{
    public int RowNumber { get; set; }
    public string Status { get; set; } = "Success"; // Success, Error, Warning
    public string? ErrorMessage { get; set; }
    public string? WarningMessage { get; set; }

    // Parsed Airbnb fields
    public string? GuestName { get; set; }
    public DateTime? CheckIn { get; set; }
    public DateTime? CheckOut { get; set; }
    public int? NightCount { get; set; }
    public decimal? NightlyRate { get; set; }
    public decimal? TotalAmount { get; set; }
    public decimal? PlatformFee { get; set; }
    public decimal? NetAmount { get; set; }
}

/// <summary>
/// Represents one parsed row from a rent payment CSV import.
/// </summary>
public class RentPaymentImportRow
{
    public int RowNumber { get; set; }
    public string Status { get; set; } = "Success"; // Success, Error, Warning
    public string? ErrorMessage { get; set; }
    public string? WarningMessage { get; set; }

    // Parsed rent payment fields
    public string? PropertyName { get; set; }
    public Guid? PropertyId { get; set; }
    public string? TenantName { get; set; }
    public Guid? TenantId { get; set; }
    public decimal? Amount { get; set; }
    public string? Currency { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? PaidDate { get; set; }
    public string? PaymentStatus { get; set; }
    public string? PaymentMethod { get; set; }
}
