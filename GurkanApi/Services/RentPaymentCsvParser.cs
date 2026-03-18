using System.Text;
using GurkanApi.Data;
using GurkanApi.DTOs.Import;
using GurkanApi.Entities;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Services;

/// <summary>
/// Parses rent payment CSV files with property/tenant name resolution from the database.
/// Performs duplicate detection against existing RentPayment records.
/// </summary>
public class RentPaymentCsvParser
{
    private static readonly Dictionary<string, string> ColumnAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        // Property
        ["propertyname"] = "propertyname",
        ["property name"] = "propertyname",
        ["property"] = "propertyname",
        ["propertyid"] = "propertyid",

        // Tenant
        ["tenantname"] = "tenantname",
        ["tenant name"] = "tenantname",
        ["tenant"] = "tenantname",
        ["tenantid"] = "tenantid",

        // Amount
        ["amount"] = "amount",

        // Currency
        ["currency"] = "currency",

        // Due date
        ["duedate"] = "duedate",
        ["due date"] = "duedate",

        // Paid date
        ["paiddate"] = "paiddate",
        ["paid date"] = "paiddate",

        // Status
        ["status"] = "status",

        // Payment method
        ["paymentmethod"] = "paymentmethod",
        ["payment method"] = "paymentmethod",
    };

    /// <summary>
    /// Parses a rent payment CSV stream. Resolves property/tenant names from the database
    /// using the user's group-accessible properties.
    /// </summary>
    public async Task<List<RentPaymentImportRow>> ParseAsync(
        Stream csvStream,
        ApplicationDbContext db,
        Guid userId,
        UserRole userRole,
        IGroupAccessService access)
    {
        var rows = new List<RentPaymentImportRow>();

        using var reader = new StreamReader(csvStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);

        var headerLine = reader.ReadLine();
        if (string.IsNullOrWhiteSpace(headerLine))
        {
            rows.Add(new RentPaymentImportRow
            {
                RowNumber = 0,
                Status = "Error",
                ErrorMessage = "CSV file is empty or has no header row."
            });
            return rows;
        }

        var headers = CsvParsingHelpers.SplitCsvLine(headerLine);
        var columnMap = BuildColumnMap(headers);

        // Pre-load accessible properties and their tenants for resolution
        var accessibleProperties = await LoadAccessiblePropertiesAsync(db, userId, userRole, access);
        var tenantsByProperty = await LoadTenantsAsync(db, accessibleProperties.Select(p => p.Id).ToList());

        // Pre-load existing rent payments for duplicate detection
        var allTenantIds = tenantsByProperty.Values.SelectMany(t => t).Select(t => t.Id).ToList();
        var existingPayments = await db.RentPayments
            .Where(rp => allTenantIds.Contains(rp.TenantId))
            .Select(rp => new { rp.TenantId, rp.DueDate })
            .ToListAsync();
        var existingPaymentSet = existingPayments
            .Select(ep => $"{ep.TenantId}|{ep.DueDate:yyyy-MM-dd}")
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        int rowNumber = 1;
        string? line;
        while ((line = reader.ReadLine()) != null)
        {
            rowNumber++;

            if (string.IsNullOrWhiteSpace(line))
                continue;

            var fields = CsvParsingHelpers.SplitCsvLine(line);
            var row = await ParseRowAsync(fields, columnMap, rowNumber,
                accessibleProperties, tenantsByProperty, existingPaymentSet);

            rows.Add(row);
        }

        return rows;
    }

    private static Dictionary<string, int> BuildColumnMap(List<string> headers)
    {
        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        for (int i = 0; i < headers.Count; i++)
        {
            var normalized = CsvParsingHelpers.NormalizeHeader(headers[i]);
            if (ColumnAliases.TryGetValue(normalized, out var logicalName))
            {
                map.TryAdd(logicalName, i);
            }
        }

        return map;
    }

    private static Task<RentPaymentImportRow> ParseRowAsync(
        List<string> fields,
        Dictionary<string, int> columnMap,
        int rowNumber,
        List<Property> accessibleProperties,
        Dictionary<Guid, List<Tenant>> tenantsByProperty,
        HashSet<string> existingPaymentSet)
    {
        var row = new RentPaymentImportRow { RowNumber = rowNumber };
        var errors = new List<string>();
        var warnings = new List<string>();

        // Resolve property
        Property? resolvedProperty = null;
        var propertyIdStr = GetField(fields, columnMap, "propertyid");
        var propertyNameStr = GetField(fields, columnMap, "propertyname");

        if (!string.IsNullOrEmpty(propertyIdStr) && Guid.TryParse(propertyIdStr, out var propId))
        {
            resolvedProperty = accessibleProperties.FirstOrDefault(p => p.Id == propId);
            if (resolvedProperty == null)
                errors.Add($"PropertyId: property '{propertyIdStr}' not found or not accessible");
        }
        else if (!string.IsNullOrEmpty(propertyNameStr))
        {
            var matches = accessibleProperties
                .Where(p => p.Name.Equals(propertyNameStr, StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (matches.Count == 1)
            {
                resolvedProperty = matches[0];
            }
            else if (matches.Count > 1)
            {
                errors.Add($"PropertyName: ambiguous — '{propertyNameStr}' matches {matches.Count} properties");
            }
            else
            {
                errors.Add($"PropertyName: '{propertyNameStr}' not found in accessible properties");
            }
        }
        else
        {
            errors.Add("Property: either PropertyName or PropertyId is required");
        }

        if (resolvedProperty != null)
        {
            row.PropertyId = resolvedProperty.Id;
            row.PropertyName = resolvedProperty.Name;
        }

        // Resolve tenant
        Tenant? resolvedTenant = null;
        var tenantIdStr = GetField(fields, columnMap, "tenantid");
        var tenantNameStr = GetField(fields, columnMap, "tenantname");

        if (!string.IsNullOrEmpty(tenantIdStr) && Guid.TryParse(tenantIdStr, out var tenId))
        {
            if (resolvedProperty != null &&
                tenantsByProperty.TryGetValue(resolvedProperty.Id, out var propTenants))
            {
                resolvedTenant = propTenants.FirstOrDefault(t => t.Id == tenId);
            }

            if (resolvedTenant == null)
                errors.Add($"TenantId: tenant '{tenantIdStr}' not found for property");
        }
        else if (!string.IsNullOrEmpty(tenantNameStr) && resolvedProperty != null)
        {
            if (tenantsByProperty.TryGetValue(resolvedProperty.Id, out var propTenants))
            {
                var matches = propTenants
                    .Where(t => t.FullName.Equals(tenantNameStr, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                if (matches.Count == 1)
                {
                    resolvedTenant = matches[0];
                }
                else if (matches.Count > 1)
                {
                    errors.Add($"TenantName: ambiguous — '{tenantNameStr}' matches {matches.Count} tenants");
                }
                else
                {
                    errors.Add($"TenantName: '{tenantNameStr}' not found for property '{resolvedProperty.Name}'");
                }
            }
        }
        else if (string.IsNullOrEmpty(tenantIdStr) && string.IsNullOrEmpty(tenantNameStr))
        {
            errors.Add("Tenant: either TenantName or TenantId is required");
        }

        if (resolvedTenant != null)
        {
            row.TenantId = resolvedTenant.Id;
            row.TenantName = resolvedTenant.FullName;
        }

        // Amount (required)
        var amountStr = GetField(fields, columnMap, "amount");
        if (CsvParsingHelpers.TryParseDecimal(amountStr, out var amount))
        {
            row.Amount = amount;
        }
        else
        {
            errors.Add("Amount: required field is missing or invalid");
        }

        // Currency (optional)
        var currencyStr = GetField(fields, columnMap, "currency");
        if (!string.IsNullOrEmpty(currencyStr))
        {
            if (Enum.TryParse<Currency>(currencyStr, ignoreCase: true, out _))
            {
                row.Currency = currencyStr.ToUpperInvariant();
            }
            else
            {
                warnings.Add($"Currency: '{currencyStr}' not recognized, will use default");
            }
        }

        // Due date (required)
        var dueDateStr = GetField(fields, columnMap, "duedate");
        if (CsvParsingHelpers.TryParseDate(dueDateStr, out var dueDate))
        {
            row.DueDate = dueDate;
        }
        else
        {
            errors.Add("DueDate: required field is missing or invalid");
        }

        // Paid date (optional)
        var paidDateStr = GetField(fields, columnMap, "paiddate");
        if (!string.IsNullOrEmpty(paidDateStr))
        {
            if (CsvParsingHelpers.TryParseDate(paidDateStr, out var paidDate))
            {
                row.PaidDate = paidDate;
            }
            else
            {
                warnings.Add($"PaidDate: unable to parse '{paidDateStr}'");
            }
        }

        // Status (optional)
        var statusStr = GetField(fields, columnMap, "status");
        if (!string.IsNullOrEmpty(statusStr))
        {
            if (Enum.TryParse<RentPaymentStatus>(statusStr, ignoreCase: true, out var parsedStatus))
            {
                row.PaymentStatus = parsedStatus.ToString();
            }
            else
            {
                warnings.Add($"Status: '{statusStr}' not recognized, will default to Pending");
            }
        }

        // Payment method (optional)
        var methodStr = GetField(fields, columnMap, "paymentmethod");
        if (!string.IsNullOrEmpty(methodStr))
        {
            if (Enum.TryParse<PaymentMethod>(methodStr, ignoreCase: true, out var parsedMethod))
            {
                row.PaymentMethod = parsedMethod.ToString();
            }
            else
            {
                warnings.Add($"PaymentMethod: '{methodStr}' not recognized");
            }
        }

        // Duplicate detection
        if (resolvedTenant != null && row.DueDate.HasValue)
        {
            var key = $"{resolvedTenant.Id}|{row.DueDate.Value:yyyy-MM-dd}";
            if (existingPaymentSet.Contains(key))
            {
                warnings.Add($"Duplicate: payment for tenant '{resolvedTenant.FullName}' on {row.DueDate.Value:yyyy-MM-dd} already exists");
            }
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

        return Task.FromResult(row);
    }

    private static async Task<List<Property>> LoadAccessiblePropertiesAsync(
        ApplicationDbContext db, Guid userId, UserRole userRole, IGroupAccessService access)
    {
        if (userRole == UserRole.SuperAdmin)
        {
            return await db.Properties.AsNoTracking().ToListAsync();
        }

        // Get user's group IDs, then find properties belonging to those groups
        var groupIds = await access.GetUserGroupIdsAsync(userId);
        return await db.Properties
            .AsNoTracking()
            .Where(p => p.GroupId.HasValue && groupIds.Contains(p.GroupId.Value))
            .ToListAsync();
    }

    private static async Task<Dictionary<Guid, List<Tenant>>> LoadTenantsAsync(
        ApplicationDbContext db, List<Guid> propertyIds)
    {
        var tenants = await db.Tenants
            .AsNoTracking()
            .Where(t => propertyIds.Contains(t.PropertyId))
            .ToListAsync();

        return tenants.GroupBy(t => t.PropertyId)
            .ToDictionary(g => g.Key, g => g.ToList());
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
