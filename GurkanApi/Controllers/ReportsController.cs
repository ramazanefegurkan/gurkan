using ClosedXML.Excel;
using GurkanApi.Data;
using GurkanApi.DTOs.Reports;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<ReportsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// Get profit/loss report as JSON. Defaults to current year.
    /// </summary>
    [HttpGet("profit-loss")]
    public async Task<IActionResult> GetProfitLoss([FromQuery] int? year)
    {
        var reportYear = year ?? DateTime.UtcNow.Year;
        var userId = User.GetUserId();

        var propertyReports = await GetPropertyReportsAsync(reportYear);

        var allCurrencies = propertyReports
            .Select(p => p.Currency)
            .Distinct()
            .OrderBy(c => c);

        var summary = allCurrencies.Select(c =>
        {
            var propsForCurrency = propertyReports.Where(p => p.Currency == c).ToList();
            return new CurrencyReportSummary
            {
                Currency = c,
                TotalIncome = propsForCurrency.Sum(p => p.TotalIncome),
                TotalExpenses = propsForCurrency.Sum(p => p.TotalExpenses),
                TotalProfit = propsForCurrency.Sum(p => p.Profit),
            };
        }).ToList();

        var report = new ProfitLossReport
        {
            GeneratedAt = DateTime.UtcNow,
            Period = reportYear.ToString(),
            Summary = summary,
            Properties = propertyReports,
        };

        _logger.LogInformation("Report exported: Format={Format}, Year={Year}, By={UserId}",
            "JSON", reportYear, userId);

        return Ok(report);
    }

    /// <summary>
    /// Export profit/loss report as Excel (.xlsx).
    /// </summary>
    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportExcel([FromQuery] int? year)
    {
        var reportYear = year ?? DateTime.UtcNow.Year;
        var userId = User.GetUserId();
        var propertyReports = await GetPropertyReportsAsync(reportYear);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Portföy Raporu");

        // Header row
        var headers = new[]
        {
            "Mülk", "Şehir", "Tür", "Para Birimi", "Kira Geliri", "Kısa Dönem Geliri",
            "Toplam Gelir", "Giderler", "Faturalar", "Toplam Gider", "Kâr/Zarar", "ROI (%)"
        };

        for (var i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
            ws.Cell(1, i + 1).Style.Font.Bold = true;
        }

        // Data rows — one per property
        var row = 2;
        foreach (var prop in propertyReports)
        {
            ws.Cell(row, 1).Value = prop.PropertyName;
            ws.Cell(row, 2).Value = prop.City;
            ws.Cell(row, 3).Value = prop.PropertyType.ToString();
            ws.Cell(row, 4).Value = prop.Currency.ToString();
            ws.Cell(row, 5).Value = prop.RentIncome;
            ws.Cell(row, 6).Value = prop.ShortTermIncome;
            ws.Cell(row, 7).Value = prop.TotalIncome;
            ws.Cell(row, 8).Value = prop.ExpenseTotal;
            ws.Cell(row, 9).Value = prop.BillTotal;
            ws.Cell(row, 10).Value = prop.TotalExpenses;
            ws.Cell(row, 11).Value = prop.Profit;
            ws.Cell(row, 12).Value = prop.Roi.HasValue ? (double)Math.Round(prop.Roi.Value, 2) : (double?)null;
            row++;
        }

        // Summary rows — one per currency
        var currencyGroups = propertyReports
            .GroupBy(p => p.Currency)
            .OrderBy(g => g.Key);

        foreach (var group in currencyGroups)
        {
            ws.Cell(row, 1).Value = $"TOPLAM ({group.Key})";
            ws.Cell(row, 1).Style.Font.Bold = true;
            ws.Cell(row, 4).Value = group.Key.ToString();
            ws.Cell(row, 5).Value = group.Sum(p => p.RentIncome);
            ws.Cell(row, 6).Value = group.Sum(p => p.ShortTermIncome);
            ws.Cell(row, 7).Value = group.Sum(p => p.TotalIncome);
            ws.Cell(row, 8).Value = group.Sum(p => p.ExpenseTotal);
            ws.Cell(row, 9).Value = group.Sum(p => p.BillTotal);
            ws.Cell(row, 10).Value = group.Sum(p => p.TotalExpenses);
            ws.Cell(row, 11).Value = group.Sum(p => p.Profit);
            row++;
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        _logger.LogInformation("Report exported: Format={Format}, Year={Year}, By={UserId}",
            "Excel", reportYear, userId);

        return File(
            stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "portfoy-raporu.xlsx");
    }

    /// <summary>
    /// Export profit/loss report as PDF.
    /// </summary>
    [HttpGet("export/pdf")]
    public async Task<IActionResult> ExportPdf([FromQuery] int? year)
    {
        var reportYear = year ?? DateTime.UtcNow.Year;
        var userId = User.GetUserId();
        var propertyReports = await GetPropertyReportsAsync(reportYear);

        // Build currency summary for the PDF header
        var currencySummaries = propertyReports
            .GroupBy(p => p.Currency)
            .OrderBy(g => g.Key)
            .Select(g => new CurrencyReportSummary
            {
                Currency = g.Key,
                TotalIncome = g.Sum(p => p.TotalIncome),
                TotalExpenses = g.Sum(p => p.TotalExpenses),
                TotalProfit = g.Sum(p => p.Profit),
            })
            .ToList();

        var document = QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(9));

                // Header
                page.Header().Column(col =>
                {
                    col.Item().Text("Gayrimenkul Portföy Raporu")
                        .FontSize(16).Bold();
                    col.Item().Text($"Dönem: {reportYear} — Oluşturulma: {DateTime.UtcNow:dd.MM.yyyy HH:mm}")
                        .FontSize(10).Italic();
                    col.Item().PaddingVertical(5).LineHorizontal(1);

                    // Summary section
                    col.Item().PaddingTop(5).Text("Özet").FontSize(12).Bold();
                    foreach (var s in currencySummaries)
                    {
                        col.Item().Text(
                            $"{s.Currency}: Gelir {s.TotalIncome:N2} | Gider {s.TotalExpenses:N2} | Kâr {s.TotalProfit:N2}");
                    }

                    col.Item().PaddingVertical(5).LineHorizontal(1);
                });

                // Content — per-property table
                page.Content().PaddingTop(10).Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.RelativeColumn(2.5f); // Mülk
                        cols.RelativeColumn(1.5f); // Şehir
                        cols.RelativeColumn(1.2f); // Tür
                        cols.RelativeColumn(0.8f); // PB
                        cols.RelativeColumn(1.2f); // Kira
                        cols.RelativeColumn(1.2f); // Kısa Dönem
                        cols.RelativeColumn(1.2f); // Top. Gelir
                        cols.RelativeColumn(1.2f); // Gider
                        cols.RelativeColumn(1.2f); // Fatura
                        cols.RelativeColumn(1.2f); // Top. Gider
                        cols.RelativeColumn(1.2f); // Kâr/Zarar
                        cols.RelativeColumn(1f);   // ROI
                    });

                    // Table header
                    var tableHeaders = new[]
                    {
                        "Mülk", "Şehir", "Tür", "PB", "Kira Geliri", "Kısa Dönem",
                        "Top. Gelir", "Giderler", "Faturalar", "Top. Gider", "Kâr/Zarar", "ROI (%)"
                    };

                    foreach (var h in tableHeaders)
                    {
                        table.Cell().Background(Colors.Grey.Lighten3)
                            .Padding(3)
                            .Text(h).Bold().FontSize(8);
                    }

                    // Data rows
                    foreach (var prop in propertyReports)
                    {
                        table.Cell().Padding(3).Text(prop.PropertyName);
                        table.Cell().Padding(3).Text(prop.City);
                        table.Cell().Padding(3).Text(prop.PropertyType.ToString());
                        table.Cell().Padding(3).Text(prop.Currency.ToString());
                        table.Cell().Padding(3).Text($"{prop.RentIncome:N2}");
                        table.Cell().Padding(3).Text($"{prop.ShortTermIncome:N2}");
                        table.Cell().Padding(3).Text($"{prop.TotalIncome:N2}");
                        table.Cell().Padding(3).Text($"{prop.ExpenseTotal:N2}");
                        table.Cell().Padding(3).Text($"{prop.BillTotal:N2}");
                        table.Cell().Padding(3).Text($"{prop.TotalExpenses:N2}");
                        table.Cell().Padding(3).Text($"{prop.Profit:N2}");
                        table.Cell().Padding(3).Text(prop.Roi.HasValue ? $"{prop.Roi:N1}%" : "—");
                    }
                });

                // Footer — page numbers
                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("Sayfa ");
                    t.CurrentPageNumber();
                    t.Span(" / ");
                    t.TotalPages();
                });
            });
        });

        var pdfBytes = document.GeneratePdf();

        _logger.LogInformation("Report exported: Format={Format}, Year={Year}, By={UserId}",
            "PDF", reportYear, userId);

        return File(pdfBytes, "application/pdf", "portfoy-raporu.pdf");
    }

    /// <summary>
    /// Shared aggregation logic: resolves accessible properties and calculates
    /// per-property income/expense/profit/ROI for the given year.
    /// Uses property's default Currency field for the report (ROI is per-property).
    /// </summary>
    private async Task<List<PropertyReport>> GetPropertyReportsAsync(int year)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        // Resolve accessible properties
        IQueryable<Property> propertyQuery = _db.Properties.Include(p => p.Group);

        if (role != UserRole.SuperAdmin)
        {
            var groupIds = await _access.GetUserGroupIdsAsync(userId);
            propertyQuery = propertyQuery.Where(p => p.GroupId != null && groupIds.Contains(p.GroupId.Value));
        }

        var properties = await propertyQuery.OrderBy(p => p.Name).ToListAsync();
        var propertyIds = properties.Select(p => p.Id).ToList();

        var yearStart = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var yearEnd = new DateTime(year + 1, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        // Bulk-load financial data for the year
        var rentPayments = await _db.RentPayments
            .Include(rp => rp.Tenant)
            .Where(rp => propertyIds.Contains(rp.Tenant.PropertyId)
                      && rp.Status == RentPaymentStatus.Paid
                      && rp.DueDate >= yearStart && rp.DueDate < yearEnd)
            .ToListAsync();

        var shortTermRentals = await _db.ShortTermRentals
            .Where(str => propertyIds.Contains(str.PropertyId)
                       && str.CheckIn >= yearStart && str.CheckIn < yearEnd)
            .ToListAsync();

        var expenses = await _db.Expenses
            .Where(e => propertyIds.Contains(e.PropertyId)
                     && e.Date >= yearStart && e.Date < yearEnd)
            .ToListAsync();

        var bills = await _db.Bills
            .Where(b => propertyIds.Contains(b.PropertyId)
                     && b.Status == BillPaymentStatus.Paid
                     && b.DueDate >= yearStart && b.DueDate < yearEnd)
            .ToListAsync();

        // Build per-property report
        var result = new List<PropertyReport>();

        foreach (var prop in properties)
        {
            var rentIncome = rentPayments
                .Where(rp => rp.Tenant.PropertyId == prop.Id)
                .Sum(rp => rp.Amount);

            var shortTermIncome = shortTermRentals
                .Where(str => str.PropertyId == prop.Id)
                .Sum(str => str.NetAmount);

            var totalIncome = rentIncome + shortTermIncome;

            var expenseTotal = expenses
                .Where(e => e.PropertyId == prop.Id)
                .Sum(e => e.Amount);

            var billTotal = bills
                .Where(b => b.PropertyId == prop.Id)
                .Sum(b => b.Amount);

            var totalExpenses = expenseTotal + billTotal;
            var profit = totalIncome - totalExpenses;
            decimal? roi = totalExpenses > 0
                ? Math.Round(profit / totalExpenses * 100, 2)
                : null;

            result.Add(new PropertyReport
            {
                PropertyId = prop.Id,
                PropertyName = prop.Name,
                PropertyType = prop.Type,
                City = prop.City,
                Currency = prop.Currency,
                RentIncome = rentIncome,
                ShortTermIncome = shortTermIncome,
                TotalIncome = totalIncome,
                ExpenseTotal = expenseTotal,
                BillTotal = billTotal,
                TotalExpenses = totalExpenses,
                Profit = profit,
                Roi = roi,
            });
        }

        return result;
    }
}
