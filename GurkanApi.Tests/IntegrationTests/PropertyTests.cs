using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.Groups;
using GurkanApi.DTOs.Properties;
using GurkanApi.DTOs.Users;
using GurkanApi.Entities;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S02")]
public class PropertyTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;

    private HttpClient _adminClient = null!;
    private Guid _groupAId;
    private Guid _groupBId;
    private string _user1Email = "propuser1@test.com";
    private string _user2Email = "propuser2@test.com";
    private string _password = "Test1234!";

    public PropertyTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();

        _adminClient = _factory.CreateClient();
        await _adminClient.LoginAsAsync("admin@gurkan.com", "Admin123!");

        // Register two users
        var reg1 = await _adminClient.RegisterUserAsync(_user1Email, _password, "User One");
        reg1.EnsureSuccessStatusCode();
        var reg2 = await _adminClient.RegisterUserAsync(_user2Email, _password, "User Two");
        reg2.EnsureSuccessStatusCode();

        // Get user IDs
        var usersResponse = await _adminClient.GetAsync("/api/users");
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.Content.ReadAsApiJsonAsync<List<UserResponse>>();
        var user1Id = users!.First(u => u.Email == _user1Email).Id;
        var user2Id = users!.First(u => u.Email == _user2Email).Id;

        // Create two groups
        var groupAResponse = await _adminClient.PostAsJsonAsync("/api/groups", new { name = "Group A", description = "Test group A" });
        groupAResponse.EnsureSuccessStatusCode();
        var groupA = await groupAResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupAId = groupA!.Id;

        var groupBResponse = await _adminClient.PostAsJsonAsync("/api/groups", new { name = "Group B", description = "Test group B" });
        groupBResponse.EnsureSuccessStatusCode();
        var groupB = await groupBResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupBId = groupB!.Id;

        // Add user1 to groupA, user2 to groupB
        var addMember1 = await _adminClient.PostAsJsonAsync($"/api/groups/{_groupAId}/members", new { userId = user1Id, role = "Member" });
        addMember1.EnsureSuccessStatusCode();
        var addMember2 = await _adminClient.PostAsJsonAsync($"/api/groups/{_groupBId}/members", new { userId = user2Id, role = "Member" });
        addMember2.EnsureSuccessStatusCode();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // ---------- Helpers ----------

    private async Task<HttpClient> LoginAsUserAsync(string email)
    {
        var client = _factory.CreateClient();
        await client.LoginAsAsync(email, _password);
        return client;
    }

    private object MakeCreatePropertyPayload(Guid groupId, string name = "Test Property", Currency currency = Currency.TRY)
    {
        return new
        {
            name,
            type = "Apartment",
            address = "123 Test St",
            city = "Istanbul",
            district = "Kadıköy",
            area = 120.5m,
            roomCount = 3,
            floor = 2,
            totalFloors = 5,
            buildYear = 2020,
            currency = currency.ToString(),
            description = "Test property description",
            groupId,
        };
    }

    private async Task<PropertyResponse> CreatePropertyViaAdminAsync(Guid groupId, string name = "Test Property", Currency currency = Currency.TRY)
    {
        var response = await _adminClient.PostAsJsonAsync("/api/properties", MakeCreatePropertyPayload(groupId, name, currency));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadAsApiJsonAsync<PropertyResponse>())!;
    }

    // ---------- Property CRUD Tests ----------

    [Fact]
    public async Task SuperadminCreatesProperty_Returns201()
    {
        var response = await _adminClient.PostAsJsonAsync("/api/properties", MakeCreatePropertyPayload(_groupAId, "Admin Property", Currency.USD));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var property = await response.Content.ReadAsApiJsonAsync<PropertyResponse>();
        Assert.NotNull(property);
        Assert.Equal("Admin Property", property.Name);
        Assert.Equal(PropertyType.Apartment, property.Type);
        Assert.Equal("Istanbul", property.City);
        Assert.Equal("Kadıköy", property.District);
        Assert.Equal(Currency.USD, property.Currency);
        Assert.Equal(120.5m, property.Area);
        Assert.Equal(3, property.RoomCount);
        Assert.Equal(_groupAId, property.GroupId);
        Assert.NotEqual(Guid.Empty, property.Id);
        Assert.NotEqual(default, property.CreatedAt);
    }

    [Fact]
    public async Task GroupMemberCreatesPropertyInOwnGroup_Returns201()
    {
        var user1Client = await LoginAsUserAsync(_user1Email);

        var response = await user1Client.PostAsJsonAsync("/api/properties", MakeCreatePropertyPayload(_groupAId, "User1 Property"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var property = await response.Content.ReadAsApiJsonAsync<PropertyResponse>();
        Assert.NotNull(property);
        Assert.Equal("User1 Property", property.Name);
        Assert.Equal(_groupAId, property.GroupId);
    }

    [Fact]
    public async Task MemberCannotCreatePropertyInOtherGroup_Returns403()
    {
        var user1Client = await LoginAsUserAsync(_user1Email);

        var response = await user1Client.PostAsJsonAsync("/api/properties", MakeCreatePropertyPayload(_groupBId, "Forbidden Property"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task MemberListsProperties_SeesOnlyOwnGroup()
    {
        // Create properties in both groups via admin
        await CreatePropertyViaAdminAsync(_groupAId, "GroupA Property");
        await CreatePropertyViaAdminAsync(_groupBId, "GroupB Property");

        // User1 (member of groupA) should only see groupA properties
        var user1Client = await LoginAsUserAsync(_user1Email);
        var response = await user1Client.GetAsync("/api/properties");
        response.EnsureSuccessStatusCode();

        var properties = await response.Content.ReadAsApiJsonAsync<List<PropertyListResponse>>();
        Assert.NotNull(properties);
        Assert.All(properties, p => Assert.Equal(_groupAId, p.GroupId));
        Assert.Contains(properties, p => p.Name == "GroupA Property");
        Assert.DoesNotContain(properties, p => p.Name == "GroupB Property");
    }

    [Fact]
    public async Task MemberGetsPropertyDetail_OwnGroup_Returns200()
    {
        var created = await CreatePropertyViaAdminAsync(_groupAId, "Detail Property", Currency.EUR);

        var user1Client = await LoginAsUserAsync(_user1Email);
        var response = await user1Client.GetAsync($"/api/properties/{created.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var property = await response.Content.ReadAsApiJsonAsync<PropertyResponse>();
        Assert.NotNull(property);
        Assert.Equal("Detail Property", property.Name);
        Assert.Equal(Currency.EUR, property.Currency);
        Assert.Equal("Istanbul", property.City);
        Assert.Equal("Kadıköy", property.District);
        Assert.Equal(120.5m, property.Area);
    }

    [Fact]
    public async Task MemberCannotAccessOtherGroupProperty_Returns403()
    {
        var groupBProperty = await CreatePropertyViaAdminAsync(_groupBId, "Secret Property");

        var user1Client = await LoginAsUserAsync(_user1Email);
        var response = await user1Client.GetAsync($"/api/properties/{groupBProperty.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PropertyUpdate_Returns200()
    {
        var created = await CreatePropertyViaAdminAsync(_groupAId, "Original Name");

        var updatePayload = new { name = "Updated Name", city = "Ankara" };
        var response = await _adminClient.PutAsJsonAsync($"/api/properties/{created.Id}", updatePayload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadAsApiJsonAsync<PropertyResponse>();
        Assert.NotNull(updated);
        Assert.Equal("Updated Name", updated.Name);
        Assert.Equal("Ankara", updated.City);
        // Address should remain unchanged (partial update)
        Assert.Equal("123 Test St", updated.Address);
        Assert.NotNull(updated.UpdatedAt);
    }

    [Fact]
    public async Task PropertyDelete_Returns204()
    {
        var created = await CreatePropertyViaAdminAsync(_groupAId, "To Be Deleted");

        var deleteResponse = await _adminClient.DeleteAsync($"/api/properties/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Subsequent GET should return 404
        var getResponse = await _adminClient.GetAsync($"/api/properties/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    // ---------- Multi-Currency Tests ----------

    [Fact]
    public async Task CreatePropertyWithDifferentCurrencies_ReturnsCorrectCurrency()
    {
        var tryProperty = await CreatePropertyViaAdminAsync(_groupAId, "TRY Property", Currency.TRY);
        Assert.Equal(Currency.TRY, tryProperty.Currency);

        var usdProperty = await CreatePropertyViaAdminAsync(_groupAId, "USD Property", Currency.USD);
        Assert.Equal(Currency.USD, usdProperty.Currency);

        var eurProperty = await CreatePropertyViaAdminAsync(_groupAId, "EUR Property", Currency.EUR);
        Assert.Equal(Currency.EUR, eurProperty.Currency);
    }

    // ---------- Property Notes Tests ----------

    [Fact]
    public async Task AddNoteToProperty_Returns201()
    {
        var property = await CreatePropertyViaAdminAsync(_groupAId, "Noted Property");

        var response = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{property.Id}/notes",
            new { content = "This is a test note" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var note = await response.Content.ReadAsApiJsonAsync<PropertyNoteResponse>();
        Assert.NotNull(note);
        Assert.Equal("This is a test note", note.Content);
        Assert.Equal("System Admin", note.CreatedByName);
        Assert.NotEqual(Guid.Empty, note.Id);
        Assert.NotEqual(default, note.CreatedAt);
    }

    [Fact]
    public async Task ListNotesForProperty_ReturnsAll()
    {
        var property = await CreatePropertyViaAdminAsync(_groupAId, "Multi Note Property");

        // Add two notes with a small delay to ensure ordering
        await _adminClient.PostAsJsonAsync(
            $"/api/properties/{property.Id}/notes",
            new { content = "First note" });

        await _adminClient.PostAsJsonAsync(
            $"/api/properties/{property.Id}/notes",
            new { content = "Second note" });

        var response = await _adminClient.GetAsync($"/api/properties/{property.Id}/notes");
        response.EnsureSuccessStatusCode();

        var notes = await response.Content.ReadAsApiJsonAsync<List<PropertyNoteResponse>>();
        Assert.NotNull(notes);
        Assert.Equal(2, notes.Count);

        // Controller orders by CreatedAt descending, so Second should come first
        Assert.Equal("Second note", notes[0].Content);
        Assert.Equal("First note", notes[1].Content);
    }

    [Fact]
    public async Task UpdateOwnNote_Returns200()
    {
        var property = await CreatePropertyViaAdminAsync(_groupAId, "Update Note Property");

        var createResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{property.Id}/notes",
            new { content = "Original content" });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadAsApiJsonAsync<PropertyNoteResponse>();

        var updateResponse = await _adminClient.PutAsJsonAsync(
            $"/api/properties/{property.Id}/notes/{created!.Id}",
            new { content = "Updated content" });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var updated = await updateResponse.Content.ReadAsApiJsonAsync<PropertyNoteResponse>();
        Assert.NotNull(updated);
        Assert.Equal("Updated content", updated.Content);
    }

    [Fact]
    public async Task DeleteOwnNote_Returns204()
    {
        var property = await CreatePropertyViaAdminAsync(_groupAId, "Delete Note Property");

        var createResponse = await _adminClient.PostAsJsonAsync(
            $"/api/properties/{property.Id}/notes",
            new { content = "To be deleted" });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadAsApiJsonAsync<PropertyNoteResponse>();

        var deleteResponse = await _adminClient.DeleteAsync(
            $"/api/properties/{property.Id}/notes/{created!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task MemberCannotAddNoteToOtherGroupProperty_Returns403()
    {
        var groupBProperty = await CreatePropertyViaAdminAsync(_groupBId, "GroupB Note Property");

        var user1Client = await LoginAsUserAsync(_user1Email);
        var response = await user1Client.PostAsJsonAsync(
            $"/api/properties/{groupBProperty.Id}/notes",
            new { content = "Forbidden note" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
