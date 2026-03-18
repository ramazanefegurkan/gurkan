using System.Text;
using GurkanApi.DTOs.Import;

namespace GurkanApi.Services;

/// <summary>
/// Parses Airbnb CSV exports into structured import rows with flexible column detection,
/// Turkish locale support, and row-level validation.
/// </summary>
public class AirbnbCsvParser
{
    // Column alias mappings (normalized header → logical field)
    private static readonly Dictionary<string, string> ColumnAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        // Guest
        ["guest"] = "guestname",
        ["guest name"] = "guestname",
        ["guestname"] = "guestname",

        // Check-in
        ["start date"] = "checkin",
        ["check-in"] = "checkin",
        ["checkin"] = "checkin",
        ["check in"] = "checkin",

        // Check-out
        ["end date"] = "checkout",
        ["check-out"] = "checkout",
        ["checkout"] = "checkout",
        ["check out"] = "checkout",

        // Night count
        ["nights"] = "nightcount",
        ["night count"] = "nightcount",
        ["nightcount"] = "nightcount",

        // Net amount / payout
        ["amount"] = "netamount",
        ["net amount"] = "netamount",
        ["netamount"] = "netamount",
        ["payout"] = "netamount",

        // Total / gross amount
        ["gross earnings"] = "totalamount",
        ["total"] = "totalamount",
        ["total amount"] = "totalamount",
        ["totalamount"] = "totalamount",
        ["gross amount"] = "totalamount",

        // Platform fee
        ["host fee"] = "platformfee",
        ["service fee"] = "platformfee",
        ["platform fee"] = "platformfee",
        ["platformfee"] = "platformfee",
        ["host service fee"] = "platformfee",

        // Type (used for filtering)
        ["type"] = "type",

        // Listing / property (ignored — we use propertyId param)
        ["listing"] = "listing",
        ["property"] = "listing",

        // Currency (optional)
        ["currency"] = "currency",
    };

    /// <summary>
    /// Parses an Airbnb CSV stream and returns row-level import results.
    /// </summary>
    public Task<List<AirbnbImportRow>> ParseAsync(Stream csvStream, Guid propertyId)
    {
        var rows = new List<AirbnbImportRow>();

        using var reader = new StreamReader(csvStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);

        // Read header line
        var headerLine = reader.ReadLine();
        if (string.IsNullOrWhiteSpace(headerLine))
        {
            rows.Add(new AirbnbImportRow
            {
                RowNumber = 0,
                Status = "Error",
                ErrorMessage = "CSV file is empty or has no header row."
            });
            return Task.FromResult(rows);
        }

        var headers = CsvParsingHelpers.SplitCsvLine(headerLine);
        var columnMap = BuildColumnMap(headers);

        int rowNumber = 1; // Data rows start at 1 (header is row 0)
        string? line;
        while ((line = reader.ReadLine()) != null)
        {
            rowNumber++;

            if (string.IsNullOrWhiteSpace(line))
                continue;

            var fields = CsvParsingHelpers.SplitCsvLine(line);
            var row = ParseRow(fields, columnMap, rowNumber);

            if (row != null)
                rows.Add(row);
        }

        return Task.FromResult(rows);
    }

    private static Dictionary<string, int> BuildColumnMap(List<string> headers)
    {
        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        for (int i = 0; i < headers.Count; i++)
        {
            var normalized = CsvParsingHelpers.NormalizeHeader(headers[i]);
            if (ColumnAliases.TryGetValue(normalized, out var logicalName))
            {
                // Don't overwrite if we already have a mapping (first match wins)
                map.TryAdd(logicalName, i);
            }
        }

        return map;
    }

    private static AirbnbImportRow? ParseRow(List<string> fields, Dictionary<string, int> columnMap, int rowNumber)
    {
        var row = new AirbnbImportRow { RowNumber = rowNumber };
        var errors = new List<string>();
        var warnings = new List<string>();

        // Filter by type column if present
        if (columnMap.TryGetValue("type", out var typeIdx) && typeIdx < fields.Count)
        {
            var typeValue = fields[typeIdx].Trim();
            if (!string.IsNullOrEmpty(typeValue))
            {
                var lowerType = typeValue.ToLowerInvariant();
                if (lowerType is "adjustment" or "resolution")
                    return null; // Skip this row entirely
            }
        }

        // Guest name
        row.GuestName = GetField(fields, columnMap, "guestname");

        // Check-in (required)
        var checkInStr = GetField(fields, columnMap, "checkin");
        if (CsvParsingHelpers.TryParseDate(checkInStr, out var checkIn))
        {
            row.CheckIn = checkIn;
        }
        else if (!string.IsNullOrWhiteSpace(checkInStr))
        {
            errors.Add($"CheckIn: unable to parse date '{checkInStr}'");
        }
        else
        {
            errors.Add("CheckIn: required field is missing");
        }

        // Check-out (optional — can be computed)
        var checkOutStr = GetField(fields, columnMap, "checkout");
        if (CsvParsingHelpers.TryParseDate(checkOutStr, out var checkOut))
        {
            row.CheckOut = checkOut;
        }

        // Night count
        var nightCountStr = GetField(fields, columnMap, "nightcount");
        if (int.TryParse(nightCountStr?.Trim(), out var nightCount))
        {
            row.NightCount = nightCount;
        }

        // Total amount
        var totalStr = GetField(fields, columnMap, "totalamount");
        if (CsvParsingHelpers.TryParseDecimal(totalStr, out var total))
        {
            row.TotalAmount = total;
        }

        // Platform fee
        var feeStr = GetField(fields, columnMap, "platformfee");
        if (CsvParsingHelpers.TryParseDecimal(feeStr, out var fee))
        {
            row.PlatformFee = fee;
        }

        // Net amount
        var netStr = GetField(fields, columnMap, "netamount");
        if (CsvParsingHelpers.TryParseDecimal(netStr, out var net))
        {
            row.NetAmount = net;
        }

        // Validate: at least one amount field is required
        if (!row.TotalAmount.HasValue && !row.NetAmount.HasValue)
        {
            errors.Add("Amount: at least one of TotalAmount or NetAmount is required");
        }

        // Compute CheckOut from CheckIn + NightCount if missing
        if (!row.CheckOut.HasValue && row.CheckIn.HasValue && row.NightCount.HasValue)
        {
            row.CheckOut = row.CheckIn.Value.AddDays(row.NightCount.Value);
        }

        // Compute NightCount from CheckIn/CheckOut if missing
        if (!row.NightCount.HasValue && row.CheckIn.HasValue && row.CheckOut.HasValue)
        {
            row.NightCount = (int)(row.CheckOut.Value.Date - row.CheckIn.Value.Date).TotalDays;
        }

        // Compute NightlyRate
        if (row.TotalAmount.HasValue && row.NightCount is > 0)
        {
            row.NightlyRate = Math.Round(row.TotalAmount.Value / row.NightCount.Value, 2);
        }

        // Set status
        if (errors.Count > 0)
        {
            row.Status = "Error";
            row.ErrorMessage = string.Join("; ", errors);
        }
        else if (warnings.Count > 0)
        {
            row.Status = "Warning";
            row.WarningMessage = string.Join("; ", warnings);
        }

        return row;
    }

    private static string? GetField(List<string> fields, Dictionary<string, int> columnMap, string logicalName)
    {
        if (columnMap.TryGetValue(logicalName, out var idx) && idx < fields.Count)
        {
            var value = fields[idx].Trim();
            return string.IsNullOrEmpty(value) ? null : value;
        }

        return null;
    }
}
