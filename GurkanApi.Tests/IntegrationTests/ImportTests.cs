using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.Groups;
using GurkanApi.DTOs.Import;
using GurkanApi.DTOs.Properties;
using GurkanApi.DTOs.RentPayments;
using GurkanApi.DTOs.ShortTermRentals;
using GurkanApi.DTOs.Tenants;
using GurkanApi.DTOs.Users;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S03")]
public class ImportTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;

    private HttpClient _adminClient = null!;
    private Guid _groupId;
    private Guid _propertyId;
    private Guid _tenantId;
    private string _propertyName = "Test Property";
    private string _tenantName = "Test Tenant";
    private string _user1Email = "importuser1@test.com";
    private string _user2Email = "importuser2@test.com";
    private string _password = "Test1234!";

    public ImportTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();

        _adminClient = _factory.CreateClient();
        await _adminClient.LoginAsAsync("admin@gurkan.com", "Admin123!");

        // Register two users (one in group, one outside)
        var reg1 = await _adminClient.RegisterUserAsync(_user1Email, _password, "Import User One");
        reg1.EnsureSuccessStatusCode();
        var reg2 = await _adminClient.RegisterUserAsync(_user2Email, _password, "Import User Two");
        reg2.EnsureSuccessStatusCode();

        // Get user IDs
        var usersResponse = await _adminClient.GetAsync("/api/users");
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.Content.ReadAsApiJsonAsync<List<UserResponse>>();
        var user1Id = users!.First(u => u.Email == _user1Email).Id;

        // Create a group and add user1 only
        var groupResponse = await _adminClient.PostAsJsonAsync("/api/groups",
            new { name = "Import Test Group", description = "Group for import tests" });
        groupResponse.EnsureSuccessStatusCode();
        var group = await groupResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupId = group!.Id;

        var addMember = await _adminClient.PostAsJsonAsync($"/api/groups/{_groupId}/members",
            new { userId = user1Id, role = "Member" });
        addMember.EnsureSuccessStatusCode();

        // Create a property in the group
        var propResponse = await _adminClient.PostAsJsonAsync("/api/properties", new
        {
            name = _propertyName,
            type = "Apartment",
            address = "Import Test St 1",
            city = "Istanbul",
            district = "Kadıköy",
            area = 100m,
            roomCount = 3,
            floor = 2,
            totalFloors = 5,
            buildYear = 2020,
            currency = "TRY",
            description = "Test property for import tests",
            groupId = _groupId,
        });
        propResponse.EnsureSuccessStatusCode();
        var prop = await propResponse.Content.ReadAsApiJsonAsync<PropertyResponse>();
        _propertyId = prop!.Id;

        // Create a tenant on the property (needed for rent payment import)
        var tenantResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyId}/tenants", new
            {
                fullName = _tenantName,
                phone = "5551234567",
                email = "tenant@test.com",
                leaseStart = "2024-01-01T00:00:00Z",
                leaseEnd = "2025-12-31T00:00:00Z",
                monthlyRent = 5000m,
                deposit = 10000m,
                currency = "TRY",
            });
        tenantResponse.EnsureSuccessStatusCode();
        var tenant = await tenantResponse.Content.ReadAsApiJsonAsync<TenantResponse>();
        _tenantId = tenant!.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // ---------- Helpers ----------

    private static MultipartFormDataContent CreateCsvContent(string csvContent, string fileName = "test.csv")
    {
        var multipart = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes(csvContent));
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/csv");
        multipart.Add(fileContent, "file", fileName);
        return multipart;
    }

    private async Task<HttpClient> LoginAsUserAsync(string email)
    {
        var client = _factory.CreateClient();
        await client.LoginAsAsync(email, _password);
        return client;
    }

    // =====================================================================
    //  Airbnb CSV Import
    // =====================================================================

    private const string ValidAirbnbCsv =
        "Start Date,Guest,Nights,Gross Earnings,Host Fee,Amount\n" +
        "2025-06-01,John Doe,3,450.00,67.50,382.50\n" +
        "2025-06-10,Jane Smith,5,750.00,112.50,637.50";

    [Fact]
    public async Task AirbnbImport_DryRun_ReturnsPreviewWithoutDbWrites()
    {
        // Arrange
        var content = CreateCsvContent(ValidAirbnbCsv);

        // Act — dryRun=true (default)
        var response = await _adminClient.PostAsync(
            $"/api/import/airbnb-csv?propertyId={_propertyId}&dryRun=true", content);

        // Assert — response OK with correct preview
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadAsApiJsonAsync<ImportPreviewResponse<AirbnbImportRow>>();
        Assert.NotNull(result);
        Assert.Equal(2, result.Summary.TotalRows);
        Assert.Equal(0, result.Summary.ImportedCount); // dryRun → no imports
        Assert.Equal(0, result.Summary.ErrorCount);
        Assert.Equal(2, result.Rows.Count);
        Assert.All(result.Rows, r => Assert.Equal("Success", r.Status));

        // Verify no DB writes — query short-term rentals list
        var listResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyId}/short-term-rentals");
        listResponse.EnsureSuccessStatusCode();
        var rentals = await listResponse.Content.ReadAsApiJsonAsync<List<ShortTermRentalResponse>>();
        Assert.Empty(rentals!);
    }

    [Fact]
    public async Task AirbnbImport_Commit_CreatesShortTermRentalRecords()
    {
        // Arrange
        var content = CreateCsvContent(ValidAirbnbCsv);

        // Act — dryRun=false
        var response = await _adminClient.PostAsync(
            $"/api/import/airbnb-csv?propertyId={_propertyId}&dryRun=false", content);

        // Assert — response OK with importedCount matching rows
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadAsApiJsonAsync<ImportPreviewResponse<AirbnbImportRow>>();
        Assert.NotNull(result);
        Assert.Equal(2, result.Summary.TotalRows);
        Assert.Equal(2, result.Summary.ImportedCount);
        Assert.Equal(0, result.Summary.ErrorCount);

        // Verify DB state — query short-term rentals list
        var listResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyId}/short-term-rentals");
        listResponse.EnsureSuccessStatusCode();
        var rentals = await listResponse.Content.ReadAsApiJsonAsync<List<ShortTermRentalResponse>>();

        Assert.NotNull(rentals);
        Assert.Equal(2, rentals.Count);

        // Verify first guest (CheckIn descending order)
        var janeRental = rentals.First(r => r.GuestName == "Jane Smith");
        Assert.Equal(5, janeRental.NightCount);
        Assert.Equal(750.00m, janeRental.TotalAmount);

        var johnRental = rentals.First(r => r.GuestName == "John Doe");
        Assert.Equal(3, johnRental.NightCount);
        Assert.Equal(450.00m, johnRental.TotalAmount);
        Assert.Equal(new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc), johnRental.CheckIn);
    }

    [Fact]
    public async Task AirbnbImport_MalformedCsv_ReturnsRowErrors()
    {
        // Arrange — CSV with invalid date and missing required amount
        var malformedCsv =
            "Start Date,Guest,Nights,Gross Earnings,Host Fee,Amount\n" +
            "not-a-date,Guest A,3,450.00,67.50,382.50\n" +
            "2025-06-10,Guest B,5,,,";

        var content = CreateCsvContent(malformedCsv);

        // Act
        var response = await _adminClient.PostAsync(
            $"/api/import/airbnb-csv?propertyId={_propertyId}&dryRun=true", content);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadAsApiJsonAsync<ImportPreviewResponse<AirbnbImportRow>>();
        Assert.NotNull(result);
        Assert.True(result.Summary.ErrorCount > 0, "Expected at least one error row");

        // Check that error rows have meaningful messages
        var errorRows = result.Rows.Where(r => r.Status == "Error").ToList();
        Assert.NotEmpty(errorRows);
        Assert.All(errorRows, r => Assert.False(string.IsNullOrEmpty(r.ErrorMessage),
            $"Row {r.RowNumber} has Error status but no ErrorMessage"));
    }

    [Fact]
    public async Task AirbnbImport_DuplicateDetection_ReturnsWarning()
    {
        // Arrange — first, commit the CSV
        var content1 = CreateCsvContent(ValidAirbnbCsv);
        var commitResponse = await _adminClient.PostAsync(
            $"/api/import/airbnb-csv?propertyId={_propertyId}&dryRun=false", content1);
        commitResponse.EnsureSuccessStatusCode();

        // Act — import same CSV again with dryRun=true
        var content2 = CreateCsvContent(ValidAirbnbCsv);
        var response = await _adminClient.PostAsync(
            $"/api/import/airbnb-csv?propertyId={_propertyId}&dryRun=true", content2);

        // Assert — duplicates flagged as Warning
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadAsApiJsonAsync<ImportPreviewResponse<AirbnbImportRow>>();
        Assert.NotNull(result);
        Assert.True(result.Summary.DuplicateCount > 0, "Expected at least one duplicate detected");

        var warningRows = result.Rows.Where(r => r.Status == "Warning").ToList();
        Assert.NotEmpty(warningRows);
        Assert.All(warningRows, r => Assert.Contains("Duplicate", r.WarningMessage));
    }

    // =====================================================================
    //  Rent Payment CSV Import
    // =====================================================================

    private string GetValidRentPaymentCsv() =>
        "PropertyName,TenantName,Amount,Currency,DueDate,Status\n" +
        $"{_propertyName},{_tenantName},5000,TRY,2026-06-01,Paid\n" +
        $"{_propertyName},{_tenantName},5000,TRY,2026-07-01,Pending";

    [Fact]
    public async Task RentPaymentImport_Commit_CreatesPaymentRecords()
    {
        // Arrange — count pre-existing payments (auto-generated from tenant creation)
        var preListResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyId}/tenants/{_tenantId}/rent-payments");
        preListResponse.EnsureSuccessStatusCode();
        var prePayments = await preListResponse.Content.ReadAsApiJsonAsync<List<RentPaymentResponse>>();
        var preCount = prePayments!.Count;

        var content = CreateCsvContent(GetValidRentPaymentCsv());

        // Act — dryRun=false
        var response = await _adminClient.PostAsync(
            "/api/import/rent-payments?dryRun=false", content);

        // Assert — response indicates 2 rows imported
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadAsApiJsonAsync<ImportPreviewResponse<RentPaymentImportRow>>();
        Assert.NotNull(result);
        Assert.Equal(2, result.Summary.TotalRows);
        Assert.Equal(2, result.Summary.ImportedCount);
        Assert.Equal(0, result.Summary.ErrorCount);

        // Verify DB state — 2 new payments added beyond pre-existing
        var postListResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyId}/tenants/{_tenantId}/rent-payments");
        postListResponse.EnsureSuccessStatusCode();
        var postPayments = await postListResponse.Content.ReadAsApiJsonAsync<List<RentPaymentResponse>>();

        Assert.NotNull(postPayments);
        Assert.Equal(preCount + 2, postPayments.Count);

        // Verify the imported payments have "Imported from CSV" notes
        var importedPayments = postPayments.Where(p => p.Notes == "Imported from CSV").ToList();
        Assert.Equal(2, importedPayments.Count);
        Assert.All(importedPayments, p => Assert.Equal(5000m, p.Amount));
    }

    [Fact]
    public async Task RentPaymentImport_UnknownTenant_ReturnsError()
    {
        // Arrange — CSV with a tenant that doesn't exist
        var csv =
            "PropertyName,TenantName,Amount,Currency,DueDate,Status\n" +
            $"{_propertyName},NonExistent Tenant,5000,TRY,2025-01-01,Paid";

        var content = CreateCsvContent(csv);

        // Act
        var response = await _adminClient.PostAsync(
            "/api/import/rent-payments?dryRun=true", content);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadAsApiJsonAsync<ImportPreviewResponse<RentPaymentImportRow>>();
        Assert.NotNull(result);
        Assert.Equal(1, result.Summary.ErrorCount);

        var errorRow = result.Rows.First(r => r.Status == "Error");
        Assert.Contains("not found", errorRow.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RentPaymentImport_DryRun_NoDbWrites()
    {
        // Arrange — count pre-existing payments (auto-generated from tenant creation)
        var preListResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyId}/tenants/{_tenantId}/rent-payments");
        preListResponse.EnsureSuccessStatusCode();
        var prePayments = await preListResponse.Content.ReadAsApiJsonAsync<List<RentPaymentResponse>>();
        var preCount = prePayments!.Count;

        var content = CreateCsvContent(GetValidRentPaymentCsv());

        // Act — dryRun=true (default)
        var response = await _adminClient.PostAsync(
            "/api/import/rent-payments?dryRun=true", content);

        // Assert — response OK with preview
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadAsApiJsonAsync<ImportPreviewResponse<RentPaymentImportRow>>();
        Assert.NotNull(result);
        Assert.Equal(2, result.Summary.TotalRows);
        Assert.Equal(0, result.Summary.ImportedCount); // dryRun → no imports
        Assert.Equal(0, result.Summary.ErrorCount);

        // Verify no new DB writes — count should be unchanged
        var postListResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyId}/tenants/{_tenantId}/rent-payments");
        postListResponse.EnsureSuccessStatusCode();
        var postPayments = await postListResponse.Content.ReadAsApiJsonAsync<List<RentPaymentResponse>>();
        Assert.Equal(preCount, postPayments!.Count);
    }

    // =====================================================================
    //  Authorization
    // =====================================================================

    [Fact]
    public async Task Import_CrossGroupAccess_Returns403()
    {
        // Arrange — login as user2, who is NOT in the group
        var user2Client = await LoginAsUserAsync(_user2Email);
        var content = CreateCsvContent(ValidAirbnbCsv);

        // Act — attempt Airbnb import on a property user2 can't access
        var response = await user2Client.PostAsync(
            $"/api/import/airbnb-csv?propertyId={_propertyId}&dryRun=true", content);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // =====================================================================
    //  Additional Edge Cases
    // =====================================================================

    [Fact]
    public async Task AirbnbImport_InvalidFileExtension_Returns400()
    {
        // Arrange — send a .txt file instead of .csv
        var multipart = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("some text"));
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/plain");
        multipart.Add(fileContent, "file", "test.txt");

        // Act
        var response = await _adminClient.PostAsync(
            $"/api/import/airbnb-csv?propertyId={_propertyId}&dryRun=true", multipart);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
