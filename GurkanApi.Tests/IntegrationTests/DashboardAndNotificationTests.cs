using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.Dashboard;
using GurkanApi.DTOs.Groups;
using GurkanApi.DTOs.Notifications;
using GurkanApi.DTOs.Properties;
using GurkanApi.DTOs.Tenants;
using GurkanApi.DTOs.Users;
using GurkanApi.Entities;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S06")]
public class DashboardAndNotificationTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;

    private HttpClient _adminClient = null!;
    private HttpClient _user2Client = null!;

    private Guid _groupAId;
    private Guid _groupBId;
    private Guid _propertyAId;

    // Known amounts for assertion
    private const decimal MonthlyRent = 15_000m;
    private const decimal ShortTermNetAmount = 8_500m;
    private const decimal ExpenseAmount = 3_000m;
    private const decimal BillAmount = 1_200m;

    private readonly string _user1Email = "dashuser1@test.com";
    private readonly string _user2Email = "dashuser2@test.com";
    private readonly string _password = "Test1234!";

    public DashboardAndNotificationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();

        _adminClient = _factory.CreateClient();
        await _adminClient.LoginAsAsync("admin@gurkan.com", "Admin123!");

        // --- Register two users ---
        var reg1 = await _adminClient.RegisterUserAsync(_user1Email, _password, "Dash User One");
        reg1.EnsureSuccessStatusCode();
        var reg2 = await _adminClient.RegisterUserAsync(_user2Email, _password, "Dash User Two");
        reg2.EnsureSuccessStatusCode();

        // Get user IDs
        var usersResponse = await _adminClient.GetAsync("/api/users");
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.Content.ReadAsApiJsonAsync<List<UserResponse>>();
        var user1Id = users!.First(u => u.Email == _user1Email).Id;
        var user2Id = users!.First(u => u.Email == _user2Email).Id;

        // --- Create two groups ---
        var groupAResponse = await _adminClient.PostAsJsonAsync("/api/groups",
            new { name = "Dashboard Group A", description = "Group with data" });
        groupAResponse.EnsureSuccessStatusCode();
        var groupA = await groupAResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupAId = groupA!.Id;

        var groupBResponse = await _adminClient.PostAsJsonAsync("/api/groups",
            new { name = "Dashboard Group B", description = "Empty group" });
        groupBResponse.EnsureSuccessStatusCode();
        var groupB = await groupBResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupBId = groupB!.Id;

        // Add user1 to groupA, user2 to groupB
        (await _adminClient.PostAsJsonAsync($"/api/groups/{_groupAId}/members",
            new { userId = user1Id, role = "Member" })).EnsureSuccessStatusCode();
        (await _adminClient.PostAsJsonAsync($"/api/groups/{_groupBId}/members",
            new { userId = user2Id, role = "Member" })).EnsureSuccessStatusCode();

        // --- Create a property in groupA (TRY) ---
        var propResponse = await _adminClient.PostAsJsonAsync("/api/properties", new
        {
            name = "Dashboard Test Apartment",
            type = "Apartment",
            address = "Test Bulvarı 42",
            city = "Istanbul",
            district = "Kadıköy",
            area = 120m,
            roomCount = 3,
            floor = 4,
            totalFloors = 8,
            buildYear = 2019,
            currency = "TRY",
            description = "Property for dashboard tests",
            groupId = _groupAId,
        });
        propResponse.EnsureSuccessStatusCode();
        var prop = await propResponse.Content.ReadAsApiJsonAsync<PropertyResponse>();
        _propertyAId = prop!.Id;

        // --- Create tenant with LeaseStart 3 months ago, LeaseEnd 25 days from now ---
        // This gives us:
        //   - Auto-generated rent payments: several with DueDates well in the past → LateRent
        //   - LeaseEnd within 30 days → LeaseExpiry Critical notification
        var now = DateTime.UtcNow;
        var tenantResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/tenants", new
            {
                fullName = "Test Kiracı",
                phone = "5551234567",
                email = "tenant@test.com",
                leaseStart = now.AddMonths(-3).ToString("o"),
                leaseEnd = now.AddDays(25).ToString("o"),
                monthlyRent = MonthlyRent,
                deposit = 30_000m,
                currency = "TRY",
            });
        tenantResponse.EnsureSuccessStatusCode();

        // --- Create a short-term rental (income, current year) ---
        var strResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/short-term-rentals", new
            {
                guestName = "Test Misafir",
                checkIn = now.AddDays(-10).ToString("o"),
                checkOut = now.AddDays(-5).ToString("o"),
                nightlyRate = 1_700m,
                totalAmount = 8_500m,
                platformFee = 0m,
                netAmount = ShortTermNetAmount,
                platform = "Airbnb",
                currency = "TRY",
                notes = "Dashboard test STR",
            });
        strResponse.EnsureSuccessStatusCode();

        // --- Create an expense (current year) ---
        var expResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/expenses", new
            {
                category = "Maintenance",
                description = "Dashboard test maintenance",
                amount = ExpenseAmount,
                currency = "TRY",
                date = now.AddDays(-7).ToString("o"),
                isRecurring = false,
            });
        expResponse.EnsureSuccessStatusCode();

        // --- Create a bill with DueDate 3 days from now (Pending → UpcomingBill) ---
        var billResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/bills", new
            {
                type = "Electric",
                amount = BillAmount,
                currency = "TRY",
                dueDate = now.AddDays(3).ToString("o"),
                notes = "Dashboard test bill",
            });
        billResponse.EnsureSuccessStatusCode();

        // --- Login user2 for cross-group tests ---
        _user2Client = _factory.CreateClient();
        await _user2Client.LoginAsAsync(_user2Email, _password);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // =====================================================================
    //  Dashboard Tests
    // =====================================================================

    [Fact]
    public async Task Dashboard_ReturnsCorrectAggregation()
    {
        var response = await _adminClient.GetAsync("/api/dashboard");
        response.EnsureSuccessStatusCode();

        var dashboard = await response.Content.ReadAsApiJsonAsync<DashboardResponse>();
        Assert.NotNull(dashboard);

        // Property should be present
        Assert.Contains(dashboard.Properties, p => p.PropertyId == _propertyAId);

        var propFinancials = dashboard.Properties.First(p => p.PropertyId == _propertyAId);
        Assert.Equal("Dashboard Test Apartment", propFinancials.PropertyName);

        // Income should include short-term rental net amount (TRY)
        var tryIncome = propFinancials.Income.FirstOrDefault(i => i.Currency == Currency.TRY);
        Assert.NotNull(tryIncome);
        // Income includes paid rent + STR net. Since all rent payments are Pending (auto-generated),
        // income comes from short-term rental only
        Assert.True(tryIncome.Amount >= ShortTermNetAmount,
            $"Expected TRY income >= {ShortTermNetAmount}, got {tryIncome.Amount}");

        // Expenses should include the expense amount (bill is Pending, so not counted in expenses)
        var tryExpense = propFinancials.Expenses.FirstOrDefault(e => e.Currency == Currency.TRY);
        Assert.NotNull(tryExpense);
        Assert.True(tryExpense.Amount >= ExpenseAmount,
            $"Expected TRY expenses >= {ExpenseAmount}, got {tryExpense.Amount}");

        // Profit = Income - Expenses per currency
        var tryProfit = propFinancials.Profit.FirstOrDefault(p => p.Currency == Currency.TRY);
        Assert.NotNull(tryProfit);
        Assert.Equal(tryIncome.Amount - tryExpense.Amount, tryProfit.Amount);

        // Unpaid rent count > 0 (auto-generated payments with DueDate+5 < now)
        Assert.True(propFinancials.UnpaidRentCount > 0,
            "Expected at least one unpaid (late) rent payment");

        // Summary should have TRY entry
        var trySummary = dashboard.Summary.FirstOrDefault(s => s.Currency == Currency.TRY);
        Assert.NotNull(trySummary);
        Assert.Equal(tryIncome.Amount, trySummary.TotalIncome);
    }

    [Fact]
    public async Task Dashboard_CrossGroupAccess_ReturnsEmpty()
    {
        // User2 is in groupB which has no properties
        var response = await _user2Client.GetAsync("/api/dashboard");
        response.EnsureSuccessStatusCode();

        var dashboard = await response.Content.ReadAsApiJsonAsync<DashboardResponse>();
        Assert.NotNull(dashboard);
        Assert.Empty(dashboard.Properties);
        Assert.Empty(dashboard.Summary);
    }

    // =====================================================================
    //  Notification Tests
    // =====================================================================

    [Fact]
    public async Task Notifications_IncludesLateRent()
    {
        var response = await _adminClient.GetAsync("/api/notifications");
        response.EnsureSuccessStatusCode();

        var notifications = await response.Content.ReadAsApiJsonAsync<List<NotificationItem>>();
        Assert.NotNull(notifications);

        // At least one LateRent notification for our property (tenant was created 3 months ago,
        // so at least 2 rent payments have DueDate+5 < now)
        var lateRent = notifications.Where(n =>
            n.Type == "LateRent" &&
            n.PropertyId == _propertyAId).ToList();

        Assert.NotEmpty(lateRent);
        Assert.All(lateRent, n => Assert.Equal("Critical", n.Severity));
    }

    [Fact]
    public async Task Notifications_IncludesUpcomingBill()
    {
        var response = await _adminClient.GetAsync("/api/notifications");
        response.EnsureSuccessStatusCode();

        var notifications = await response.Content.ReadAsApiJsonAsync<List<NotificationItem>>();
        Assert.NotNull(notifications);

        // Bill with DueDate 3 days from now → UpcomingBill
        var upcomingBill = notifications.FirstOrDefault(n =>
            n.Type == "UpcomingBill" &&
            n.PropertyId == _propertyAId);

        Assert.NotNull(upcomingBill);
    }

    [Fact]
    public async Task Notifications_IncludesLeaseExpiry()
    {
        var response = await _adminClient.GetAsync("/api/notifications");
        response.EnsureSuccessStatusCode();

        var notifications = await response.Content.ReadAsApiJsonAsync<List<NotificationItem>>();
        Assert.NotNull(notifications);

        // Tenant's LeaseEnd is 25 days from now → within 30 days → Critical severity
        var leaseExpiry = notifications.FirstOrDefault(n =>
            n.Type == "LeaseExpiry" &&
            n.PropertyId == _propertyAId);

        Assert.NotNull(leaseExpiry);
        Assert.Equal("Critical", leaseExpiry.Severity);
    }

    // =====================================================================
    //  Report Export Tests
    // =====================================================================

    [Fact]
    public async Task ExcelExport_ReturnsValidFile()
    {
        var response = await _adminClient.GetAsync("/api/reports/export/excel");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            response.Content.Headers.ContentType?.MediaType);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0, "Excel file should not be empty");
    }

    [Fact]
    public async Task PdfExport_ReturnsValidFile()
    {
        var response = await _adminClient.GetAsync("/api/reports/export/pdf");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.Equal("application/pdf",
            response.Content.Headers.ContentType?.MediaType);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0, "PDF file should not be empty");
    }
}
