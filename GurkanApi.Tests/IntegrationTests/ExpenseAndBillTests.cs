using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.Bills;
using GurkanApi.DTOs.Expenses;
using GurkanApi.DTOs.Groups;
using GurkanApi.DTOs.Properties;
using GurkanApi.DTOs.Users;
using GurkanApi.Entities;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S04")]
public class ExpenseAndBillTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;

    private HttpClient _adminClient = null!;
    private Guid _groupAId;
    private Guid _groupBId;
    private Guid _propertyAId;
    private string _user1Email = "expenseuser1@test.com";
    private string _user2Email = "expenseuser2@test.com";
    private string _password = "Test1234!";

    public ExpenseAndBillTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();

        _adminClient = _factory.CreateClient();
        await _adminClient.LoginAsAsync("admin@gurkan.com", "Admin123!");

        // Register two users
        var reg1 = await _adminClient.RegisterUserAsync(_user1Email, _password, "Expense User One");
        reg1.EnsureSuccessStatusCode();
        var reg2 = await _adminClient.RegisterUserAsync(_user2Email, _password, "Expense User Two");
        reg2.EnsureSuccessStatusCode();

        // Get user IDs
        var usersResponse = await _adminClient.GetAsync("/api/users");
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.Content.ReadAsApiJsonAsync<List<UserResponse>>();
        var user1Id = users!.First(u => u.Email == _user1Email).Id;
        var user2Id = users!.First(u => u.Email == _user2Email).Id;

        // Create two groups
        var groupAResponse = await _adminClient.PostAsJsonAsync("/api/groups", new { name = "Expense Group A", description = "Test group A" });
        groupAResponse.EnsureSuccessStatusCode();
        var groupA = await groupAResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupAId = groupA!.Id;

        var groupBResponse = await _adminClient.PostAsJsonAsync("/api/groups", new { name = "Expense Group B", description = "Test group B" });
        groupBResponse.EnsureSuccessStatusCode();
        var groupB = await groupBResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupBId = groupB!.Id;

        // Add user1 to groupA, user2 to groupB
        var addMember1 = await _adminClient.PostAsJsonAsync($"/api/groups/{_groupAId}/members", new { userId = user1Id, role = "Member" });
        addMember1.EnsureSuccessStatusCode();
        var addMember2 = await _adminClient.PostAsJsonAsync($"/api/groups/{_groupBId}/members", new { userId = user2Id, role = "Member" });
        addMember2.EnsureSuccessStatusCode();

        // Create a property in groupA
        var propResponse = await _adminClient.PostAsJsonAsync("/api/properties", new
        {
            name = "Expense Test Apartment",
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
            description = "Test property for expenses",
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
    //  Expense CRUD
    // =====================================================================

    [Fact]
    public async Task ExpenseCRUD_FullLifecycle()
    {
        // Create
        var createResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/expenses",
            new
            {
                category = "Maintenance",
                description = "Plumbing repair",
                amount = 5000m,
                currency = "TRY",
                date = new DateTime(2025, 6, 15, 0, 0, 0, DateTimeKind.Utc),
                isRecurring = false,
                notes = "Kitchen sink",
            });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content.ReadAsApiJsonAsync<ExpenseResponse>();
        Assert.NotNull(created);
        Assert.Equal(ExpenseCategory.Maintenance, created.Category);
        Assert.Equal("Plumbing repair", created.Description);
        Assert.Equal(5000m, created.Amount);
        Assert.Equal(Currency.TRY, created.Currency);
        Assert.False(created.IsRecurring);
        Assert.Equal("Kitchen sink", created.Notes);
        Assert.Equal(_propertyAId, created.PropertyId);

        // Get by ID
        var getResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/expenses/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var fetched = await getResponse.Content.ReadAsApiJsonAsync<ExpenseResponse>();
        Assert.Equal(created.Id, fetched!.Id);
        Assert.Equal("Plumbing repair", fetched.Description);

        // Update
        var updateResponse = await _adminClient.PutAsJsonAsync(
            $"/api/properties/{_propertyAId}/expenses/{created.Id}",
            new
            {
                category = "Repair",
                description = "Plumbing repair - updated",
                amount = 6000m,
                currency = "TRY",
                date = new DateTime(2025, 6, 16, 0, 0, 0, DateTimeKind.Utc),
                isRecurring = false,
            });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadAsApiJsonAsync<ExpenseResponse>();
        Assert.Equal(ExpenseCategory.Repair, updated!.Category);
        Assert.Equal("Plumbing repair - updated", updated.Description);
        Assert.Equal(6000m, updated.Amount);

        // List
        var listResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/expenses");
        listResponse.EnsureSuccessStatusCode();
        var list = await listResponse.Content.ReadAsApiJsonAsync<List<ExpenseResponse>>();
        Assert.NotNull(list);
        Assert.Single(list);

        // Delete
        var deleteResponse = await _adminClient.DeleteAsync(
            $"/api/properties/{_propertyAId}/expenses/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Verify deletion
        var afterDeleteList = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/expenses");
        var afterDelete = await afterDeleteList.Content.ReadAsApiJsonAsync<List<ExpenseResponse>>();
        Assert.Empty(afterDelete!);
    }

    // =====================================================================
    //  Bill CRUD
    // =====================================================================

    [Fact]
    public async Task BillCRUD_FullLifecycle()
    {
        // Create
        var createResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/bills",
            new
            {
                type = "Electric",
                amount = 850m,
                currency = "TRY",
                dueDate = new DateTime(2025, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                notes = "June electric bill",
            });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content.ReadAsApiJsonAsync<BillResponse>();
        Assert.NotNull(created);
        Assert.Equal(BillType.Electric, created.Type);
        Assert.Equal(850m, created.Amount);
        Assert.Equal(Currency.TRY, created.Currency);
        Assert.Equal(BillPaymentStatus.Pending, created.Status);
        Assert.Null(created.PaidDate);
        Assert.Equal("June electric bill", created.Notes);
        Assert.Equal(_propertyAId, created.PropertyId);

        // Get by ID
        var getResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/bills/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var fetched = await getResponse.Content.ReadAsApiJsonAsync<BillResponse>();
        Assert.Equal(created.Id, fetched!.Id);

        // Update
        var updateResponse = await _adminClient.PutAsJsonAsync(
            $"/api/properties/{_propertyAId}/bills/{created.Id}",
            new
            {
                type = "Water",
                amount = 300m,
                currency = "TRY",
                dueDate = new DateTime(2025, 7, 5, 0, 0, 0, DateTimeKind.Utc),
                notes = "Corrected to water",
            });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadAsApiJsonAsync<BillResponse>();
        Assert.Equal(BillType.Water, updated!.Type);
        Assert.Equal(300m, updated.Amount);
        Assert.Equal("Corrected to water", updated.Notes);

        // List
        var listResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/bills");
        listResponse.EnsureSuccessStatusCode();
        var list = await listResponse.Content.ReadAsApiJsonAsync<List<BillResponse>>();
        Assert.NotNull(list);
        Assert.Single(list);

        // Delete
        var deleteResponse = await _adminClient.DeleteAsync(
            $"/api/properties/{_propertyAId}/bills/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Verify deletion
        var afterDeleteList = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/bills");
        var afterDelete = await afterDeleteList.Content.ReadAsApiJsonAsync<List<BillResponse>>();
        Assert.Empty(afterDelete!);
    }

    // =====================================================================
    //  Cross-Group Access Denial
    // =====================================================================

    [Fact]
    public async Task ExpenseCrossGroupAccess_Returns403()
    {
        var groupBPropertyId = await CreatePropertyInGroupAsync(_groupBId, "GroupB Expense Property");

        // Login as user1 (member of groupA, NOT groupB)
        var user1Client = await LoginAsUserAsync(_user1Email);

        var response = await user1Client.PostAsJsonAsync(
            $"/api/properties/{groupBPropertyId}/expenses",
            new
            {
                category = "Tax",
                description = "Forbidden expense",
                amount = 1000m,
                currency = "TRY",
                date = DateTime.UtcNow,
                isRecurring = false,
            });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task BillCrossGroupAccess_Returns403()
    {
        var groupBPropertyId = await CreatePropertyInGroupAsync(_groupBId, "GroupB Bill Property");

        // Login as user1 (member of groupA, NOT groupB)
        var user1Client = await LoginAsUserAsync(_user1Email);

        var response = await user1Client.PostAsJsonAsync(
            $"/api/properties/{groupBPropertyId}/bills",
            new
            {
                type = "Water",
                amount = 500m,
                currency = "TRY",
                dueDate = DateTime.UtcNow.AddDays(30),
            });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // =====================================================================
    //  Category Filter
    // =====================================================================

    [Fact]
    public async Task ExpenseCategoryFilter_ReturnsOnlyMatchingCategory()
    {
        // Create expenses with different categories
        await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/expenses",
            new
            {
                category = "Tax",
                description = "Property tax",
                amount = 10000m,
                currency = "TRY",
                date = new DateTime(2025, 1, 15, 0, 0, 0, DateTimeKind.Utc),
                isRecurring = false,
            });

        await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/expenses",
            new
            {
                category = "Maintenance",
                description = "Cleaning",
                amount = 500m,
                currency = "TRY",
                date = new DateTime(2025, 2, 1, 0, 0, 0, DateTimeKind.Utc),
                isRecurring = false,
            });

        await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/expenses",
            new
            {
                category = "Tax",
                description = "Income tax",
                amount = 5000m,
                currency = "TRY",
                date = new DateTime(2025, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                isRecurring = false,
            });

        // Filter by Tax
        var response = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/expenses?category=Tax");
        response.EnsureSuccessStatusCode();

        var expenses = await response.Content.ReadAsApiJsonAsync<List<ExpenseResponse>>();
        Assert.NotNull(expenses);
        Assert.Equal(2, expenses.Count);
        Assert.All(expenses, e => Assert.Equal(ExpenseCategory.Tax, e.Category));
    }

    // =====================================================================
    //  Bill Status Filter
    // =====================================================================

    [Fact]
    public async Task BillStatusFilter_ReturnsOnlyMatchingStatus()
    {
        // Create two bills
        var bill1Response = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/bills",
            new
            {
                type = "Water",
                amount = 200m,
                currency = "TRY",
                dueDate = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            });
        bill1Response.EnsureSuccessStatusCode();
        var bill1 = await bill1Response.Content.ReadAsApiJsonAsync<BillResponse>();

        await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/bills",
            new
            {
                type = "Electric",
                amount = 450m,
                currency = "TRY",
                dueDate = new DateTime(2025, 7, 1, 0, 0, 0, DateTimeKind.Utc),
            });

        // Mark first bill as paid
        await _adminClient.PatchAsync(
            $"/api/properties/{_propertyAId}/bills/{bill1!.Id}/pay", null);

        // Filter by Pending — should only return the second bill
        var pendingResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/bills?status=Pending");
        pendingResponse.EnsureSuccessStatusCode();

        var pendingBills = await pendingResponse.Content.ReadAsApiJsonAsync<List<BillResponse>>();
        Assert.NotNull(pendingBills);
        Assert.Single(pendingBills);
        Assert.Equal(BillPaymentStatus.Pending, pendingBills[0].Status);
        Assert.Equal(450m, pendingBills[0].Amount);
    }

    // =====================================================================
    //  Mark Bill as Paid
    // =====================================================================

    [Fact]
    public async Task MarkBillAsPaid_SetsStatusAndPaidDate()
    {
        var createResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/bills",
            new
            {
                type = "Gas",
                amount = 700m,
                currency = "TRY",
                dueDate = new DateTime(2025, 8, 1, 0, 0, 0, DateTimeKind.Utc),
            });
        createResponse.EnsureSuccessStatusCode();
        var bill = await createResponse.Content.ReadAsApiJsonAsync<BillResponse>();

        // Mark as paid
        var payResponse = await _adminClient.PatchAsync(
            $"/api/properties/{_propertyAId}/bills/{bill!.Id}/pay", null);

        Assert.Equal(HttpStatusCode.OK, payResponse.StatusCode);

        var paidBill = await payResponse.Content.ReadAsApiJsonAsync<BillResponse>();
        Assert.NotNull(paidBill);
        Assert.Equal(BillPaymentStatus.Paid, paidBill.Status);
        Assert.NotNull(paidBill.PaidDate);
    }

    // =====================================================================
    //  Multi-Currency
    // =====================================================================

    [Fact]
    public async Task MultiCurrency_ExpenseEUR_BillUSD()
    {
        // Create expense with EUR
        var expenseResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/expenses",
            new
            {
                category = "Insurance",
                description = "Property insurance EUR",
                amount = 2500m,
                currency = "EUR",
                date = new DateTime(2025, 5, 1, 0, 0, 0, DateTimeKind.Utc),
                isRecurring = true,
                recurrenceInterval = "Yearly",
            });
        expenseResponse.EnsureSuccessStatusCode();
        var expense = await expenseResponse.Content.ReadAsApiJsonAsync<ExpenseResponse>();
        Assert.NotNull(expense);
        Assert.Equal(Currency.EUR, expense.Currency);
        Assert.True(expense.IsRecurring);
        Assert.Equal("Yearly", expense.RecurrenceInterval);

        // Create bill with USD
        var billResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{_propertyAId}/bills",
            new
            {
                type = "Internet",
                amount = 50m,
                currency = "USD",
                dueDate = new DateTime(2025, 5, 15, 0, 0, 0, DateTimeKind.Utc),
                notes = "Fiber internet",
            });
        billResponse.EnsureSuccessStatusCode();
        var bill = await billResponse.Content.ReadAsApiJsonAsync<BillResponse>();
        Assert.NotNull(bill);
        Assert.Equal(Currency.USD, bill.Currency);
        Assert.Equal(BillType.Internet, bill.Type);
    }
}
