using GurkanApi.Entities;

namespace GurkanApi.DTOs.Reports;

public class ProfitLossReport
{
    public DateTime GeneratedAt { get; set; }
    public string Period { get; set; } = string.Empty;
    public List<CurrencyReportSummary> Summary { get; set; } = [];
    public List<PropertyReport> Properties { get; set; } = [];
}

public class CurrencyReportSummary
{
    public Currency Currency { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalProfit { get; set; }
}

public class PropertyReport
{
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public PropertyType PropertyType { get; set; }
    public string City { get; set; } = string.Empty;
    public Currency Currency { get; set; }
    public decimal RentIncome { get; set; }
    public decimal ShortTermIncome { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal ExpenseTotal { get; set; }
    public decimal BillTotal { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal Profit { get; set; }
    /// <summary>
    /// ROI = Profit / TotalExpenses * 100 if TotalExpenses > 0, else null.
    /// </summary>
    public decimal? Roi { get; set; }
}
