using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.Telegram;
using GurkanApi.Data;
using Microsoft.Extensions.DependencyInjection;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "Telegram")]
public class TelegramTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _adminClient;

    public TelegramTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _adminClient = factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();
        await _adminClient.LoginAsAsync("admin@gurkan.com", "Admin123!");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetStatus_NoLink_ReturnsUnlinked()
    {
        var response = await _adminClient.GetAsync("/api/telegram/status");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var status = await response.Content.ReadAsApiJsonAsync<TelegramLinkResponse>();
        Assert.False(status!.IsLinked);
    }

    [Fact]
    public async Task Link_InvalidCode_ReturnsBadRequest()
    {
        var response = await _adminClient.PostAsJsonAsync("/api/telegram/link", new { linkCode = "000000" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Link_ValidCode_Succeeds()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.TelegramUserLinks.Add(new GurkanApi.Entities.TelegramUserLink
        {
            TelegramUserId = 12345,
            TelegramUsername = "testuser",
            LinkCode = "123456",
            LinkCodeExpiresAt = DateTime.UtcNow.AddMinutes(10)
        });
        await db.SaveChangesAsync();

        var response = await _adminClient.PostAsJsonAsync("/api/telegram/link", new { linkCode = "123456" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadAsApiJsonAsync<TelegramLinkResponse>();
        Assert.True(result!.IsLinked);
        Assert.Equal(12345, result.TelegramUserId);
    }

    [Fact]
    public async Task Link_ExpiredCode_ReturnsBadRequest()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.TelegramUserLinks.Add(new GurkanApi.Entities.TelegramUserLink
        {
            TelegramUserId = 99999,
            LinkCode = "999999",
            LinkCodeExpiresAt = DateTime.UtcNow.AddMinutes(-1)
        });
        await db.SaveChangesAsync();

        var response = await _adminClient.PostAsJsonAsync("/api/telegram/link", new { linkCode = "999999" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Unlink_NoLink_ReturnsNotFound()
    {
        var response = await _adminClient.DeleteAsync("/api/telegram/link");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task FullLinkUnlinkCycle()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.TelegramUserLinks.Add(new GurkanApi.Entities.TelegramUserLink
        {
            TelegramUserId = 55555,
            TelegramUsername = "cycletest",
            LinkCode = "555555",
            LinkCodeExpiresAt = DateTime.UtcNow.AddMinutes(10)
        });
        await db.SaveChangesAsync();

        var linkResponse = await _adminClient.PostAsJsonAsync("/api/telegram/link", new { linkCode = "555555" });
        Assert.Equal(HttpStatusCode.OK, linkResponse.StatusCode);

        var statusResponse = await _adminClient.GetAsync("/api/telegram/status");
        var status = await statusResponse.Content.ReadAsApiJsonAsync<TelegramLinkResponse>();
        Assert.True(status!.IsLinked);

        var unlinkResponse = await _adminClient.DeleteAsync("/api/telegram/link");
        Assert.Equal(HttpStatusCode.NoContent, unlinkResponse.StatusCode);

        var afterUnlink = await _adminClient.GetAsync("/api/telegram/status");
        var afterStatus = await afterUnlink.Content.ReadAsApiJsonAsync<TelegramLinkResponse>();
        Assert.False(afterStatus!.IsLinked);
    }

    [Fact]
    public async Task Webhook_NoSecret_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/telegram/webhook", new { });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
