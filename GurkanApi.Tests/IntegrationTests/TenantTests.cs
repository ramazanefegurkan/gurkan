using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.Groups;
using GurkanApi.DTOs.Properties;
using GurkanApi.DTOs.RentIncreases;
using GurkanApi.DTOs.RentPayments;
using GurkanApi.DTOs.ShortTermRentals;
using GurkanApi.DTOs.Tenants;
using GurkanApi.DTOs.Users;
using GurkanApi.Entities;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S03")]
public class TenantTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;

    private HttpClient _adminClient = null!;
    private Guid _groupAId;
    private Guid _groupBId;
    private Guid _propertyAId;
    private string _user1Email = "tenantuser1@test.com";
    private string _user2Email = "tenantuser2@test.com";
    private string _password = "Test1234!";

    public TenantTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();

        _adminClient = _factory.CreateClient();
        await _adminClient.LoginAsAsync("admin@gurkan.com", "Admin123!");

        // Register two users
        var reg1 = await _adminClient.RegisterUserAsync(_user1Email, _password, "Tenant User One");
        reg1.EnsureSuccessStatusCode();
        var reg2 = await _adminClient.RegisterUserAsync(_user2Email, _password, "Tenant User Two");
        reg2.EnsureSuccessStatusCode();

        // Get user IDs
        var usersResponse = await _adminClient.GetAsync("/api/users");
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.Content.ReadAsApiJsonAsync<List<UserResponse>>();
        var user1Id = users!.First(u => u.Email == _user1Email).Id;
        var user2Id = users!.First(u => u.Email == _user2Email).Id;

        // Create two groups
        var groupAResponse = await _adminClient.PostAsJsonAsync("/api/groups", new { name = "Tenant Group A", description = "Test group A" });
        groupAResponse.EnsureSuccessStatusCode();
        var groupA = await groupAResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupAId = groupA!.Id;

        var groupBResponse = await _adminClient.PostAsJsonAsync("/api/groups", new { name = "Tenant Group B", description = "Test group B" });
        groupBResponse.EnsureSuccessStatusCode();
        var groupB = await groupBResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupBId = groupB!.Id;

        // Add user1 to groupA, user2 to groupB
        var addMember1 = await _adminClient.PostAsJsonAsync($"/api/groups/{_groupAId}/members", new { userId = user1Id, role = "Member" });
        addMember1.EnsureSuccessStatusCode();
        var addMember2 = await _adminClient.PostAsJsonAsync($"/api/groups/{_groupBId}/members", new { userId = user2Id, role = "Member" });
        addMember2.EnsureSuccessStatusCode();

        // Create a property in groupA for most tests
        var propResponse = await _adminClient.PostAsJsonAsync("/api/properties", new
        {
            name = "Test Apartment",
            type = "Apartment",
            address = "Test St 1",
            city = "Istanbul",
            district = "Kadıköy",
            area = 100m,
            roomCount = 3,
            floor = 2,
            totalFloors = 5,
            buildYear = 2020,
            currency = "TRY",
            description = "Test property",
            groupId = _groupAId,
        });
        propResponse.EnsureSuccessStatusCode();
        var prop = await propResponse.Content.ReadAsApiJsonAsync<PropertyResponse>();
        _propertyAId = prop!.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // ---------- Helpers ----------

    private async Task<HttpClient> LoginAsUserAsync(string email)
    {
        var client = _factory.CreateClient();
        await client.LoginAsAsync(email, _password);
        return client;
    }

    private object MakeCreateTenantPayload(
        string fullName = "Ali Yılmaz",
        DateTime? leaseStart = null,
        DateTime? leaseEnd = null,
        decimal monthlyRent = 15000m,
        decimal deposit = 30000m,
        string currency = "TRY")
    {
        return new
        {
            fullName,
            phone = "05551234567",
            email = "tenant@example.com",
            identityNumber = "12345678901",
            leaseStart = leaseStart ?? DateTime.UtcNow.AddMonths(-1),
            leaseEnd = leaseEnd ?? DateTime.UtcNow.AddMonths(11),
            monthlyRent,
            deposit,
            currency,
        };
    }

    private async Task<TenantResponse> CreateTenantAsync(
        Guid propertyId,
        string fullName = "Ali Yılmaz",
        DateTime? leaseStart = null,
        DateTime? leaseEnd = null,
        decimal monthlyRent = 15000m,
        decimal deposit = 30000m,
        string currency = "TRY")
    {
        var response = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{propertyId}/tenants",
            MakeCreateTenantPayload(fullName, leaseStart, leaseEnd, monthlyRent, deposit, currency));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadAsApiJsonAsync<TenantResponse>())!;
    }

    private async Task<Guid> CreatePropertyInGroupAsync(Guid groupId, string name = "Extra Property", string currency = "TRY")
    {
        var response = await _adminClient.PostAsJsonAsync("/api/properties", new
        {
            name,
            type = "Apartment",
            address = "Extra St 1",
            city = "Istanbul",
            district = "Beşiktaş",
            area = 80m,
            roomCount = 2,
            floor = 1,
            totalFloors = 3,
            buildYear = 2018,
            currency,
            description = "Extra property",
            groupId,
        });
        response.EnsureSuccessStatusCode();
        var prop = await response.Content.ReadAsApiJsonAsync<PropertyResponse>();
        return prop!.Id;
    }

    // =====================================================================
    //  Tenant CRUD & Access Control
    // =====================================================================

    [Fact]
    public async Task CreateTenant_ReturnsCreatedWithPayments()
    {
        var leaseStart = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var leaseEnd = new DateTime(2025, 7, 1, 0, 0, 0, DateTimeKind.Utc);

        var response = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/tenants",
            MakeCreateTenantPayload("Ahmet Kaya", leaseStart, leaseEnd, 10000m, 20000m));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var tenant = await response.Content.ReadAsApiJsonAsync<TenantResponse>();
        Assert.NotNull(tenant);
        Assert.Equal("Ahmet Kaya", tenant.FullName);
        Assert.Equal("05551234567", tenant.Phone);
        Assert.Equal("tenant@example.com", tenant.Email);
        Assert.Equal(10000m, tenant.MonthlyRent);
        Assert.Equal(20000m, tenant.Deposit);
        Assert.Equal(Currency.TRY, tenant.Currency);
        Assert.True(tenant.IsActive);
        Assert.Equal(_propertyAId, tenant.PropertyId);

        // Verify auto-generated payments: Jan, Feb, Mar, Apr, May, Jun = 6 months
        var paymentsResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant.Id}/rent-payments");
        paymentsResponse.EnsureSuccessStatusCode();

        var payments = await paymentsResponse.Content.ReadAsApiJsonAsync<List<RentPaymentResponse>>();
        Assert.NotNull(payments);
        Assert.Equal(6, payments.Count);
        Assert.All(payments, p =>
        {
            Assert.Equal(10000m, p.Amount);
            Assert.Equal(Currency.TRY, p.Currency);
        });
    }

    [Fact]
    public async Task CreateTenant_ActiveTenantExists_Returns409()
    {
        // Create first active tenant
        await CreateTenantAsync(_propertyAId, "First Tenant");

        // Try creating a second active tenant — should get 409
        var response = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/tenants",
            MakeCreateTenantPayload("Second Tenant"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task CreateTenant_CrossGroupAccess_Returns403()
    {
        // Create a property in groupB
        var groupBPropertyId = await CreatePropertyInGroupAsync(_groupBId, "GroupB Property");

        // Login as user1 (member of groupA, NOT groupB)
        var user1Client = await LoginAsUserAsync(_user1Email);

        var response = await user1Client.PostAsJsonAsync(
            $"/api/properties/{groupBPropertyId}/tenants",
            MakeCreateTenantPayload("Forbidden Tenant"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetTenants_FilterActiveAndInactive()
    {
        // Create a tenant then terminate it to make it inactive
        var tenant1 = await CreateTenantAsync(_propertyAId, "Inactive Tenant");
        var terminateResponse = await _adminClient.PostAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant1.Id}/terminate", null);
        terminateResponse.EnsureSuccessStatusCode();

        // Create another property in the same group to add an active tenant
        // (the first property already has a terminated tenant so we can add a new one)
        var tenant2 = await CreateTenantAsync(_propertyAId, "Active Tenant");

        // Filter active
        var activeResponse = await _adminClient.GetAsync($"/api/properties/{_propertyAId}/tenants?active=true");
        activeResponse.EnsureSuccessStatusCode();
        var activeTenants = await activeResponse.Content.ReadAsApiJsonAsync<List<TenantListResponse>>();
        Assert.NotNull(activeTenants);
        Assert.Single(activeTenants);
        Assert.Equal("Active Tenant", activeTenants[0].FullName);

        // Filter inactive
        var inactiveResponse = await _adminClient.GetAsync($"/api/properties/{_propertyAId}/tenants?active=false");
        inactiveResponse.EnsureSuccessStatusCode();
        var inactiveTenants = await inactiveResponse.Content.ReadAsApiJsonAsync<List<TenantListResponse>>();
        Assert.NotNull(inactiveTenants);
        Assert.Single(inactiveTenants);
        Assert.Equal("Inactive Tenant", inactiveTenants[0].FullName);
    }

    [Fact]
    public async Task UpdateTenant_ReturnsOk()
    {
        var tenant = await CreateTenantAsync(_propertyAId, "Original Name");

        var updatePayload = new
        {
            fullName = "Updated Name",
            phone = "05559999999",
            email = "updated@example.com",
            identityNumber = "99999999999",
        };

        var response = await _adminClient.PutAsJsonAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant.Id}", updatePayload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadAsApiJsonAsync<TenantResponse>();
        Assert.NotNull(updated);
        Assert.Equal("Updated Name", updated.FullName);
        Assert.Equal("05559999999", updated.Phone);
        Assert.Equal("updated@example.com", updated.Email);
        Assert.NotNull(updated.UpdatedAt);
    }

    // =====================================================================
    //  Rent Payments & Late Detection
    // =====================================================================

    [Fact]
    public async Task GetRentPayments_ComputesLateStatus()
    {
        // Create tenant with lease starting well in the past so some payments are overdue
        var leaseStart = DateTime.UtcNow.AddMonths(-3);
        var leaseEnd = DateTime.UtcNow.AddMonths(3);

        var tenant = await CreateTenantAsync(_propertyAId, "Late Tenant", leaseStart, leaseEnd);

        var paymentsResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant.Id}/rent-payments");
        paymentsResponse.EnsureSuccessStatusCode();

        var payments = await paymentsResponse.Content.ReadAsApiJsonAsync<List<RentPaymentResponse>>();
        Assert.NotNull(payments);

        // Payments with DueDate + 5 days < now should show "Late"
        var now = DateTime.UtcNow;
        var latePayments = payments.Where(p => p.Status == "Late").ToList();
        var pendingPayments = payments.Where(p => p.Status == "Pending").ToList();

        // At least the oldest payment should be Late (started 3 months ago, so DueDate+5 < now)
        Assert.NotEmpty(latePayments);

        // Verify late detection logic: all Late payments must have DueDate+5 < now
        Assert.All(latePayments, p => Assert.True(p.DueDate.AddDays(5) < now));

        // Future/recent payments should still be Pending
        Assert.NotEmpty(pendingPayments);
    }

    [Fact]
    public async Task MarkPaymentAsPaid_ReturnsOk()
    {
        var leaseStart = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var leaseEnd = new DateTime(2025, 9, 1, 0, 0, 0, DateTimeKind.Utc);

        var tenant = await CreateTenantAsync(_propertyAId, "Paying Tenant", leaseStart, leaseEnd);

        // Get payments and pick the first one
        var paymentsResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant.Id}/rent-payments");
        var payments = await paymentsResponse.Content.ReadAsApiJsonAsync<List<RentPaymentResponse>>();
        Assert.NotNull(payments);
        Assert.NotEmpty(payments);

        var paymentId = payments[0].Id;
        var paidDate = new DateTime(2025, 6, 5, 0, 0, 0, DateTimeKind.Utc);

        var payResponse = await _adminClient.PatchAsJsonAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant.Id}/rent-payments/{paymentId}/pay",
            new { paidDate, paymentMethod = "BankTransfer", notes = "Paid via EFT" });

        Assert.Equal(HttpStatusCode.OK, payResponse.StatusCode);

        var paidPayment = await payResponse.Content.ReadAsApiJsonAsync<RentPaymentResponse>();
        Assert.NotNull(paidPayment);
        Assert.Equal("Paid", paidPayment.Status);
        Assert.Equal("BankTransfer", paidPayment.PaymentMethod);
        Assert.Equal("Paid via EFT", paidPayment.Notes);
    }

    [Fact]
    public async Task MarkPaymentAsPaid_AlreadyPaid_Returns400()
    {
        var leaseStart = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var leaseEnd = new DateTime(2025, 9, 1, 0, 0, 0, DateTimeKind.Utc);

        var tenant = await CreateTenantAsync(_propertyAId, "Double Pay Tenant", leaseStart, leaseEnd);

        var paymentsResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant.Id}/rent-payments");
        var payments = await paymentsResponse.Content.ReadAsApiJsonAsync<List<RentPaymentResponse>>();
        var paymentId = payments![0].Id;

        // Pay once
        var firstPay = await _adminClient.PatchAsJsonAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant.Id}/rent-payments/{paymentId}/pay",
            new { paymentMethod = "Cash" });
        firstPay.EnsureSuccessStatusCode();

        // Try paying again — should get 400
        var secondPay = await _adminClient.PatchAsJsonAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant.Id}/rent-payments/{paymentId}/pay",
            new { paymentMethod = "Cash" });

        Assert.Equal(HttpStatusCode.BadRequest, secondPay.StatusCode);
    }

    // =====================================================================
    //  Lease Termination
    // =====================================================================

    [Fact]
    public async Task TerminateTenant_CancelsFuturePayments()
    {
        // Create tenant with lease stretching well into the future
        var leaseStart = DateTime.UtcNow.AddMonths(-1);
        var leaseEnd = DateTime.UtcNow.AddMonths(6);

        var tenant = await CreateTenantAsync(_propertyAId, "Terminating Tenant", leaseStart, leaseEnd);

        // Terminate
        var terminateResponse = await _adminClient.PostAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant.Id}/terminate", null);
        Assert.Equal(HttpStatusCode.OK, terminateResponse.StatusCode);

        var terminated = await terminateResponse.Content.ReadAsApiJsonAsync<TenantResponse>();
        Assert.NotNull(terminated);
        Assert.False(terminated.IsActive);

        // Get all payments and verify future ones are cancelled
        var paymentsResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant.Id}/rent-payments");
        paymentsResponse.EnsureSuccessStatusCode();

        var payments = await paymentsResponse.Content.ReadAsApiJsonAsync<List<RentPaymentResponse>>();
        Assert.NotNull(payments);

        var now = DateTime.UtcNow;
        var futurePayments = payments.Where(p => p.DueDate > now.AddMinutes(-1)).ToList();
        var cancelledPayments = payments.Where(p => p.Status == "Cancelled").ToList();

        // All future Pending payments should now be Cancelled
        // (some may have been Late before termination, those stay as-is in the DB status,
        //  but the controller cancels Pending ones with DueDate > now)
        Assert.NotEmpty(cancelledPayments);

        // No future payment should still be Pending
        var futurePending = payments.Where(p => p.DueDate > now && p.Status == "Pending").ToList();
        Assert.Empty(futurePending);
    }

    // =====================================================================
    //  Short-Term Rentals
    // =====================================================================

    [Fact]
    public async Task CreateShortTermRental_ReturnsCreated()
    {
        // Use a different property (no active tenant needed for short-term)
        var propertyId = await CreatePropertyInGroupAsync(_groupAId, "Vacation Home", "EUR");

        var checkIn = new DateTime(2025, 7, 1, 14, 0, 0, DateTimeKind.Utc);
        var checkOut = new DateTime(2025, 7, 5, 11, 0, 0, DateTimeKind.Utc);

        var response = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{propertyId}/short-term-rentals",
            new
            {
                guestName = "John Guest",
                checkIn,
                checkOut,
                nightlyRate = 100m,
                totalAmount = 400m,
                platformFee = 60m,
                netAmount = 340m,
                platform = "Airbnb",
                currency = "EUR",
                notes = "VIP guest",
            });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var rental = await response.Content.ReadAsApiJsonAsync<ShortTermRentalResponse>();
        Assert.NotNull(rental);
        Assert.Equal("John Guest", rental.GuestName);
        Assert.Equal(4, rental.NightCount); // Jul 1 to Jul 5 = 4 nights
        Assert.Equal(100m, rental.NightlyRate);
        Assert.Equal(400m, rental.TotalAmount);
        Assert.Equal(60m, rental.PlatformFee);
        Assert.Equal(340m, rental.NetAmount);
        Assert.Equal(RentalPlatform.Airbnb, rental.Platform);
        Assert.Equal(Currency.EUR, rental.Currency);
        Assert.Equal("VIP guest", rental.Notes);
        Assert.Equal(propertyId, rental.PropertyId);
    }

    [Fact]
    public async Task ShortTermRentalCRUD_FullLifecycle()
    {
        var propertyId = await CreatePropertyInGroupAsync(_groupAId, "CRUD Rental Property");

        var checkIn = new DateTime(2025, 8, 1, 14, 0, 0, DateTimeKind.Utc);
        var checkOut = new DateTime(2025, 8, 4, 11, 0, 0, DateTimeKind.Utc);

        // Create
        var createResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{propertyId}/short-term-rentals",
            new
            {
                guestName = "Alice",
                checkIn,
                checkOut,
                nightlyRate = 200m,
                totalAmount = 600m,
                platformFee = 90m,
                netAmount = 510m,
                platform = "Booking",
                currency = "TRY",
            });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadAsApiJsonAsync<ShortTermRentalResponse>();
        Assert.NotNull(created);

        // Update
        var updateResponse = await _adminClient.PutAsJsonAsync(
            $"/api/properties/{propertyId}/short-term-rentals/{created.Id}",
            new { guestName = "Alice Updated", nightlyRate = 250m });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadAsApiJsonAsync<ShortTermRentalResponse>();
        Assert.Equal("Alice Updated", updated!.GuestName);
        Assert.Equal(250m, updated.NightlyRate);

        // List
        var listResponse = await _adminClient.GetAsync(
            $"/api/properties/{propertyId}/short-term-rentals");
        listResponse.EnsureSuccessStatusCode();
        var list = await listResponse.Content.ReadAsApiJsonAsync<List<ShortTermRentalResponse>>();
        Assert.NotNull(list);
        Assert.Single(list);
        Assert.Equal("Alice Updated", list[0].GuestName);

        // Delete
        var deleteResponse = await _adminClient.DeleteAsync(
            $"/api/properties/{propertyId}/short-term-rentals/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Verify deletion
        var afterDeleteList = await _adminClient.GetAsync(
            $"/api/properties/{propertyId}/short-term-rentals");
        var afterDelete = await afterDeleteList.Content.ReadAsApiJsonAsync<List<ShortTermRentalResponse>>();
        Assert.Empty(afterDelete!);
    }

    // =====================================================================
    //  Rent Increases
    // =====================================================================

    [Fact]
    public async Task CreateRentIncrease_UpdatesFuturePayments()
    {
        var leaseStart = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var leaseEnd = new DateTime(2025, 7, 1, 0, 0, 0, DateTimeKind.Utc);

        var tenant = await CreateTenantAsync(_propertyAId, "Increase Tenant", leaseStart, leaseEnd, 10000m);

        // Verify initial payment amounts
        var beforePayments = await GetPaymentsAsync(tenant.Id);
        Assert.All(beforePayments, p => Assert.Equal(10000m, p.Amount));

        // Apply rent increase effective from April 2025
        var effectiveDate = new DateTime(2025, 4, 1, 0, 0, 0, DateTimeKind.Utc);
        var increaseResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenant.Id}/rent-increases",
            new { newAmount = 12000m, effectiveDate, notes = "Annual increase" });

        Assert.Equal(HttpStatusCode.Created, increaseResponse.StatusCode);

        var increase = await increaseResponse.Content.ReadAsApiJsonAsync<RentIncreaseResponse>();
        Assert.NotNull(increase);
        Assert.Equal(10000m, increase.PreviousAmount);
        Assert.Equal(12000m, increase.NewAmount);
        Assert.Equal(20.00m, increase.IncreaseRate); // (12000-10000)/10000*100 = 20%
        Assert.Equal("Annual increase", increase.Notes);

        // Verify future payments were updated
        var afterPayments = await GetPaymentsAsync(tenant.Id);

        // Payments before effective date should still be 10000
        var priorPayments = afterPayments.Where(p => p.DueDate < effectiveDate).ToList();
        Assert.All(priorPayments, p => Assert.Equal(10000m, p.Amount));

        // Payments on/after effective date should be 12000
        var futurePayments = afterPayments.Where(p => p.DueDate >= effectiveDate && p.Status != "Cancelled").ToList();
        Assert.NotEmpty(futurePayments);
        Assert.All(futurePayments, p => Assert.Equal(12000m, p.Amount));
    }

    [Fact]
    public async Task CreateRentIncrease_MultiCurrency()
    {
        // Create a USD property and tenant
        var usdPropertyId = await CreatePropertyInGroupAsync(_groupAId, "USD Property", "USD");

        var leaseStart = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var leaseEnd = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc);

        var tenant = await CreateTenantAsync(usdPropertyId, "USD Tenant", leaseStart, leaseEnd, 1000m, 2000m, "USD");

        // Verify payments are in USD
        var payments = await GetPaymentsForPropertyAsync(usdPropertyId, tenant.Id);
        Assert.All(payments, p => Assert.Equal(Currency.USD, p.Currency));

        // Apply rent increase
        var effectiveDate = new DateTime(2025, 3, 1, 0, 0, 0, DateTimeKind.Utc);
        var increaseResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{usdPropertyId}/tenants/{tenant.Id}/rent-increases",
            new { newAmount = 1200m, effectiveDate });

        Assert.Equal(HttpStatusCode.Created, increaseResponse.StatusCode);

        var increase = await increaseResponse.Content.ReadAsApiJsonAsync<RentIncreaseResponse>();
        Assert.NotNull(increase);
        Assert.Equal(1000m, increase.PreviousAmount);
        Assert.Equal(1200m, increase.NewAmount);

        // Verify updated payments still have USD currency
        var updatedPayments = await GetPaymentsForPropertyAsync(usdPropertyId, tenant.Id);
        Assert.All(updatedPayments, p => Assert.Equal(Currency.USD, p.Currency));

        // Verify amounts updated for future payments
        var futureUpdated = updatedPayments.Where(p => p.DueDate >= effectiveDate && p.Status != "Cancelled").ToList();
        Assert.NotEmpty(futureUpdated);
        Assert.All(futureUpdated, p => Assert.Equal(1200m, p.Amount));
    }

    // =====================================================================
    //  Helpers for payment retrieval
    // =====================================================================

    private async Task<List<RentPaymentResponse>> GetPaymentsAsync(Guid tenantId)
    {
        var response = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/tenants/{tenantId}/rent-payments");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadAsApiJsonAsync<List<RentPaymentResponse>>())!;
    }

    private async Task<List<RentPaymentResponse>> GetPaymentsForPropertyAsync(Guid propertyId, Guid tenantId)
    {
        var response = await _adminClient.GetAsync(
            $"/api/properties/{propertyId}/tenants/{tenantId}/rent-payments");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadAsApiJsonAsync<List<RentPaymentResponse>>())!;
    }
}
