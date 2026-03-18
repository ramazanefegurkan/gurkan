using System.Globalization;
using System.Text;

namespace GurkanApi.Services;

/// <summary>
/// Shared CSV parsing utilities for date, decimal, header normalization, and line splitting.
/// Handles Turkish locale (comma decimal, period thousands separator) and multiple date formats.
/// </summary>
public static class CsvParsingHelpers
{
    private static readonly string[] DateFormats =
    [
        "yyyy-MM-dd",
        "MM/dd/yyyy",
        "dd/MM/yyyy",
        "dd.MM.yyyy",
        "M/d/yyyy",
        "d.M.yyyy",
        "yyyy-MM-ddTHH:mm:ss",
        "yyyy-MM-ddTHH:mm:ssZ",
    ];

    /// <summary>
    /// Attempts to parse a date string using multiple formats. Returns UTC.
    /// </summary>
    public static bool TryParseDate(string? input, out DateTime result)
    {
        result = default;
        if (string.IsNullOrWhiteSpace(input))
            return false;

        var trimmed = input.Trim();

        if (DateTime.TryParseExact(trimmed, DateFormats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var parsed))
        {
            result = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
            return true;
        }

        // Fallback: general parse with invariant culture
        if (DateTime.TryParse(trimmed, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out parsed))
        {
            result = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
            return true;
        }

        return false;
    }

    /// <summary>
    /// Attempts to parse a decimal string. Tries invariant culture first, then Turkish locale fallback
    /// (strip periods as thousands separators, replace comma with period).
    /// Also strips currency symbols ($, €, ₺).
    /// </summary>
    public static bool TryParseDecimal(string? input, out decimal result)
    {
        result = 0m;
        if (string.IsNullOrWhiteSpace(input))
            return false;

        var trimmed = input.Trim();

        // Strip currency symbols
        trimmed = trimmed.Replace("$", "").Replace("€", "").Replace("₺", "").Trim();

        if (string.IsNullOrWhiteSpace(trimmed))
            return false;

        // Try invariant culture first (1,234.56 or 1234.56)
        if (decimal.TryParse(trimmed, NumberStyles.Number | NumberStyles.AllowCurrencySymbol,
                CultureInfo.InvariantCulture, out result))
        {
            return true;
        }

        // Turkish locale fallback: periods are thousands separators, comma is decimal
        // e.g., "1.234,56" → "1234.56"
        var turkishNormalized = trimmed.Replace(".", "").Replace(",", ".");
        if (decimal.TryParse(turkishNormalized, NumberStyles.Number,
                CultureInfo.InvariantCulture, out result))
        {
            return true;
        }

        return false;
    }

    /// <summary>
    /// Splits a CSV line by comma, respecting quoted fields.
    /// If a field starts with double-quote, reads until the closing double-quote.
    /// </summary>
    public static List<string> SplitCsvLine(string line)
    {
        var fields = new List<string>();
        var current = new StringBuilder();
        bool inQuotes = false;
        int i = 0;

        while (i < line.Length)
        {
            char c = line[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    // Check for escaped quote ("")
                    if (i + 1 < line.Length && line[i + 1] == '"')
                    {
                        current.Append('"');
                        i += 2;
                        continue;
                    }
                    else
                    {
                        // End of quoted field
                        inQuotes = false;
                        i++;
                        continue;
                    }
                }
                else
                {
                    current.Append(c);
                    i++;
                }
            }
            else
            {
                if (c == '"' && current.Length == 0)
                {
                    inQuotes = true;
                    i++;
                }
                else if (c == ',')
                {
                    fields.Add(current.ToString().Trim());
                    current.Clear();
                    i++;
                }
                else
                {
                    current.Append(c);
                    i++;
                }
            }
        }

        fields.Add(current.ToString().Trim());
        return fields;
    }

    /// <summary>
    /// Normalizes a header string: lowercase, trim, remove extra spaces.
    /// </summary>
    public static string NormalizeHeader(string header)
    {
        if (string.IsNullOrWhiteSpace(header))
            return string.Empty;

        return string.Join(" ", header.Trim().ToLowerInvariant().Split(' ',
            StringSplitOptions.RemoveEmptyEntries));
    }
}
