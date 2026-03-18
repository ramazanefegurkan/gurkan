using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using GurkanApi.DTOs.Auth;
using GurkanApi.DTOs.Groups;
using GurkanApi.DTOs.Users;
using GurkanApi.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S01")]
public class GroupAccessTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private HttpClient _adminClient = null!;

    public GroupAccessTests(CustomWebApplicationFactory factory)
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

        // List users to get the ID
        var response = await _adminClient.GetAsync("/api/users");
        response.EnsureSuccessStatusCode();
        var users = await response.Content.ReadAsApiJsonAsync<List<UserResponse>>();
        return users!.First(u => u.Email == email).Id;
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync(string email, string password)
    {
        var client = _factory.CreateClient();
        await client.LoginAsAsync(email, password);
        return client;
    }

    private async Task<GroupResponse> CreateGroupAsync(string name, string? description = null)
    {
        var response = await _adminClient.PostAsJsonAsync("/api/groups", new
        {
            name,
            description,
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadAsApiJsonAsync<GroupResponse>())!;
    }

    private async Task AddMemberAsync(Guid groupId, Guid userId, string role = "Member")
    {
        var response = await _adminClient.PostAsJsonAsync($"/api/groups/{groupId}/members", new
        {
            userId,
            role,
        });
        response.EnsureSuccessStatusCode();
    }

    // ---------- Tests ----------

    [Fact]
    public async Task SuperAdmin_CreatesGroup_Returns201()
    {
        var response = await _adminClient.PostAsJsonAsync("/api/groups", new
        {
            name = "Test Group",
            description = "Integration test group",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var group = await response.Content.ReadAsApiJsonAsync<GroupResponse>();
        Assert.NotNull(group);
        Assert.Equal("Test Group", group.Name);
        Assert.NotEqual(Guid.Empty, group.Id);
    }

    [Fact]
    public async Task SuperAdmin_AddsUserToGroup()
    {
        var userId = await RegisterAndGetUserIdAsync("member1@test.com", "Test1234!", "Member One");
        var group = await CreateGroupAsync("Group A");

        var response = await _adminClient.PostAsJsonAsync($"/api/groups/{group.Id}/members", new
        {
            userId,
            role = "Member",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var member = await response.Content.ReadAsApiJsonAsync<GroupMemberResponse>();
        Assert.NotNull(member);
        Assert.Equal(userId, member.UserId);
    }

    [Fact]
    public async Task GroupMember_SeesOnlyOwnGroups()
    {
        var userId = await RegisterAndGetUserIdAsync("member2@test.com", "Test1234!", "Member Two");
        var group1 = await CreateGroupAsync("Group Alpha");
        var group2 = await CreateGroupAsync("Group Beta");

        await AddMemberAsync(group1.Id, userId);

        var memberClient = await CreateAuthenticatedClientAsync("member2@test.com", "Test1234!");
        var response = await memberClient.GetAsync("/api/groups");
        response.EnsureSuccessStatusCode();
        var groups = await response.Content.ReadAsApiJsonAsync<List<GroupResponse>>();

        Assert.NotNull(groups);
        Assert.Single(groups);
        Assert.Equal("Group Alpha", groups[0].Name);
    }

    [Fact]
    public async Task GroupMember_CannotAccessOtherGroup_Returns403()
    {
        var userId = await RegisterAndGetUserIdAsync("member3@test.com", "Test1234!", "Member Three");
        var group1 = await CreateGroupAsync("Group Mine");
        var group2 = await CreateGroupAsync("Group NotMine");

        await AddMemberAsync(group1.Id, userId);

        var memberClient = await CreateAuthenticatedClientAsync("member3@test.com", "Test1234!");
        var response = await memberClient.GetAsync($"/api/groups/{group2.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SuperAdmin_DelegatesGroupAdmin()
    {
        var userId = await RegisterAndGetUserIdAsync("gadmin@test.com", "Test1234!", "Group Admin User");
        var group = await CreateGroupAsync("AdminGroup");

        await _adminClient.PostAsJsonAsync($"/api/groups/{group.Id}/members", new
        {
            userId,
            role = "Admin",
        });

        var detailResponse = await _adminClient.GetAsync($"/api/groups/{group.Id}");
        detailResponse.EnsureSuccessStatusCode();
        var detail = await detailResponse.Content.ReadAsApiJsonAsync<GroupDetailResponse>();
        Assert.NotNull(detail);
        var member = detail!.Members.FirstOrDefault(m => m.UserId == userId);
        Assert.NotNull(member);
        Assert.Equal("Admin", member!.Role);
    }

    [Fact]
    public async Task GroupAdmin_AddsUserToOwnGroup()
    {
        var adminUserId = await RegisterAndGetUserIdAsync("gadmin2@test.com", "Test1234!", "GA User");
        var newUserId = await RegisterAndGetUserIdAsync("newmember@test.com", "Test1234!", "New Member");
        var group = await CreateGroupAsync("GA Group");

        await AddMemberAsync(group.Id, adminUserId, "Admin");

        var gaClient = await CreateAuthenticatedClientAsync("gadmin2@test.com", "Test1234!");

        var response = await gaClient.PostAsJsonAsync($"/api/groups/{group.Id}/members", new
        {
            userId = newUserId,
            role = "Member",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task GroupAdmin_CannotAccessOtherGroup_Returns403()
    {
        var gaUserId = await RegisterAndGetUserIdAsync("gadmin3@test.com", "Test1234!", "GA User 3");
        var otherUserId = await RegisterAndGetUserIdAsync("other@test.com", "Test1234!", "Other User");

        var ownGroup = await CreateGroupAsync("Own Group");
        var otherGroup = await CreateGroupAsync("Other Group");

        await AddMemberAsync(ownGroup.Id, gaUserId, "Admin");

        var gaClient = await CreateAuthenticatedClientAsync("gadmin3@test.com", "Test1234!");

        var response = await gaClient.PostAsJsonAsync($"/api/groups/{otherGroup.Id}/members", new
        {
            userId = otherUserId,
            role = "Member",
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SuperAdmin_SeesAllGroups()
    {
        await CreateGroupAsync("Group X");
        await CreateGroupAsync("Group Y");
        await CreateGroupAsync("Group Z");

        var response = await _adminClient.GetAsync("/api/groups");
        response.EnsureSuccessStatusCode();
        var groups = await response.Content.ReadAsApiJsonAsync<List<GroupResponse>>();

        Assert.NotNull(groups);
        Assert.True(groups.Count >= 3);
    }

    [Fact]
    public async Task SuperAdmin_SeesAllUsers()
    {
        await RegisterAndGetUserIdAsync("user1@test.com", "Test1234!", "User One");
        await RegisterAndGetUserIdAsync("user2@test.com", "Test1234!", "User Two");

        var response = await _adminClient.GetAsync("/api/users");
        response.EnsureSuccessStatusCode();
        var users = await response.Content.ReadAsApiJsonAsync<List<UserResponse>>();

        Assert.NotNull(users);
        Assert.True(users.Count >= 3);
    }

    [Fact]
    public async Task RegularUser_CannotListUsers_Returns403()
    {
        await RegisterAndGetUserIdAsync("regular2@test.com", "Test1234!", "Regular Joe");

        var userClient = await CreateAuthenticatedClientAsync("regular2@test.com", "Test1234!");
        var response = await userClient.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SuperAdmin_AssignsPropertyToGroup()
    {
        var group = await CreateGroupAsync("PropGroup");

        Guid propertyId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GurkanApi.Data.ApplicationDbContext>();
            var property = new GurkanApi.Entities.Property
            {
                Id = Guid.NewGuid(),
                Name = "Test Property",
                GroupId = null,
            };
            db.Properties.Add(property);
            await db.SaveChangesAsync();
            propertyId = property.Id;
        }

        var response = await _adminClient.PostAsJsonAsync($"/api/groups/{group.Id}/properties", new
        {
            propertyId,
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadAsApiJsonAsync<PropertyAssignmentResponse>();
        Assert.NotNull(body);
        Assert.Equal(propertyId, body.PropertyId);
        Assert.Equal(group.Id, body.GroupId);
    }

    // ---------- Response DTOs for deserialization ----------

    private record GroupDetailResponse(
        Guid Id,
        string Name,
        string? Description,
        DateTime CreatedAt,
        List<MemberDto> Members,
        int PropertyCount);

    private record MemberDto(Guid UserId, string FullName, string Email, string Role, DateTime JoinedAt);

    private record PropertyAssignmentResponse(Guid PropertyId, Guid GroupId);
}
