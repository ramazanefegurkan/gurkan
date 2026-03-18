using System.Net;
using System.Net.Http.Json;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S06")]
public class DeviceTokenAndPushTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private HttpClient _adminClient = null!;

    private const string ValidToken = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
    private const string ValidToken2 = "ExpoPushToken[yyyyyyyyyyyyyyyyyyyyyy]";

    public DeviceTokenAndPushTests(CustomWebApplicationFactory factory)
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

    // =====================================================================
    //  Device Token Registration
    // =====================================================================

    [Fact]
    public async Task RegisterToken_Returns200_And_StoresInDb()
    {
        var response = await _adminClient.PostAsJsonAsync("/api/device-tokens", new
        {
            expoPushToken = ValidToken,
            platform = "android",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsApiJsonAsync<DeviceTokenResponse>();
        Assert.NotNull(body);
        Assert.Equal(ValidToken, body.ExpoPushToken);
        Assert.Equal("android", body.Platform);
        Assert.NotEqual(Guid.Empty, body.Id);
        Assert.NotEqual(Guid.Empty, body.UserId);
    }

    [Fact]
    public async Task RegisterSameTokenTwice_Upserts_OnlyOneRecord()
    {
        // Register first time
        var response1 = await _adminClient.PostAsJsonAsync("/api/device-tokens", new
        {
            expoPushToken = ValidToken,
            platform = "ios",
        });
        Assert.Equal(HttpStatusCode.OK, response1.StatusCode);
        var first = await response1.Content.ReadAsApiJsonAsync<DeviceTokenResponse>();

        // Register second time (same token)
        var response2 = await _adminClient.PostAsJsonAsync("/api/device-tokens", new
        {
            expoPushToken = ValidToken,
            platform = "ios",
        });
        Assert.Equal(HttpStatusCode.OK, response2.StatusCode);
        var second = await response2.Content.ReadAsApiJsonAsync<DeviceTokenResponse>();

        // Same record ID (upsert, not duplicate)
        Assert.Equal(first!.Id, second!.Id);
    }

    [Fact]
    public async Task RegisterToken_InvalidFormat_Returns400()
    {
        var response = await _adminClient.PostAsJsonAsync("/api/device-tokens", new
        {
            expoPushToken = "invalid-token-format",
            platform = "android",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // =====================================================================
    //  Device Token Unregistration
    // =====================================================================

    [Fact]
    public async Task UnregisterToken_Returns204()
    {
        // Register first
        await _adminClient.PostAsJsonAsync("/api/device-tokens", new
        {
            expoPushToken = ValidToken,
            platform = "android",
        });

        // Unregister
        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/device-tokens")
        {
            Content = JsonContent.Create(new { expoPushToken = ValidToken }),
        };
        var response = await _adminClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UnregisterNonExistentToken_Returns404()
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/device-tokens")
        {
            Content = JsonContent.Create(new { expoPushToken = ValidToken2 }),
        };
        var response = await _adminClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // =====================================================================
    //  Push Trigger
    // =====================================================================

    [Fact]
    public async Task PushTrigger_NoTokens_Returns200WithMessage()
    {
        // Don't register any device tokens
        var response = await _adminClient.PostAsync("/api/push/trigger", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsApiJsonAsync<PushTriggerResponse>();
        Assert.NotNull(body);
        Assert.Equal("No device tokens registered", body.Message);
    }

    [Fact]
    public async Task PushTrigger_WithToken_Returns200WithResults()
    {
        // Register a fake token
        await _adminClient.PostAsJsonAsync("/api/device-tokens", new
        {
            expoPushToken = ValidToken,
            platform = "android",
        });

        // Trigger push — the Expo API call will fail with a fake token,
        // but the endpoint should not throw; it returns a structured response.
        var response = await _adminClient.PostAsync("/api/push/trigger", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsApiJsonAsync<PushTriggerResponse>();
        Assert.NotNull(body);
        // Either "Push notifications sent" or "No notifications to push" depending on test data
        Assert.NotNull(body.Message);
        Assert.NotNull(body.Results);
    }

    // =====================================================================
    //  Response DTOs for deserialization
    // =====================================================================

    private sealed class DeviceTokenResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string ExpoPushToken { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    private sealed class PushTriggerResponse
    {
        public string Message { get; set; } = string.Empty;
        public object[]? Results { get; set; }
    }
}
