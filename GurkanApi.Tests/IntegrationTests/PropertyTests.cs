using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.Groups;
using GurkanApi.DTOs.Properties;
using GurkanApi.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S02")]
public class PropertyTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private HttpClient _adminClient = null!;

    public PropertyTests(CustomWebApplicationFactory factory)
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

    private async Task<Guid> RegisterAndGetUserIdAsync(string email, string password, string fullName)
    {
        var registerResponse = await _adminClient.RegisterUserAsync(email, password, fullName);
        registerResponse.EnsureSuccessStatusCode();

        var response = await _adminClient.GetAsync("/api/users");
        response.EnsureSuccessStatusCode();
        var users = await response.Content.ReadAsApiJsonAsync<List<GurkanApi.DTOs.Users.UserResponse>>();
        return users!.First(u => u.Email == email).Id;
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync(string email, string password)
    {
        var client = _factory.CreateClient();
        await client.LoginAsAsync(email, password);
        return client;
    }

    private async Task<GroupResponse> CreateGroupAsync(string name)
    {
        var response = await _adminClient.PostAsJsonAsync("/api/groups", new { name });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadAsApiJsonAsync<GroupResponse>())!;
    }

    private async Task AddMemberAsync(Guid groupId, Guid userId, string role = "Member")
    {
        var response = await _adminClient.PostAsJsonAsync($"/api/groups/{groupId}/members", new { userId, role });
        response.EnsureSuccessStatusCode();
    }

    private async Task<PropertyResponse> CreatePropertyAsync(Guid groupId, string name = "Test Property",
        string type = "Apartment", string currency = "TRY")
    {
        var response = await _adminClient.PostAsJsonAsync("/api/properties", new
        {
            name,
            type,
            address = "Test Cad. No:1",
            city = "İstanbul",
            district = "Kadıköy",
            area = 120.5m,
            roomCount = 3,
            floor = 2,
            totalFloors = 5,
            buildYear = 2020,
            currency,
            description = "Test property",
            groupId,
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadAsApiJsonAsync<PropertyResponse>())!;
    }

    // ---------- Property CRUD ----------

    [Fact]
    public async Task SuperAdmin_CreatesProperty_Returns201()
    {
        var group = await CreateGroupAsync("Prop Group");

        var response = await _adminClient.PostAsJsonAsync("/api/properties", new
        {
            name = "Deniz Apartmanı",
            type = "Apartment",
            address = "Sahil Cad. No:5",
            city = "İstanbul",
            district = "Kadıköy",
            area = 95.0,
            roomCount = 2,
            floor = 3,
            totalFloors = 8,
            buildYear = 2018,
            currency = "TRY",
            description = "Sea view apartment",
            groupId = group.Id,
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var property = await response.Content.ReadAsApiJsonAsync<PropertyResponse>();
        Assert.NotNull(property);
        Assert.Equal("Deniz Apartmanı", property.Name);
        Assert.Equal("Apartment", property.Type.ToString());
        Assert.Equal("İstanbul", property.City);
        Assert.Equal(group.Id, property.GroupId);
        Assert.Equal(group.Name, property.GroupName);
    }

    [Fact]
    public async Task SuperAdmin_ListsAllProperties()
    {
        var group1 = await CreateGroupAsync("Group A");
        var group2 = await CreateGroupAsync("Group B");

        await CreatePropertyAsync(group1.Id, "Prop A");
        await CreatePropertyAsync(group2.Id, "Prop B");

        var response = await _adminClient.GetAsync("/api/properties");
        response.EnsureSuccessStatusCode();
        var properties = await response.Content.ReadAsApiJsonAsync<List<PropertyListResponse>>();
        Assert.NotNull(properties);
        Assert.True(properties.Count >= 2);
    }

    [Fact]
    public async Task GroupMember_SeesOnlyOwnGroupProperties()
    {
        var userId = await RegisterAndGetUserIdAsync("propmember@test.com", "Test1234!", "Prop Member");
        var myGroup = await CreateGroupAsync("My Group");
        var otherGroup = await CreateGroupAsync("Other Group");

        await AddMemberAsync(myGroup.Id, userId);
        await CreatePropertyAsync(myGroup.Id, "My Property");
        await CreatePropertyAsync(otherGroup.Id, "Other Property");

        var memberClient = await CreateAuthenticatedClientAsync("propmember@test.com", "Test1234!");
        var response = await memberClient.GetAsync("/api/properties");
        response.EnsureSuccessStatusCode();
        var properties = await response.Content.ReadAsApiJsonAsync<List<PropertyListResponse>>();
        Assert.NotNull(properties);
        Assert.Single(properties);
        Assert.Equal("My Property", properties[0].Name);
    }

    [Fact]
    public async Task GroupMember_CannotAccessOtherGroupProperty_Returns403()
    {
        var userId = await RegisterAndGetUserIdAsync("blocked@test.com", "Test1234!", "Blocked User");
        var myGroup = await CreateGroupAsync("Allowed Group");
        var otherGroup = await CreateGroupAsync("Blocked Group");

        await AddMemberAsync(myGroup.Id, userId);
        var otherProp = await CreatePropertyAsync(otherGroup.Id, "Blocked Prop");

        var memberClient = await CreateAuthenticatedClientAsync("blocked@test.com", "Test1234!");
        var response = await memberClient.GetAsync($"/api/properties/{otherProp.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SuperAdmin_UpdatesProperty()
    {
        var group = await CreateGroupAsync("Update Group");
        var prop = await CreatePropertyAsync(group.Id, "Original Name");

        var response = await _adminClient.PutAsJsonAsync($"/api/properties/{prop.Id}", new
        {
            name = "Updated Name",
            city = "Ankara",
        });
        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadAsApiJsonAsync<PropertyResponse>();
        Assert.Equal("Updated Name", updated!.Name);
        Assert.Equal("Ankara", updated.City);
        Assert.NotNull(updated.UpdatedAt);
    }

    [Fact]
    public async Task SuperAdmin_DeletesProperty_Returns204()
    {
        var group = await CreateGroupAsync("Delete Group");
        var prop = await CreatePropertyAsync(group.Id, "To Delete");

        var response = await _adminClient.DeleteAsync($"/api/properties/{prop.Id}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var getResponse = await _adminClient.GetAsync($"/api/properties/{prop.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task MultiCurrency_PropertiesPreserveCurrency()
    {
        var group = await CreateGroupAsync("Currency Group");

        var tryProp = await CreatePropertyAsync(group.Id, "TRY Property", currency: "TRY");
        var usdProp = await CreatePropertyAsync(group.Id, "USD Property", currency: "USD");
        var eurProp = await CreatePropertyAsync(group.Id, "EUR Property", currency: "EUR");

        Assert.Equal(Currency.TRY, tryProp.Currency);
        Assert.Equal(Currency.USD, usdProp.Currency);
        Assert.Equal(Currency.EUR, eurProp.Currency);
    }

    // ---------- Property Notes ----------

    [Fact]
    public async Task SuperAdmin_CreatesNote_Returns201()
    {
        var group = await CreateGroupAsync("Note Group");
        var prop = await CreatePropertyAsync(group.Id, "Note Property");

        var response = await _adminClient.PostAsJsonAsync($"/api/properties/{prop.Id}/notes", new
        {
            content = "This is a test note.",
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var note = await response.Content.ReadAsApiJsonAsync<PropertyNoteResponse>();
        Assert.NotNull(note);
        Assert.Equal("This is a test note.", note.Content);
        Assert.False(string.IsNullOrWhiteSpace(note.CreatedByName));
    }

    [Fact]
    public async Task ListNotes_ReturnsDescendingOrder()
    {
        var group = await CreateGroupAsync("NoteOrder Group");
        var prop = await CreatePropertyAsync(group.Id, "NoteOrder Prop");

        await _adminClient.PostAsJsonAsync($"/api/properties/{prop.Id}/notes", new { content = "First note" });
        await Task.Delay(50); // Ensure different timestamps
        await _adminClient.PostAsJsonAsync($"/api/properties/{prop.Id}/notes", new { content = "Second note" });

        var response = await _adminClient.GetAsync($"/api/properties/{prop.Id}/notes");
        response.EnsureSuccessStatusCode();
        var notes = await response.Content.ReadAsApiJsonAsync<List<PropertyNoteResponse>>();
        Assert.NotNull(notes);
        Assert.Equal(2, notes.Count);
        Assert.Equal("Second note", notes[0].Content); // Most recent first
        Assert.Equal("First note", notes[1].Content);
    }

    [Fact]
    public async Task NoteCreator_CanUpdateOwnNote()
    {
        var userId = await RegisterAndGetUserIdAsync("noteeditor@test.com", "Test1234!", "Note Editor");
        var group = await CreateGroupAsync("NoteEdit Group");
        await AddMemberAsync(group.Id, userId);
        var prop = await CreatePropertyAsync(group.Id, "NoteEdit Prop");

        var memberClient = await CreateAuthenticatedClientAsync("noteeditor@test.com", "Test1234!");
        var createResponse = await memberClient.PostAsJsonAsync($"/api/properties/{prop.Id}/notes", new
        {
            content = "Original note",
        });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var note = await createResponse.Content.ReadAsApiJsonAsync<PropertyNoteResponse>();

        var updateResponse = await memberClient.PutAsJsonAsync($"/api/properties/{prop.Id}/notes/{note!.Id}", new
        {
            content = "Updated note",
        });
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadAsApiJsonAsync<PropertyNoteResponse>();
        Assert.Equal("Updated note", updated!.Content);
    }

    [Fact]
    public async Task NonCreator_CannotUpdateNote_Returns403()
    {
        var creatorId = await RegisterAndGetUserIdAsync("creator@test.com", "Test1234!", "Creator");
        var otherId = await RegisterAndGetUserIdAsync("other2@test.com", "Test1234!", "Other");
        var group = await CreateGroupAsync("NoteAccess Group");
        await AddMemberAsync(group.Id, creatorId);
        await AddMemberAsync(group.Id, otherId);
        var prop = await CreatePropertyAsync(group.Id, "NoteAccess Prop");

        var creatorClient = await CreateAuthenticatedClientAsync("creator@test.com", "Test1234!");
        var createResponse = await creatorClient.PostAsJsonAsync($"/api/properties/{prop.Id}/notes", new
        {
            content = "Creator's note",
        });
        var note = await createResponse.Content.ReadAsApiJsonAsync<PropertyNoteResponse>();

        var otherClient = await CreateAuthenticatedClientAsync("other2@test.com", "Test1234!");
        var updateResponse = await otherClient.PutAsJsonAsync($"/api/properties/{prop.Id}/notes/{note!.Id}", new
        {
            content = "Hijacked!",
        });
        Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);
    }

    [Fact]
    public async Task NoteCreator_DeletesOwnNote_Returns204()
    {
        var userId = await RegisterAndGetUserIdAsync("notedeleter@test.com", "Test1234!", "Note Deleter");
        var group = await CreateGroupAsync("NoteDel Group");
        await AddMemberAsync(group.Id, userId);
        var prop = await CreatePropertyAsync(group.Id, "NoteDel Prop");

        var memberClient = await CreateAuthenticatedClientAsync("notedeleter@test.com", "Test1234!");
        var createResponse = await memberClient.PostAsJsonAsync($"/api/properties/{prop.Id}/notes", new
        {
            content = "To delete",
        });
        var note = await createResponse.Content.ReadAsApiJsonAsync<PropertyNoteResponse>();

        var deleteResponse = await memberClient.DeleteAsync($"/api/properties/{prop.Id}/notes/{note!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }
}
