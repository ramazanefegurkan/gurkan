using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.Auth;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S01")]
public class AuthTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private HttpClient _client = null!;

    public AuthTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();
        _client = _factory.CreateClient();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task SeedAdmin_Login_ReturnsValidToken()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@gurkan.com",
            password = "Admin123!",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var token = await response.Content.ReadAsApiJsonAsync<TokenResponse>();
        Assert.NotNull(token);
        Assert.False(string.IsNullOrWhiteSpace(token.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(token.RefreshToken));
        Assert.True(token.ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task Login_InvalidCredentials_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@gurkan.com",
            password = "WrongPassword!",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.Content.ReadAsApiJsonAsync<ErrorResponse>();
        Assert.Equal("invalid_credentials", body?.Error);
    }

    [Fact]
    public async Task Register_AsSuperAdmin_CreatesUser()
    {
        await _client.LoginAsAsync("admin@gurkan.com", "Admin123!");

        var registerResponse = await _client.RegisterUserAsync(
            "newuser@test.com", "Test1234!", "New User");

        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);

        var tokenResp = await registerResponse.Content.ReadAsApiJsonAsync<TokenResponse>();
        Assert.NotNull(tokenResp);
        Assert.False(string.IsNullOrWhiteSpace(tokenResp.AccessToken));

        // Verify the new user can log in
        var freshClient = _factory.CreateClient();
        var loginResponse = await freshClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "newuser@test.com",
            password = "Test1234!",
        });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }

    [Fact]
    public async Task Register_AsRegularUser_Returns403()
    {
        await _client.LoginAsAsync("admin@gurkan.com", "Admin123!");
        await _client.RegisterUserAsync("regular@test.com", "Test1234!", "Regular User");

        var userClient = _factory.CreateClient();
        await userClient.LoginAsAsync("regular@test.com", "Test1234!");

        var response = await userClient.RegisterUserAsync(
            "another@test.com", "Test1234!", "Another User");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RefreshToken_ReturnsNewTokenPair()
    {
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@gurkan.com",
            password = "Admin123!",
        });
        var firstToken = await loginResponse.Content.ReadAsApiJsonAsync<TokenResponse>();

        // Refresh
        var refreshResponse = await _client.PostAsJsonAsync("/api/auth/refresh", new
        {
            refreshToken = firstToken!.RefreshToken,
        });

        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);
        var secondToken = await refreshResponse.Content.ReadAsApiJsonAsync<TokenResponse>();
        Assert.NotNull(secondToken);
        Assert.False(string.IsNullOrWhiteSpace(secondToken.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(secondToken.RefreshToken));
        Assert.NotEqual(firstToken.RefreshToken, secondToken.RefreshToken);

        // Reuse old refresh token — should fail (rotation)
        var replayResponse = await _client.PostAsJsonAsync("/api/auth/refresh", new
        {
            refreshToken = firstToken.RefreshToken,
        });

        Assert.Equal(HttpStatusCode.Unauthorized, replayResponse.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_UpdatesPassword()
    {
        await _client.LoginAsAsync("admin@gurkan.com", "Admin123!");

        var changeResponse = await _client.PostAsJsonAsync("/api/auth/change-password", new
        {
            currentPassword = "Admin123!",
            newPassword = "NewAdmin456!",
        });

        Assert.Equal(HttpStatusCode.OK, changeResponse.StatusCode);

        // Old password should fail
        var oldPassClient = _factory.CreateClient();
        var oldLoginResponse = await oldPassClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@gurkan.com",
            password = "Admin123!",
        });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLoginResponse.StatusCode);

        // New password should work
        var newLoginResponse = await oldPassClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@gurkan.com",
            password = "NewAdmin456!",
        });
        Assert.Equal(HttpStatusCode.OK, newLoginResponse.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedEndpoint_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/groups");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private record ErrorResponse(string Error, string Message);
}
