using GurkanApi.Entities;

namespace GurkanApi.DTOs.Dashboard;

public class DashboardResponse
{
    public int TotalPropertyCount { get; set; }
    public int ActiveTenantCount { get; set; }
    public decimal OccupancyRate { get; set; }
    public int Year { get; set; }
    public List<CurrencySummary> Summary { get; set; } = [];
    public List<PropertyFinancials> Properties { get; set; } = [];
}

public class CurrencySummary
{
    public Currency Currency { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalProfit { get; set; }
    public int UnpaidRentCount { get; set; }
    public int UpcomingBillCount { get; set; }
}

public class PropertyFinancials
{
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public PropertyType PropertyType { get; set; }
    public Currency Currency { get; set; }
    public List<CurrencyAmount> Income { get; set; } = [];
    public List<CurrencyAmount> Expenses { get; set; } = [];
    public List<CurrencyAmount> Profit { get; set; } = [];
    public int UnpaidRentCount { get; set; }
    public int UpcomingBillCount { get; set; }
}

public class CurrencyAmount
{
    public Currency Currency { get; set; }
    public decimal Amount { get; set; }
}
