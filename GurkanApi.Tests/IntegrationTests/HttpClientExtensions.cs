using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using GurkanApi.DTOs.Auth;

namespace GurkanApi.Tests.IntegrationTests;

public static class HttpClientExtensions
{
    /// <summary>
    /// JsonSerializerOptions matching the API's configuration (camelCase + string enums).
    /// </summary>
    public static readonly JsonSerializerOptions ApiJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() },
    };

    /// <summary>
    /// Login via /api/auth/login and set the Authorization header on the client.
    /// Returns the TokenResponse.
    /// </summary>
    public static async Task<TokenResponse> LoginAsAsync(
        this HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();

        var token = await response.Content.ReadFromJsonAsync<TokenResponse>(ApiJsonOptions);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token!.AccessToken);

        return token;
    }

    /// <summary>
    /// Register a new user via /api/auth/register (requires authenticated superadmin).
    /// Returns the raw HttpResponseMessage.
    /// </summary>
    public static async Task<HttpResponseMessage> RegisterUserAsync(
        this HttpClient client, string email, string password, string fullName)
    {
        return await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password,
            fullName,
        });
    }

    /// <summary>
    /// Shortcut: deserialize response body using API-compatible JSON options.
    /// </summary>
    public static async Task<T?> ReadAsApiJsonAsync<T>(this HttpContent content)
    {
        return await content.ReadFromJsonAsync<T>(ApiJsonOptions);
    }
}
