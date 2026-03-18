---
estimated_steps: 7
estimated_files: 4
---

# T02: Build Reports API with Excel and PDF export

**Slice:** S06 — Dashboard, Bildirimler & Raporlama
**Milestone:** M001

## Description

Add ClosedXML and QuestPDF NuGet packages, create the ReportsController with profit/loss JSON endpoint and Excel/PDF export endpoints. The report data reuses the same aggregation pattern from T01's DashboardController — querying properties, rent payments, short-term rentals, expenses, and bills with group-based access control and multi-currency grouping. Excel produces a workbook with per-property income/expense/profit rows. PDF produces a formatted report with summary and per-property breakdown including ROI.

**Relevant skills:** None required (standard ASP.NET Core + NuGet library patterns).

## Steps

1. **Add NuGet packages:**
   ```bash
   cd GurkanApi
   dotnet add package ClosedXML
   dotnet add package QuestPDF
   ```
   Verify packages are in `GurkanApi.csproj`.

2. **Set QuestPDF Community license** in `GurkanApi/Program.cs`:
   - Add `QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;` near the top of Program.cs, before `builder.Build()`. This is required — QuestPDF throws an exception without it.

3. **Create Report DTOs** in `GurkanApi/DTOs/Reports/ReportResponse.cs`:
   - `ProfitLossReport` — `GeneratedAt` (DateTime), `Period` (string, e.g. "2026"), `List<CurrencyReportSummary> Summary`, `List<PropertyReport> Properties`
   - `CurrencyReportSummary` — `Currency`, `TotalIncome`, `TotalExpenses`, `TotalProfit`
   - `PropertyReport` — `PropertyId`, `PropertyName`, `PropertyType`, `City`, `Currency`, `RentIncome`, `ShortTermIncome`, `TotalIncome`, `ExpenseTotal`, `BillTotal`, `TotalExpenses`, `Profit`, `Roi` (nullable decimal — calculated as Profit/TotalExpenses * 100 if expenses > 0, else null)

4. **Create ReportsController** in `GurkanApi/Controllers/ReportsController.cs`:
   - Route: `api/reports`, `[Authorize]`
   - Inject `ApplicationDbContext`, `IGroupAccessService`, `ILogger`
   - **Private helper method** `GetPropertyReportsAsync()` — shared aggregation logic (same as DashboardController but structured for report output):
     - Get accessible properties (SuperAdmin → all, others → group-filtered)
     - For each property: aggregate rent payments (Paid only, join through Tenant), short-term rental NetAmount, expenses, bills (Paid only) — all per-property, per default Currency (use property's Currency field for the report since ROI is per-property)
     - Calculate ROI = (TotalIncome - TotalExpenses) / TotalExpenses * 100 if TotalExpenses > 0
   - **GET /api/reports/profit-loss** — optional query params: `year` (int, default current year). Returns `ProfitLossReport` JSON. Filter rent payments, expenses, bills by date within the specified year. Short-term rentals filtered by CheckIn date.
   - **GET /api/reports/export/excel** — returns FileContentResult with content-type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`:
     - Create workbook with ClosedXML (`new XLWorkbook()`)
     - Add worksheet "Portföy Raporu"
     - Header row: "Mülk", "Şehir", "Tür", "Para Birimi", "Kira Geliri", "Kısa Dönem Geliri", "Toplam Gelir", "Giderler", "Faturalar", "Toplam Gider", "Kâr/Zarar", "ROI (%)"
     - One row per property with financial data
     - Summary row at bottom with totals (per currency — if mixed currencies, add one summary row per currency)
     - Format header bold, auto-fit columns
     - Save to MemoryStream, return `File(stream.ToArray(), contentType, "portfoy-raporu.xlsx")`
   - **GET /api/reports/export/pdf** — returns FileContentResult with content-type `application/pdf`:
     - Use QuestPDF fluent API: `Document.Create(container => { ... })`
     - Page header: "Gayrimenkul Portföy Raporu" + generation date
     - Summary section: total income/expense/profit per currency
     - Per-property table: same columns as Excel
     - Footer: page numbers
     - Generate to byte array via `document.GeneratePdf()`, return `File(bytes, "application/pdf", "portfoy-raporu.pdf")`
   - Log: `"Report exported: Format={Format}, Year={Year}, By={UserId}"`

5. **Verify build:** Run `dotnet build GurkanApi/` — must compile with zero errors. Watch for QuestPDF .NET 10 compatibility — if it fails, see fallback in step 7.

6. **Verify endpoints in Swagger:** Start API, confirm all three report endpoints appear. Test Excel and PDF download via Swagger.

7. **QuestPDF fallback:** If QuestPDF fails to load on .NET 10, implement PDF export as a simple text/HTML file download instead. The Excel export alone satisfies the core reporting need. Log the compatibility issue for future resolution.

## Must-Haves

- [ ] ClosedXML and QuestPDF NuGet packages added to GurkanApi.csproj
- [ ] QuestPDF.Settings.License set to Community in Program.cs
- [ ] ReportsController with GET /api/reports/profit-loss (JSON), GET /api/reports/export/excel (file), GET /api/reports/export/pdf (file)
- [ ] Excel export contains per-property rows with income/expense/profit/ROI columns
- [ ] PDF export contains formatted report with summary and per-property breakdown
- [ ] ROI calculated per property
- [ ] Group-based access control on all report endpoints
- [ ] Year-based filtering on profit/loss data

## Verification

- `dotnet build GurkanApi/` compiles with zero errors
- Swagger UI shows all three report endpoints
- Download Excel via Swagger → opens in Excel/LibreOffice with correct data
- Download PDF via Swagger → opens in PDF viewer with formatted report

## Observability Impact

- Signals added: Structured log on every report export with format, year, and UserId
- How a future agent inspects this: Swagger UI to test endpoints, downloaded files to verify content
- Failure state exposed: 500 if QuestPDF/ClosedXML fails (with stack trace), structured error response

## Inputs

- `GurkanApi/Controllers/DashboardController.cs` (from T01) — reference for aggregation query pattern and group-based access control
- `GurkanApi/DTOs/Dashboard/DashboardResponse.cs` (from T01) — reference for DTO structure pattern
- `GurkanApi/Entities/Tenant.cs` — PropertyId, Currency
- `GurkanApi/Entities/RentPayment.cs` — TenantId, Amount, Currency, Status, DueDate
- `GurkanApi/Entities/ShortTermRental.cs` — PropertyId, NetAmount, Currency, CheckIn
- `GurkanApi/Entities/Expense.cs` — PropertyId, Amount, Currency, Date
- `GurkanApi/Entities/Bill.cs` — PropertyId, Amount, Currency, Status, DueDate
- `GurkanApi/Entities/Enums.cs` — RentPaymentStatus.Paid, BillPaymentStatus.Paid
- `GurkanApi/Services/IGroupAccessService.cs` — GetUserGroupIdsAsync()
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs` — GetUserId(), GetRole()
- `GurkanApi/Program.cs` — add QuestPDF license before builder.Build()

## Expected Output

- `GurkanApi/GurkanApi.csproj` — modified with ClosedXML and QuestPDF package references
- `GurkanApi/Program.cs` — modified with QuestPDF license setting
- `GurkanApi/DTOs/Reports/ReportResponse.cs` — ProfitLossReport, CurrencyReportSummary, PropertyReport DTOs
- `GurkanApi/Controllers/ReportsController.cs` — 3 endpoints: profit-loss JSON, Excel export, PDF export
