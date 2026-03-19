using GurkanApi.Data;
using GurkanApi.DTOs.Dashboard;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<DashboardController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// Get aggregated financial dashboard. SuperAdmin sees all properties; members see only their groups'.
    /// Income/expenses are grouped per currency — never summed across currencies.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int? year)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();
        var selectedYear = year ?? DateTime.UtcNow.Year;

        // --- Resolve accessible properties ---
        IQueryable<Property> propertyQuery = _db.Properties.Include(p => p.Group);

        if (role != UserRole.SuperAdmin)
        {
            var groupIds = await _access.GetUserGroupIdsAsync(userId);
            propertyQuery = propertyQuery.Where(p => p.GroupId != null && groupIds.Contains(p.GroupId.Value));
        }

        var properties = await propertyQuery.OrderBy(p => p.Name).ToListAsync();
        var propertyIds = properties.Select(p => p.Id).ToList();
        var now = DateTime.UtcNow;

        // --- Count active tenants (not filtered by year — snapshot metric) ---
        var activeTenantCount = await _db.Tenants
            .CountAsync(t => propertyIds.Contains(t.PropertyId) && t.IsActive);

        var propertiesWithActiveTenant = await _db.Tenants
            .Where(t => propertyIds.Contains(t.PropertyId) && t.IsActive)
            .Select(t => t.PropertyId)
            .Distinct()
            .CountAsync();

        var occupancyRate = properties.Count > 0
            ? Math.Round((decimal)propertiesWithActiveTenant / properties.Count * 100, 1)
            : 0;

        // --- Bulk-load financial data filtered by year ---
        var rentPayments = await _db.RentPayments
            .Include(rp => rp.Tenant)
            .Where(rp => propertyIds.Contains(rp.Tenant.PropertyId)
                      && rp.DueDate.Year == selectedYear)
            .ToListAsync();

        var shortTermRentals = await _db.ShortTermRentals
            .Where(str => propertyIds.Contains(str.PropertyId)
                       && str.CheckIn.Year == selectedYear)
            .ToListAsync();

        var expenses = await _db.Expenses
            .Where(e => propertyIds.Contains(e.PropertyId)
                     && e.Date.Year == selectedYear)
            .ToListAsync();

        var bills = await _db.Bills
            .Where(b => propertyIds.Contains(b.PropertyId)
                     && b.DueDate.Year == selectedYear)
            .ToListAsync();

        // --- Build per-property financials ---
        var propertyFinancials = new List<PropertyFinancials>();

        foreach (var prop in properties)
        {
            var propRentPayments = rentPayments.Where(rp => rp.Tenant.PropertyId == prop.Id).ToList();
            var propShortTermRentals = shortTermRentals.Where(str => str.PropertyId == prop.Id).ToList();
            var propExpenses = expenses.Where(e => e.PropertyId == prop.Id).ToList();
            var propBills = bills.Where(b => b.PropertyId == prop.Id).ToList();

            // Income: Paid rent payments + short-term rental NetAmount, grouped by currency
            var rentIncome = propRentPayments
                .Where(rp => rp.Status == RentPaymentStatus.Paid)
                .GroupBy(rp => rp.Currency)
                .Select(g => new CurrencyAmount { Currency = g.Key, Amount = g.Sum(rp => rp.Amount) });

            var shortTermIncome = propShortTermRentals
                .GroupBy(str => str.Currency)
                .Select(g => new CurrencyAmount { Currency = g.Key, Amount = g.Sum(str => str.NetAmount) });

            var income = MergeCurrencyAmounts(rentIncome, shortTermIncome);

            // Expenses: expense amounts + Paid bill amounts, grouped by currency
            var expenseAmounts = propExpenses
                .GroupBy(e => e.Currency)
                .Select(g => new CurrencyAmount { Currency = g.Key, Amount = g.Sum(e => e.Amount) });

            var paidBillAmounts = propBills
                .Where(b => b.Status == BillPaymentStatus.Paid)
                .GroupBy(b => b.Currency)
                .Select(g => new CurrencyAmount { Currency = g.Key, Amount = g.Sum(b => b.Amount) });

            var expenseTotal = MergeCurrencyAmounts(expenseAmounts, paidBillAmounts);

            // Profit per currency = income - expenses (only for currencies that appear in either)
            var allCurrencies = income.Select(i => i.Currency)
                .Union(expenseTotal.Select(e => e.Currency))
                .Distinct();

            var profit = allCurrencies.Select(c => new CurrencyAmount
            {
                Currency = c,
                Amount = (income.FirstOrDefault(i => i.Currency == c)?.Amount ?? 0)
                       - (expenseTotal.FirstOrDefault(e => e.Currency == c)?.Amount ?? 0)
            }).ToList();

            // Unpaid rent: Pending + DueDate+5 < now (same threshold as S03 RentPaymentsController)
            var unpaidRentCount = propRentPayments
                .Count(rp => rp.Status == RentPaymentStatus.Pending && rp.DueDate.AddDays(5) < now);

            // Upcoming bills: not Paid and due within 7 days
            var upcomingBillCount = propBills
                .Count(b => b.Status != BillPaymentStatus.Paid
                         && b.DueDate >= now
                         && b.DueDate <= now.AddDays(7));

            propertyFinancials.Add(new PropertyFinancials
            {
                PropertyId = prop.Id,
                PropertyName = prop.Name,
                PropertyType = prop.Type,
                Currency = prop.Currency,
                Income = income,
                Expenses = expenseTotal,
                Profit = profit,
                UnpaidRentCount = unpaidRentCount,
                UpcomingBillCount = upcomingBillCount,
            });
        }

        // --- Build portfolio-level summary grouped by currency ---
        var summary = propertyFinancials
            .SelectMany(pf => pf.Profit.Select(p => p.Currency))
            .Union(propertyFinancials.SelectMany(pf => pf.Income.Select(i => i.Currency)))
            .Union(propertyFinancials.SelectMany(pf => pf.Expenses.Select(e => e.Currency)))
            .Distinct()
            .Select(currency => new CurrencySummary
            {
                Currency = currency,
                TotalIncome = propertyFinancials
                    .SelectMany(pf => pf.Income)
                    .Where(i => i.Currency == currency)
                    .Sum(i => i.Amount),
                TotalExpenses = propertyFinancials
                    .SelectMany(pf => pf.Expenses)
                    .Where(e => e.Currency == currency)
                    .Sum(e => e.Amount),
                TotalProfit = propertyFinancials
                    .SelectMany(pf => pf.Profit)
                    .Where(p => p.Currency == currency)
                    .Sum(p => p.Amount),
                UnpaidRentCount = propertyFinancials.Sum(pf => pf.UnpaidRentCount),
                UpcomingBillCount = propertyFinancials.Sum(pf => pf.UpcomingBillCount),
            })
            .OrderBy(s => s.Currency)
            .ToList();

        _logger.LogInformation("Dashboard requested: UserId={UserId}, Year={Year}, PropertyCount={Count}",
            userId, selectedYear, properties.Count);

        return Ok(new DashboardResponse
        {
            TotalPropertyCount = properties.Count,
            ActiveTenantCount = activeTenantCount,
            OccupancyRate = occupancyRate,
            Year = selectedYear,
            Summary = summary,
            Properties = propertyFinancials,
        });
    }

    /// <summary>
    /// Merges two sequences of CurrencyAmount, summing amounts for the same currency.
    /// </summary>
    private static List<CurrencyAmount> MergeCurrencyAmounts(
        IEnumerable<CurrencyAmount> a,
        IEnumerable<CurrencyAmount> b)
    {
        return a.Concat(b)
            .GroupBy(ca => ca.Currency)
            .Select(g => new CurrencyAmount { Currency = g.Key, Amount = g.Sum(ca => ca.Amount) })
            .ToList();
    }
}
