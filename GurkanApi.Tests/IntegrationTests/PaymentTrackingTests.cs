using System.Net;
using System.Net.Http.Json;
using GurkanApi.DTOs.BankAccounts;
using GurkanApi.DTOs.CreditCards;
using GurkanApi.DTOs.Groups;
using GurkanApi.DTOs.Users;
using GurkanApi.Entities;

namespace GurkanApi.Tests.IntegrationTests;

[Trait("Category", "S06")]
public class PaymentTrackingTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;

    private HttpClient _adminClient = null!;
    private Guid _groupAId;
    private Guid _groupBId;
    private Guid _bankAccountId;
    private string _user1Email = "paymentuser1@test.com";
    private string _user2Email = "paymentuser2@test.com";
    private string _password = "Test1234!";

    public PaymentTrackingTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();

        _adminClient = _factory.CreateClient();
        await _adminClient.LoginAsAsync("admin@gurkan.com", "Admin123!");

        var reg1 = await _adminClient.RegisterUserAsync(_user1Email, _password, "Payment User One");
        reg1.EnsureSuccessStatusCode();
        var reg2 = await _adminClient.RegisterUserAsync(_user2Email, _password, "Payment User Two");
        reg2.EnsureSuccessStatusCode();

        var usersResponse = await _adminClient.GetAsync("/api/users");
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.Content.ReadAsApiJsonAsync<List<UserResponse>>();
        var user1Id = users!.First(u => u.Email == _user1Email).Id;
        var user2Id = users!.First(u => u.Email == _user2Email).Id;

        var groupAResponse = await _adminClient.PostAsJsonAsync("/api/groups", new { name = "Payment Group A", description = "Test group A" });
        groupAResponse.EnsureSuccessStatusCode();
        var groupA = await groupAResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupAId = groupA!.Id;

        var groupBResponse = await _adminClient.PostAsJsonAsync("/api/groups", new { name = "Payment Group B", description = "Test group B" });
        groupBResponse.EnsureSuccessStatusCode();
        var groupB = await groupBResponse.Content.ReadAsApiJsonAsync<GroupResponse>();
        _groupBId = groupB!.Id;

        var addMember1 = await _adminClient.PostAsJsonAsync($"/api/groups/{_groupAId}/members", new { userId = user1Id, role = "Member" });
        addMember1.EnsureSuccessStatusCode();
        var addMember2 = await _adminClient.PostAsJsonAsync($"/api/groups/{_groupBId}/members", new { userId = user2Id, role = "Member" });
        addMember2.EnsureSuccessStatusCode();

        var bankResponse = await _adminClient.PostAsJsonAsync("/api/bank-accounts", new
        {
            groupId = _groupAId,
            holderName = "Test Holder",
            bankName = "Test Bank",
            iban = "TR000000000000000000000001",
            description = "Test bank account",
            currency = "TRY",
        });
        bankResponse.EnsureSuccessStatusCode();
        var bank = await bankResponse.Content.ReadAsApiJsonAsync<BankAccountResponse>();
        _bankAccountId = bank!.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<HttpClient> LoginAsUserAsync(string email)
    {
        var client = _factory.CreateClient();
        await client.LoginAsAsync(email, _password);
        return client;
    }

    private async Task<CreditCardResponse> CreateCreditCardAsync(
        HttpClient client, Guid groupId, string name = "Test Card", string bankName = "Test Bank",
        int billingDay = 15, int dueDay = 5, string currency = "TRY")
    {
        var response = await client.PostAsJsonAsync("/api/credit-cards", new
        {
            groupId,
            name,
            bankName,
            billingDay,
            dueDay,
            currency,
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadAsApiJsonAsync<CreditCardResponse>())!;
    }

    private async Task<Guid> CreateBankAccountInGroup(Guid groupId)
    {
        var response = await _adminClient.PostAsJsonAsync("/api/bank-accounts", new
        {
            groupId,
            holderName = "Extra Holder",
            bankName = "Extra Bank",
            currency = "TRY",
        });
        response.EnsureSuccessStatusCode();
        var account = await response.Content.ReadAsApiJsonAsync<BankAccountResponse>();
        return account!.Id;
    }

    [Fact]
    public async Task CreateCreditCard_ReturnsCreated()
    {
        var response = await _adminClient.PostAsJsonAsync("/api/credit-cards", new
        {
            groupId = _groupAId,
            name = "Visa Gold",
            bankName = "Garanti",
            billingDay = 20,
            dueDay = 10,
            currency = "TRY",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var card = await response.Content.ReadAsApiJsonAsync<CreditCardResponse>();
        Assert.NotNull(card);
        Assert.Equal(_groupAId, card.GroupId);
        Assert.Equal("Visa Gold", card.Name);
        Assert.Equal("Garanti", card.BankName);
        Assert.Equal(20, card.BillingDay);
        Assert.Equal(10, card.DueDay);
        Assert.Equal(Currency.TRY, card.Currency);
        Assert.True(card.IsActive);
        Assert.Equal(0m, card.CurrentDebt);
        Assert.NotEqual(default, card.Id);
    }

    [Fact]
    public async Task CreateCreditCard_CrossGroupAccess_Returns403()
    {
        var user2Client = await LoginAsUserAsync(_user2Email);

        var response = await user2Client.PostAsJsonAsync("/api/credit-cards", new
        {
            groupId = _groupAId,
            name = "Forbidden Card",
            bankName = "Forbidden Bank",
            billingDay = 1,
            dueDay = 20,
            currency = "TRY",
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetCreditCards_FiltersByUserGroups()
    {
        var user1Client = await LoginAsUserAsync(_user1Email);
        var user2Client = await LoginAsUserAsync(_user2Email);

        await CreateCreditCardAsync(user1Client, _groupAId, name: "GroupA Card");
        await CreateCreditCardAsync(user2Client, _groupBId, name: "GroupB Card");

        var response = await user1Client.GetAsync("/api/credit-cards");
        response.EnsureSuccessStatusCode();
        var cards = await response.Content.ReadAsApiJsonAsync<List<CreditCardListResponse>>();

        Assert.NotNull(cards);
        Assert.Single(cards);
        Assert.Equal("GroupA Card", cards[0].Name);
    }

    [Fact]
    public async Task UpdateCreditCard_ReturnsOk()
    {
        var card = await CreateCreditCardAsync(_adminClient, _groupAId, name: "Old Name", billingDay: 10);

        var response = await _adminClient.PutAsJsonAsync($"/api/credit-cards/{card.Id}", new
        {
            name = "New Name",
            billingDay = 25,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadAsApiJsonAsync<CreditCardResponse>();
        Assert.NotNull(updated);
        Assert.Equal("New Name", updated.Name);
        Assert.Equal(25, updated.BillingDay);
    }

    [Fact]
    public async Task DeleteCreditCard_ReturnsNoContent()
    {
        var card = await CreateCreditCardAsync(_adminClient, _groupAId, name: "To Delete");

        var deleteResponse = await _adminClient.DeleteAsync($"/api/credit-cards/{card.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await _adminClient.GetAsync($"/api/credit-cards/{card.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task CreateSpending_ReturnsCreated()
    {
        var card = await CreateCreditCardAsync(_adminClient, _groupAId);

        var response = await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/spendings", new
        {
            description = "Market",
            amount = 250.50m,
            date = new DateTime(2026, 3, 10, 0, 0, 0, DateTimeKind.Utc),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var spending = await response.Content.ReadAsApiJsonAsync<CreditCardSpendingResponse>();
        Assert.NotNull(spending);
        Assert.Equal("Market", spending.Description);
        Assert.Equal(250.50m, spending.Amount);
        Assert.Equal(card.Id, spending.CreditCardId);
    }

    [Fact]
    public async Task GetSpendings_ReturnsListForCard()
    {
        var card = await CreateCreditCardAsync(_adminClient, _groupAId);

        await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/spendings", new
        {
            description = "Spending 1",
            amount = 100m,
            date = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
        });

        await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/spendings", new
        {
            description = "Spending 2",
            amount = 200m,
            date = new DateTime(2026, 3, 5, 0, 0, 0, DateTimeKind.Utc),
        });

        var response = await _adminClient.GetAsync($"/api/credit-cards/{card.Id}/spendings");
        response.EnsureSuccessStatusCode();

        var spendings = await response.Content.ReadAsApiJsonAsync<List<CreditCardSpendingResponse>>();
        Assert.NotNull(spendings);
        Assert.Equal(2, spendings.Count);
    }

    [Fact]
    public async Task CreateStatement_ReturnsCreatedWithItemizedBreakdown()
    {
        var card = await CreateCreditCardAsync(_adminClient, _groupAId, billingDay: 28, dueDay: 10);

        await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/spendings", new
        {
            description = "Spending A",
            amount = 100m,
            date = new DateTime(2026, 3, 5, 0, 0, 0, DateTimeKind.Utc),
        });

        await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/spendings", new
        {
            description = "Spending B",
            amount = 50m,
            date = new DateTime(2026, 3, 10, 0, 0, 0, DateTimeKind.Utc),
        });

        var response = await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/statements", new
        {
            totalAmount = 300m,
            month = 3,
            year = 2026,
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var statement = await response.Content.ReadAsApiJsonAsync<CreditCardStatementResponse>();
        Assert.NotNull(statement);
        Assert.Equal(300m, statement.TotalAmount);
        Assert.Equal(150m, statement.ItemizedTotal);
        Assert.Equal(150m, statement.GeneralAmount);
        Assert.Equal(2, statement.ItemizedSpendings.Count);
        Assert.False(statement.IsPaid);
    }

    [Fact]
    public async Task CreateStatement_DuplicateMonth_Returns409()
    {
        var card = await CreateCreditCardAsync(_adminClient, _groupAId, billingDay: 28, dueDay: 10);

        var first = await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/statements", new
        {
            totalAmount = 100m,
            month = 5,
            year = 2026,
        });
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        var second = await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/statements", new
        {
            totalAmount = 200m,
            month = 5,
            year = 2026,
        });

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task CreateStatement_TotalLessThanItemized_Returns400()
    {
        var card = await CreateCreditCardAsync(_adminClient, _groupAId, billingDay: 28, dueDay: 10);

        await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/spendings", new
        {
            description = "Big purchase",
            amount = 200m,
            date = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
        });

        var response = await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/statements", new
        {
            totalAmount = 100m,
            month = 6,
            year = 2026,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PayStatement_MarksAsPaid()
    {
        var card = await CreateCreditCardAsync(_adminClient, _groupAId, billingDay: 28, dueDay: 10);

        var stmtResponse = await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/statements", new
        {
            totalAmount = 500m,
            month = 7,
            year = 2026,
        });
        stmtResponse.EnsureSuccessStatusCode();
        var statement = await stmtResponse.Content.ReadAsApiJsonAsync<CreditCardStatementResponse>();

        var payResponse = await _adminClient.PatchAsync(
            $"/api/credit-cards/{card.Id}/statements/{statement!.Id}/pay",
            JsonContent.Create(new { }));

        Assert.Equal(HttpStatusCode.OK, payResponse.StatusCode);

        var paid = await payResponse.Content.ReadAsApiJsonAsync<CreditCardStatementResponse>();
        Assert.NotNull(paid);
        Assert.True(paid.IsPaid);
        Assert.NotNull(paid.PaidDate);
        Assert.Null(paid.PaidFromBankAccountId);
    }

    [Fact]
    public async Task PayStatement_WithBankAccount_CreatesBankTransaction()
    {
        var card = await CreateCreditCardAsync(_adminClient, _groupAId, billingDay: 28, dueDay: 10);

        await _adminClient.PostAsJsonAsync($"/api/bank-accounts/{_bankAccountId}/transactions", new
        {
            type = "Income",
            description = "Initial deposit",
            amount = 10000m,
            date = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        });

        var stmtResponse = await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/statements", new
        {
            totalAmount = 800m,
            month = 8,
            year = 2026,
        });
        stmtResponse.EnsureSuccessStatusCode();
        var statement = await stmtResponse.Content.ReadAsApiJsonAsync<CreditCardStatementResponse>();

        var payResponse = await _adminClient.PatchAsync(
            $"/api/credit-cards/{card.Id}/statements/{statement!.Id}/pay",
            JsonContent.Create(new { bankAccountId = _bankAccountId }));

        Assert.Equal(HttpStatusCode.OK, payResponse.StatusCode);

        var paid = await payResponse.Content.ReadAsApiJsonAsync<CreditCardStatementResponse>();
        Assert.NotNull(paid);
        Assert.True(paid.IsPaid);
        Assert.Equal(_bankAccountId, paid.PaidFromBankAccountId);

        var txnResponse = await _adminClient.GetAsync($"/api/bank-accounts/{_bankAccountId}/transactions");
        txnResponse.EnsureSuccessStatusCode();
        var transactions = await txnResponse.Content.ReadAsApiJsonAsync<List<BankTransactionResponse>>();
        Assert.NotNull(transactions);

        var ccPayment = transactions.FirstOrDefault(t => t.Type == BankTransactionType.CreditCardPayment);
        Assert.NotNull(ccPayment);
        Assert.Equal(800m, ccPayment.Amount);
        Assert.Equal(statement.Id, ccPayment.RelatedStatementId);

        var balanceResponse = await _adminClient.GetAsync($"/api/bank-accounts/{_bankAccountId}/transactions/balance");
        balanceResponse.EnsureSuccessStatusCode();
        var balance = await balanceResponse.Content.ReadAsApiJsonAsync<BankAccountBalanceResponse>();
        Assert.NotNull(balance);
        Assert.Equal(9200m, balance.Balance);
    }

    [Fact]
    public async Task CreateBankTransaction_Income_ReturnsCreated()
    {
        var response = await _adminClient.PostAsJsonAsync($"/api/bank-accounts/{_bankAccountId}/transactions", new
        {
            type = "Income",
            description = "Rent income",
            amount = 5000m,
            date = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var txn = await response.Content.ReadAsApiJsonAsync<BankTransactionResponse>();
        Assert.NotNull(txn);
        Assert.Equal(BankTransactionType.Income, txn.Type);
        Assert.Equal("Rent income", txn.Description);
        Assert.Equal(5000m, txn.Amount);
        Assert.Equal(_bankAccountId, txn.BankAccountId);
    }

    [Fact]
    public async Task CreateBankTransaction_CreditCardPaymentType_Returns400()
    {
        var response = await _adminClient.PostAsJsonAsync($"/api/bank-accounts/{_bankAccountId}/transactions", new
        {
            type = "CreditCardPayment",
            description = "Manual CC payment",
            amount = 1000m,
            date = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetBalance_ComputesCorrectly()
    {
        await _adminClient.PostAsJsonAsync($"/api/bank-accounts/{_bankAccountId}/transactions", new
        {
            type = "Income",
            description = "Deposit",
            amount = 1000m,
            date = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
        });

        await _adminClient.PostAsJsonAsync($"/api/bank-accounts/{_bankAccountId}/transactions", new
        {
            type = "Expense",
            description = "Withdrawal",
            amount = 300m,
            date = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc),
        });

        var response = await _adminClient.GetAsync($"/api/bank-accounts/{_bankAccountId}/transactions/balance");
        response.EnsureSuccessStatusCode();

        var balance = await response.Content.ReadAsApiJsonAsync<BankAccountBalanceResponse>();
        Assert.NotNull(balance);
        Assert.Equal(700m, balance.Balance);
        Assert.Equal(Currency.TRY, balance.Currency);
    }

    [Fact]
    public async Task UpdateCreditCardPaymentTransaction_Returns400()
    {
        var card = await CreateCreditCardAsync(_adminClient, _groupAId, billingDay: 28, dueDay: 10);

        var stmtResponse = await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/statements", new
        {
            totalAmount = 400m,
            month = 9,
            year = 2026,
        });
        stmtResponse.EnsureSuccessStatusCode();
        var statement = await stmtResponse.Content.ReadAsApiJsonAsync<CreditCardStatementResponse>();

        await _adminClient.PatchAsync(
            $"/api/credit-cards/{card.Id}/statements/{statement!.Id}/pay",
            JsonContent.Create(new { bankAccountId = _bankAccountId }));

        var txnResponse = await _adminClient.GetAsync($"/api/bank-accounts/{_bankAccountId}/transactions");
        txnResponse.EnsureSuccessStatusCode();
        var transactions = await txnResponse.Content.ReadAsApiJsonAsync<List<BankTransactionResponse>>();
        var ccPayment = transactions!.First(t => t.Type == BankTransactionType.CreditCardPayment);

        var updateResponse = await _adminClient.PutAsJsonAsync(
            $"/api/bank-accounts/{_bankAccountId}/transactions/{ccPayment.Id}",
            new { description = "Tampered" });

        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteCreditCardPaymentTransaction_Returns400()
    {
        var card = await CreateCreditCardAsync(_adminClient, _groupAId, billingDay: 28, dueDay: 10);

        var stmtResponse = await _adminClient.PostAsJsonAsync($"/api/credit-cards/{card.Id}/statements", new
        {
            totalAmount = 600m,
            month = 10,
            year = 2026,
        });
        stmtResponse.EnsureSuccessStatusCode();
        var statement = await stmtResponse.Content.ReadAsApiJsonAsync<CreditCardStatementResponse>();

        await _adminClient.PatchAsync(
            $"/api/credit-cards/{card.Id}/statements/{statement!.Id}/pay",
            JsonContent.Create(new { bankAccountId = _bankAccountId }));

        var txnResponse = await _adminClient.GetAsync($"/api/bank-accounts/{_bankAccountId}/transactions");
        txnResponse.EnsureSuccessStatusCode();
        var transactions = await txnResponse.Content.ReadAsApiJsonAsync<List<BankTransactionResponse>>();
        var ccPayment = transactions!.First(t => t.Type == BankTransactionType.CreditCardPayment);

        var deleteResponse = await _adminClient.DeleteAsync(
            $"/api/bank-accounts/{_bankAccountId}/transactions/{ccPayment.Id}");

        Assert.Equal(HttpStatusCode.BadRequest, deleteResponse.StatusCode);
    }
}
