using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.Groups;
using GurkanApi.DTOs.Reports;
using GurkanApi.DTOs.Users;
using GurkanApi.Entities;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S06")]
public class ReportsTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private HttpClient _adminClient = null!;

    public ReportsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();
        _adminClient = _factory.CreateClient();
        await _adminClient.LoginAsAsync("admin@gurkan.com", "Admin123!");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // ---------- Helpers ----------

    private async Task<Guid> CreateGroupAsync(string name)
    {
        var res = await _adminClient.PostAsJsonAsync("/api/groups", new { name });
        res.EnsureSuccessStatusCode();
        var group = await res.Content.ReadAsApiJsonAsync<GroupResponse>();
        return group!.Id;
    }

    private async Task<Guid> CreatePropertyAsync(Guid groupId, string name, string city = "İstanbul")
    {
        var res = await _adminClient.PostAsJsonAsync("/api/properties", new
        {
            name,
            type = "Apartment",
            address = "Test Sok. No:1",
            city,
            district = "Kadıköy",
            currency = "TRY",
            groupId
        });
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<dynamic>(HttpClientExtensions.ApiJsonOptions);
        // Parse id from response
        var jsonElement = (System.Text.Json.JsonElement)body!;
        return jsonElement.GetProperty("id").GetGuid();
    }

    // ---------- Tests ----------

    [Fact]
    public async Task ProfitLoss_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/reports/profit-loss");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProfitLoss_Authenticated_ReturnsJsonReport()
    {
        var response = await _adminClient.GetAsync("/api/reports/profit-loss");
        response.EnsureSuccessStatusCode();

        var report = await response.Content.ReadAsApiJsonAsync<ProfitLossReport>();
        Assert.NotNull(report);
        Assert.Equal(DateTime.UtcNow.Year.ToString(), report.Period);
        Assert.NotNull(report.Properties);
        Assert.NotNull(report.Summary);
    }

    [Fact]
    public async Task ProfitLoss_WithYear_FiltersCorrectly()
    {
        var response = await _adminClient.GetAsync("/api/reports/profit-loss?year=2025");
        response.EnsureSuccessStatusCode();

        var report = await response.Content.ReadAsApiJsonAsync<ProfitLossReport>();
        Assert.NotNull(report);
        Assert.Equal("2025", report.Period);
    }

    [Fact]
    public async Task ExportExcel_Authenticated_ReturnsXlsxFile()
    {
        var response = await _adminClient.GetAsync("/api/reports/export/excel");
        response.EnsureSuccessStatusCode();

        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            response.Content.Headers.ContentType?.MediaType);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0, "Excel file should not be empty");

        // Verify content-disposition contains the expected filename
        var disposition = response.Content.Headers.ContentDisposition;
        Assert.Contains("portfoy-raporu.xlsx", disposition?.FileName ?? disposition?.FileNameStar ?? "");
    }

    [Fact]
    public async Task ExportExcel_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/reports/export/excel");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ExportPdf_Authenticated_ReturnsPdfFile()
    {
        var response = await _adminClient.GetAsync("/api/reports/export/pdf");
        response.EnsureSuccessStatusCode();

        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0, "PDF file should not be empty");

        // Verify content-disposition contains the expected filename
        var disposition = response.Content.Headers.ContentDisposition;
        Assert.Contains("portfoy-raporu.pdf", disposition?.FileName ?? disposition?.FileNameStar ?? "");
    }

    [Fact]
    public async Task ExportPdf_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/reports/export/pdf");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProfitLoss_WithProperties_ShowsPropertyData()
    {
        // Setup: create a group and property
        var groupId = await CreateGroupAsync("Test Portföy");
        var propertyId = await CreatePropertyAsync(groupId, "Test Daire", "Ankara");

        var response = await _adminClient.GetAsync("/api/reports/profit-loss");
        response.EnsureSuccessStatusCode();

        var report = await response.Content.ReadAsApiJsonAsync<ProfitLossReport>();
        Assert.NotNull(report);
        Assert.Contains(report.Properties, p => p.PropertyName == "Test Daire");

        var prop = report.Properties.First(p => p.PropertyName == "Test Daire");
        Assert.Equal("Ankara", prop.City);
        Assert.Equal(PropertyType.Apartment, prop.PropertyType);
        Assert.Equal(Currency.TRY, prop.Currency);
    }

    [Fact]
    public async Task GroupMember_SeesOnlyOwnGroupProperties()
    {
        // Create two groups, each with a property
        var groupA = await CreateGroupAsync("Grup A");
        var groupB = await CreateGroupAsync("Grup B");
        await CreatePropertyAsync(groupA, "Mülk A");
        await CreatePropertyAsync(groupB, "Mülk B");

        // Register a user and add to groupA only
        var regRes = await _adminClient.RegisterUserAsync("user1@test.com", "User123!", "Test User");
        regRes.EnsureSuccessStatusCode();

        // Get user ID
        var usersRes = await _adminClient.GetAsync("/api/users");
        var users = await usersRes.Content.ReadAsApiJsonAsync<List<UserResponse>>();
        var userId = users!.First(u => u.Email == "user1@test.com").Id;

        // Add to group A
        var addRes = await _adminClient.PostAsJsonAsync($"/api/groups/{groupA}/members", new
        {
            userId,
            role = "Member"
        });
        addRes.EnsureSuccessStatusCode();

        // Login as user1
        var userClient = _factory.CreateClient();
        await userClient.LoginAsAsync("user1@test.com", "User123!");

        var response = await userClient.GetAsync("/api/reports/profit-loss");
        response.EnsureSuccessStatusCode();

        var report = await response.Content.ReadAsApiJsonAsync<ProfitLossReport>();
        Assert.NotNull(report);
        Assert.Single(report.Properties);
        Assert.Equal("Mülk A", report.Properties[0].PropertyName);
    }
}
