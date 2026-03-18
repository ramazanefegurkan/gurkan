using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.Documents;
using GurkanApi.DTOs.Groups;
using GurkanApi.DTOs.Properties;
using GurkanApi.DTOs.Users;
using GurkanApi.Entities;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S05")]
public class DocumentTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;

    private HttpClient _adminClient = null!;
    private Guid _groupAId;
    private Guid _groupBId;
    private Guid _propertyAId;
    private string _user1Email = "docuser1@test.com";
    private string _user2Email = "docuser2@test.com";
    private string _password = "Test1234!";

    public DocumentTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();

        _adminClient = _factory.CreateClient();
        await _adminClient.LoginAsAsync("admin@gurkan.com", "Admin123!");

        // Register two users
        var reg1 = await _adminClient.RegisterUserAsync(_user1Email, _password, "Doc User One");
        reg1.EnsureSuccessStatusCode();
        var reg2 = await _adminClient.RegisterUserAsync(_user2Email, _password, "Doc User Two");
        reg2.EnsureSuccessStatusCode();

        // Get user IDs
        var usersResponse = await _adminClient.GetAsync("/api/users");
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.Content.ReadAsApiJsonAsync<List<UserResponse>>();
        var user1Id = users!.First(u => u.Email == _user1Email).Id;
        var user2Id = users!.First(u => u.Email == _user2Email).Id;

        // Create two groups
        var groupAResponse = await _adminClient.PostAsJsonAsync("/api/groups", new { name = "Doc Group A", description = "Test group A" });
        groupAResponse.EnsureSuccessStatusCode();
        var groupA = await groupAResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupAId = groupA!.Id;

        var groupBResponse = await _adminClient.PostAsJsonAsync("/api/groups", new { name = "Doc Group B", description = "Test group B" });
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
            name = "Doc Test Apartment",
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
            description = "Test property for documents",
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

    private static MultipartFormDataContent CreateMultipartContent(
        string fileName, string contentType, byte[] content, DocumentCategory category)
    {
        var multipart = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(content);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
        multipart.Add(fileContent, "file", fileName);
        multipart.Add(new StringContent(category.ToString()), "category");
        return multipart;
    }

    private async Task<Guid> CreatePropertyInGroupAsync(Guid groupId, string name = "Extra Property")
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
            currency = "TRY",
            description = "Extra property",
            groupId,
        });
        response.EnsureSuccessStatusCode();
        var prop = await response.Content.ReadAsApiJsonAsync<PropertyResponse>();
        return prop!.Id;
    }

    // =====================================================================
    //  Upload
    // =====================================================================

    [Fact]
    public async Task UploadDocument_ValidFile_Returns201()
    {
        var content = CreateMultipartContent("test-document.pdf", "application/pdf",
            "fake PDF content for testing"u8.ToArray(), DocumentCategory.Contract);

        var response = await _adminClient.PostAsync(
            $"/api/properties/{_propertyAId}/documents", content);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var doc = await response.Content.ReadAsApiJsonAsync<DocumentResponse>();
        Assert.NotNull(doc);
        Assert.Equal("test-document.pdf", doc.OriginalFileName);
        Assert.Equal(DocumentCategory.Contract, doc.Category);
        Assert.Equal("application/pdf", doc.ContentType);
        Assert.True(doc.FileSize > 0);
        Assert.Equal(_propertyAId, doc.PropertyId);
        Assert.NotEqual(Guid.Empty, doc.UploadedBy);
    }

    // =====================================================================
    //  List
    // =====================================================================

    [Fact]
    public async Task ListDocuments_ReturnsUploadedFiles()
    {
        // Upload 2 files
        var content1 = CreateMultipartContent("file1.pdf", "application/pdf",
            "first file"u8.ToArray(), DocumentCategory.TitleDeed);
        var upload1 = await _adminClient.PostAsync(
            $"/api/properties/{_propertyAId}/documents", content1);
        upload1.EnsureSuccessStatusCode();

        // Small delay so UploadedAt differs
        await Task.Delay(50);

        var content2 = CreateMultipartContent("file2.jpg", "image/jpeg",
            "second file"u8.ToArray(), DocumentCategory.Photo);
        var upload2 = await _adminClient.PostAsync(
            $"/api/properties/{_propertyAId}/documents", content2);
        upload2.EnsureSuccessStatusCode();

        // List
        var listResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/documents");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        var docs = await listResponse.Content.ReadAsApiJsonAsync<List<DocumentResponse>>();
        Assert.NotNull(docs);
        Assert.Equal(2, docs.Count);
        // Newest first
        Assert.Equal("file2.jpg", docs[0].OriginalFileName);
        Assert.Equal("file1.pdf", docs[1].OriginalFileName);
    }

    // =====================================================================
    //  Download
    // =====================================================================

    [Fact]
    public async Task DownloadDocument_ReturnsFileContent()
    {
        var originalBytes = "known content for download test"u8.ToArray();
        var content = CreateMultipartContent("download-test.pdf", "application/pdf",
            originalBytes, DocumentCategory.Invoice);

        var uploadResponse = await _adminClient.PostAsync(
            $"/api/properties/{_propertyAId}/documents", content);
        uploadResponse.EnsureSuccessStatusCode();
        var doc = await uploadResponse.Content.ReadAsApiJsonAsync<DocumentResponse>();

        // Download
        var downloadResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/documents/{doc!.Id}/download");

        Assert.Equal(HttpStatusCode.OK, downloadResponse.StatusCode);

        var downloadedBytes = await downloadResponse.Content.ReadAsByteArrayAsync();
        Assert.Equal(originalBytes, downloadedBytes);

        // Verify Content-Disposition header
        Assert.Equal("download-test.pdf", downloadResponse.Content.Headers.ContentDisposition?.FileName?.Trim('"'));
    }

    // =====================================================================
    //  Delete
    // =====================================================================

    [Fact]
    public async Task DeleteDocument_Removes_Returns204()
    {
        var content = CreateMultipartContent("delete-test.pdf", "application/pdf",
            "content to delete"u8.ToArray(), DocumentCategory.Insurance);

        var uploadResponse = await _adminClient.PostAsync(
            $"/api/properties/{_propertyAId}/documents", content);
        uploadResponse.EnsureSuccessStatusCode();
        var doc = await uploadResponse.Content.ReadAsApiJsonAsync<DocumentResponse>();

        // Delete
        var deleteResponse = await _adminClient.DeleteAsync(
            $"/api/properties/{_propertyAId}/documents/{doc!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Verify list is now empty
        var listResponse = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/documents");
        var docs = await listResponse.Content.ReadAsApiJsonAsync<List<DocumentResponse>>();
        Assert.Empty(docs!);
    }

    // =====================================================================
    //  Invalid Extension
    // =====================================================================

    [Fact]
    public async Task UploadDocument_InvalidExtension_Returns400()
    {
        var content = CreateMultipartContent("malware.exe", "application/octet-stream",
            "evil bytes"u8.ToArray(), DocumentCategory.Other);

        var response = await _adminClient.PostAsync(
            $"/api/properties/{_propertyAId}/documents", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // =====================================================================
    //  Cross-Group Access
    // =====================================================================

    [Fact]
    public async Task CrossGroupAccess_Returns403()
    {
        var groupBPropertyId = await CreatePropertyInGroupAsync(_groupBId, "GroupB Doc Property");

        // Login as user1 (member of groupA, NOT groupB)
        var user1Client = await LoginAsUserAsync(_user1Email);

        // Try upload
        var uploadContent = CreateMultipartContent("forbidden.pdf", "application/pdf",
            "forbidden"u8.ToArray(), DocumentCategory.Other);
        var uploadResponse = await user1Client.PostAsync(
            $"/api/properties/{groupBPropertyId}/documents", uploadContent);
        Assert.Equal(HttpStatusCode.Forbidden, uploadResponse.StatusCode);

        // Try list
        var listResponse = await user1Client.GetAsync(
            $"/api/properties/{groupBPropertyId}/documents");
        Assert.Equal(HttpStatusCode.Forbidden, listResponse.StatusCode);

        // Try download with a random ID
        var downloadResponse = await user1Client.GetAsync(
            $"/api/properties/{groupBPropertyId}/documents/{Guid.NewGuid()}/download");
        Assert.Equal(HttpStatusCode.Forbidden, downloadResponse.StatusCode);
    }

    // =====================================================================
    //  Download Not Found
    // =====================================================================

    [Fact]
    public async Task DownloadDocument_NotFound_Returns404()
    {
        var response = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/documents/{Guid.NewGuid()}/download");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // =====================================================================
    //  Filter by Category
    // =====================================================================

    [Fact]
    public async Task ListDocuments_FilterByCategory_ReturnsFiltered()
    {
        // Upload files with different categories
        var content1 = CreateMultipartContent("contract1.pdf", "application/pdf",
            "contract1"u8.ToArray(), DocumentCategory.Contract);
        await _adminClient.PostAsync(
            $"/api/properties/{_propertyAId}/documents", content1);

        var content2 = CreateMultipartContent("photo1.jpg", "image/jpeg",
            "photo1"u8.ToArray(), DocumentCategory.Photo);
        await _adminClient.PostAsync(
            $"/api/properties/{_propertyAId}/documents", content2);

        var content3 = CreateMultipartContent("contract2.pdf", "application/pdf",
            "contract2"u8.ToArray(), DocumentCategory.Contract);
        await _adminClient.PostAsync(
            $"/api/properties/{_propertyAId}/documents", content3);

        // Filter by Contract
        var response = await _adminClient.GetAsync(
            $"/api/properties/{_propertyAId}/documents?category=Contract");
        response.EnsureSuccessStatusCode();

        var docs = await response.Content.ReadAsApiJsonAsync<List<DocumentResponse>>();
        Assert.NotNull(docs);
        Assert.Equal(2, docs.Count);
        Assert.All(docs, d => Assert.Equal(DocumentCategory.Contract, d.Category));
    }
}
