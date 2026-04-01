# Payment Tracking Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a group-level payment tracking module with credit card debt tracking (spendings, statements, payments) and bank account balance tracking (income/expense transactions), plus billing cycle and payment due notifications.

**Architecture:** New entities (CreditCard, CreditCardSpending, CreditCardStatement, BankTransaction) with group-level access control via existing IGroupAccessService. Notifications computed dynamically via extended NotificationComputeService. Web UI with dedicated /payments section.

**Tech Stack:** .NET 10 Web API, EF Core + PostgreSQL, React 19 + Vite, TypeScript, custom CSS

**Spec:** `docs/superpowers/specs/2026-04-01-payment-tracking-design.md`

**IMPORTANT:** Tasks 1-6 must be implemented as a batch before running `dotnet build`. Individual tasks between 1-5 will not compile until the migration in Task 6 is complete.

---

### Task 1: Add BankTransactionType enum and Currency to BankAccount

**Files:**
- Modify: `GurkanApi/Entities/Enums.cs`
- Modify: `GurkanApi/Entities/BankAccount.cs`

- [ ] **Step 1: Add BankTransactionType enum to Enums.cs**

Add after the `SubscriptionHolderType` enum (line 92):

```csharp
public enum BankTransactionType
{
    Income,
    Expense,
    CreditCardPayment
}
```

- [ ] **Step 2: Add Currency field to BankAccount entity**

Add `Currency` property to `BankAccount.cs` after `Description`:

```csharp
public Currency Currency { get; set; }
```

- [ ] **Step 3: Register Currency in ApplicationDbContext BankAccount config**

In `GurkanApi/Data/ApplicationDbContext.cs`, inside the BankAccount entity configuration (after line 370 `entity.Property(ba => ba.Description).HasMaxLength(500);`), add:

```csharp
entity.Property(ba => ba.Currency)
      .HasConversion<string>()
      .HasMaxLength(10)
      .HasDefaultValue(Currency.TRY);
```

- [ ] **Step 4: Update BankAccountResponse DTO**

In `GurkanApi/DTOs/BankAccounts/BankAccountResponse.cs`, add:

```csharp
public Currency Currency { get; set; }
```

- [ ] **Step 5: Update CreateBankAccountRequest and UpdateBankAccountRequest**

In `GurkanApi/DTOs/BankAccounts/CreateBankAccountRequest.cs`, add:
```csharp
[Required]
public Currency Currency { get; set; }
```

In `GurkanApi/DTOs/BankAccounts/UpdateBankAccountRequest.cs`, add:
```csharp
public Currency? Currency { get; set; }
```

- [ ] **Step 6: Update BankAccountsController MapResponse and Create/Update methods**

In `MapResponse` add `Currency = ba.Currency`.
In `Create` method, add `Currency = request.Currency` to entity initialization.
In `Update` method, add `if (request.Currency.HasValue) account.Currency = request.Currency.Value;`.

- [ ] **Step 5: Commit**

```bash
git add GurkanApi/Entities/Enums.cs GurkanApi/Entities/BankAccount.cs GurkanApi/Data/ApplicationDbContext.cs GurkanApi/DTOs/BankAccounts/ GurkanApi/Controllers/BankAccountsController.cs
git commit -m "feat: add BankTransactionType enum and Currency to BankAccount"
```

---

### Task 2: Create CreditCard entity

**Files:**
- Create: `GurkanApi/Entities/CreditCard.cs`

- [ ] **Step 1: Create entity file**

```csharp
namespace GurkanApi.Entities;

public class CreditCard
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public int BillingDay { get; set; }
    public int DueDay { get; set; }
    public Currency Currency { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public Group Group { get; set; } = null!;
}
```

- [ ] **Step 2: Commit**

```bash
git add GurkanApi/Entities/CreditCard.cs
git commit -m "feat: add CreditCard entity"
```

---

### Task 3: Create CreditCardSpending entity

**Files:**
- Create: `GurkanApi/Entities/CreditCardSpending.cs`

- [ ] **Step 1: Create entity file**

```csharp
namespace GurkanApi.Entities;

public class CreditCardSpending
{
    public Guid Id { get; set; }
    public Guid CreditCardId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; }

    public CreditCard CreditCard { get; set; } = null!;
}
```

- [ ] **Step 2: Commit**

```bash
git add GurkanApi/Entities/CreditCardSpending.cs
git commit -m "feat: add CreditCardSpending entity"
```

---

### Task 4: Create CreditCardStatement entity

**Files:**
- Create: `GurkanApi/Entities/CreditCardStatement.cs`

- [ ] **Step 1: Create entity file**

```csharp
namespace GurkanApi.Entities;

public class CreditCardStatement
{
    public Guid Id { get; set; }
    public Guid CreditCardId { get; set; }
    public DateTime StatementDate { get; set; }
    public DateTime DueDate { get; set; }
    public decimal TotalAmount { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaidDate { get; set; }
    public Guid? PaidFromBankAccountId { get; set; }
    public DateTime CreatedAt { get; set; }

    public CreditCard CreditCard { get; set; } = null!;
    public BankAccount? PaidFromBankAccount { get; set; }
}
```

- [ ] **Step 2: Commit**

```bash
git add GurkanApi/Entities/CreditCardStatement.cs
git commit -m "feat: add CreditCardStatement entity"
```

---

### Task 5: Create BankTransaction entity

**Files:**
- Create: `GurkanApi/Entities/BankTransaction.cs`

- [ ] **Step 1: Create entity file**

```csharp
namespace GurkanApi.Entities;

public class BankTransaction
{
    public Guid Id { get; set; }
    public Guid BankAccountId { get; set; }
    public BankTransactionType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public Guid? RelatedStatementId { get; set; }
    public DateTime CreatedAt { get; set; }

    public BankAccount BankAccount { get; set; } = null!;
    public CreditCardStatement? RelatedStatement { get; set; }
}
```

- [ ] **Step 2: Commit**

```bash
git add GurkanApi/Entities/BankTransaction.cs
git commit -m "feat: add BankTransaction entity"
```

---

### Task 6: Register entities in ApplicationDbContext and create migration

**Files:**
- Modify: `GurkanApi/Data/ApplicationDbContext.cs`

- [ ] **Step 1: Add DbSet properties**

After line 31 (`public DbSet<TelegramUserLink> TelegramUserLinks => Set<TelegramUserLink>();`), add:

```csharp
public DbSet<CreditCard> CreditCards => Set<CreditCard>();
public DbSet<CreditCardSpending> CreditCardSpendings => Set<CreditCardSpending>();
public DbSet<CreditCardStatement> CreditCardStatements => Set<CreditCardStatement>();
public DbSet<BankTransaction> BankTransactions => Set<BankTransaction>();
```

- [ ] **Step 2: Add CreditCard configuration**

Add before the TelegramUserLink section:

```csharp
// ---------- CreditCard ----------
modelBuilder.Entity<CreditCard>(entity =>
{
    entity.HasKey(cc => cc.Id);
    entity.Property(cc => cc.Name).IsRequired().HasMaxLength(200);
    entity.Property(cc => cc.BankName).IsRequired().HasMaxLength(200);
    entity.Property(cc => cc.Currency)
          .HasConversion<string>()
          .HasMaxLength(10);
    entity.Property(cc => cc.CreatedAt)
          .HasDefaultValueSql("now() at time zone 'utc'");

    entity.HasOne(cc => cc.Group)
          .WithMany()
          .HasForeignKey(cc => cc.GroupId)
          .OnDelete(DeleteBehavior.Cascade);
});
```

- [ ] **Step 3: Add CreditCardSpending configuration**

```csharp
// ---------- CreditCardSpending ----------
modelBuilder.Entity<CreditCardSpending>(entity =>
{
    entity.HasKey(cs => cs.Id);
    entity.Property(cs => cs.Description).IsRequired().HasMaxLength(500);
    entity.Property(cs => cs.Amount).HasColumnType("decimal(18,2)");
    entity.Property(cs => cs.CreatedAt)
          .HasDefaultValueSql("now() at time zone 'utc'");

    entity.HasOne(cs => cs.CreditCard)
          .WithMany()
          .HasForeignKey(cs => cs.CreditCardId)
          .OnDelete(DeleteBehavior.Cascade);
});
```

- [ ] **Step 4: Add CreditCardStatement configuration**

```csharp
// ---------- CreditCardStatement ----------
modelBuilder.Entity<CreditCardStatement>(entity =>
{
    entity.HasKey(s => s.Id);
    entity.Property(s => s.TotalAmount).HasColumnType("decimal(18,2)");
    entity.Property(s => s.CreatedAt)
          .HasDefaultValueSql("now() at time zone 'utc'");

    entity.HasIndex(s => new { s.CreditCardId, s.StatementDate }).IsUnique();

    entity.HasOne(s => s.CreditCard)
          .WithMany()
          .HasForeignKey(s => s.CreditCardId)
          .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(s => s.PaidFromBankAccount)
          .WithMany()
          .HasForeignKey(s => s.PaidFromBankAccountId)
          .OnDelete(DeleteBehavior.SetNull);
});
```

- [ ] **Step 5: Add BankTransaction configuration**

```csharp
// ---------- BankTransaction ----------
modelBuilder.Entity<BankTransaction>(entity =>
{
    entity.HasKey(bt => bt.Id);
    entity.Property(bt => bt.Description).IsRequired().HasMaxLength(500);
    entity.Property(bt => bt.Amount).HasColumnType("decimal(18,2)");
    entity.Property(bt => bt.Type)
          .HasConversion<string>()
          .HasMaxLength(50);
    entity.Property(bt => bt.CreatedAt)
          .HasDefaultValueSql("now() at time zone 'utc'");

    entity.HasOne(bt => bt.BankAccount)
          .WithMany()
          .HasForeignKey(bt => bt.BankAccountId)
          .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(bt => bt.RelatedStatement)
          .WithMany()
          .HasForeignKey(bt => bt.RelatedStatementId)
          .OnDelete(DeleteBehavior.Cascade);
});
```

- [ ] **Step 6: Create and apply migration**

```bash
cd GurkanApi
dotnet ef migrations add AddPaymentTracking
dotnet ef database update
```

- [ ] **Step 7: Verify migration applied cleanly**

```bash
dotnet build
```

- [ ] **Step 8: Commit**

```bash
git add GurkanApi/Data/ApplicationDbContext.cs GurkanApi/Migrations/
git commit -m "feat: register payment tracking entities and create migration"
```

---

### Task 7: Create CreditCard DTOs

**Files:**
- Create: `GurkanApi/DTOs/CreditCards/CreateCreditCardRequest.cs`
- Create: `GurkanApi/DTOs/CreditCards/UpdateCreditCardRequest.cs`
- Create: `GurkanApi/DTOs/CreditCards/CreditCardResponse.cs`
- Create: `GurkanApi/DTOs/CreditCards/CreditCardListResponse.cs`

- [ ] **Step 1: Create DTOs directory and files**

`CreateCreditCardRequest.cs`:
```csharp
using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.CreditCards;

public class CreateCreditCardRequest
{
    [Required]
    public Guid GroupId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string BankName { get; set; } = string.Empty;

    [Required]
    [Range(1, 31)]
    public int BillingDay { get; set; }

    [Required]
    [Range(1, 31)]
    public int DueDay { get; set; }

    [Required]
    public Currency Currency { get; set; }
}
```

`UpdateCreditCardRequest.cs`:
```csharp
using GurkanApi.Entities;

namespace GurkanApi.DTOs.CreditCards;

public class UpdateCreditCardRequest
{
    public string? Name { get; set; }
    public string? BankName { get; set; }
    public int? BillingDay { get; set; }
    public int? DueDay { get; set; }
    public Currency? Currency { get; set; }
    public bool? IsActive { get; set; }
}
```

`CreditCardResponse.cs`:
```csharp
using GurkanApi.Entities;

namespace GurkanApi.DTOs.CreditCards;

public class CreditCardResponse
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public int BillingDay { get; set; }
    public int DueDay { get; set; }
    public Currency Currency { get; set; }
    public bool IsActive { get; set; }
    public decimal CurrentDebt { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

`CreditCardListResponse.cs`:
```csharp
using GurkanApi.Entities;

namespace GurkanApi.DTOs.CreditCards;

public class CreditCardListResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public Currency Currency { get; set; }
    public bool IsActive { get; set; }
    public decimal CurrentDebt { get; set; }
}
```

- [ ] **Step 2: Commit**

```bash
git add GurkanApi/DTOs/CreditCards/
git commit -m "feat: add CreditCard DTOs"
```

---

### Task 8: Create CreditCardSpending and CreditCardStatement DTOs

**Files:**
- Create: `GurkanApi/DTOs/CreditCards/CreateCreditCardSpendingRequest.cs`
- Create: `GurkanApi/DTOs/CreditCards/UpdateCreditCardSpendingRequest.cs`
- Create: `GurkanApi/DTOs/CreditCards/CreditCardSpendingResponse.cs`
- Create: `GurkanApi/DTOs/CreditCards/CreateStatementRequest.cs`
- Create: `GurkanApi/DTOs/CreditCards/PayStatementRequest.cs`
- Create: `GurkanApi/DTOs/CreditCards/CreditCardStatementResponse.cs`

- [ ] **Step 1: Create spending DTOs**

`CreateCreditCardSpendingRequest.cs`:
```csharp
using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.CreditCards;

public class CreateCreditCardSpendingRequest
{
    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    public DateTime Date { get; set; }
}
```

`UpdateCreditCardSpendingRequest.cs`:
```csharp
namespace GurkanApi.DTOs.CreditCards;

public class UpdateCreditCardSpendingRequest
{
    public string? Description { get; set; }
    public decimal? Amount { get; set; }
    public DateTime? Date { get; set; }
}
```

`CreditCardSpendingResponse.cs`:
```csharp
namespace GurkanApi.DTOs.CreditCards;

public class CreditCardSpendingResponse
{
    public Guid Id { get; set; }
    public Guid CreditCardId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

- [ ] **Step 2: Create statement DTOs**

`CreateStatementRequest.cs`:
```csharp
using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.CreditCards;

public class CreateStatementRequest
{
    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal TotalAmount { get; set; }

    public int? Month { get; set; }
    public int? Year { get; set; }
}
```

`PayStatementRequest.cs`:
```csharp
namespace GurkanApi.DTOs.CreditCards;

public class PayStatementRequest
{
    public Guid? BankAccountId { get; set; }
}
```

`CreditCardStatementResponse.cs`:
```csharp
using GurkanApi.Entities;

namespace GurkanApi.DTOs.CreditCards;

public class CreditCardStatementResponse
{
    public Guid Id { get; set; }
    public Guid CreditCardId { get; set; }
    public DateTime StatementDate { get; set; }
    public DateTime DueDate { get; set; }
    public decimal TotalAmount { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaidDate { get; set; }
    public Guid? PaidFromBankAccountId { get; set; }
    public decimal ItemizedTotal { get; set; }
    public decimal GeneralAmount { get; set; }
    public List<CreditCardSpendingResponse> ItemizedSpendings { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}
```

- [ ] **Step 3: Commit**

```bash
git add GurkanApi/DTOs/CreditCards/
git commit -m "feat: add CreditCardSpending and CreditCardStatement DTOs"
```

---

### Task 9: Create BankTransaction DTOs

**Files:**
- Create: `GurkanApi/DTOs/BankAccounts/CreateBankTransactionRequest.cs`
- Create: `GurkanApi/DTOs/BankAccounts/UpdateBankTransactionRequest.cs`
- Create: `GurkanApi/DTOs/BankAccounts/BankTransactionResponse.cs`
- Create: `GurkanApi/DTOs/BankAccounts/BankAccountBalanceResponse.cs`

- [ ] **Step 1: Create DTOs**

`CreateBankTransactionRequest.cs`:
```csharp
using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.BankAccounts;

public class CreateBankTransactionRequest
{
    [Required]
    public BankTransactionType Type { get; set; }

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    public DateTime Date { get; set; }
}
```

`UpdateBankTransactionRequest.cs`:
```csharp
using GurkanApi.Entities;

namespace GurkanApi.DTOs.BankAccounts;

public class UpdateBankTransactionRequest
{
    public BankTransactionType? Type { get; set; }
    public string? Description { get; set; }
    public decimal? Amount { get; set; }
    public DateTime? Date { get; set; }
}
```

`BankTransactionResponse.cs`:
```csharp
using GurkanApi.Entities;

namespace GurkanApi.DTOs.BankAccounts;

public class BankTransactionResponse
{
    public Guid Id { get; set; }
    public Guid BankAccountId { get; set; }
    public BankTransactionType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public Guid? RelatedStatementId { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

`BankAccountBalanceResponse.cs`:
```csharp
using GurkanApi.Entities;

namespace GurkanApi.DTOs.BankAccounts;

public class BankAccountBalanceResponse
{
    public Guid BankAccountId { get; set; }
    public decimal Balance { get; set; }
    public Currency Currency { get; set; }
}
```

- [ ] **Step 2: Commit**

```bash
git add GurkanApi/DTOs/BankAccounts/
git commit -m "feat: add BankTransaction DTOs"
```

---

### Task 10: Create CreditCardsController

**Files:**
- Create: `GurkanApi/Controllers/CreditCardsController.cs`

- [ ] **Step 1: Create controller with CRUD + debt computation**

Follow the BankAccountsController pattern for group-level access. Inject `ApplicationDbContext`, `IGroupAccessService`, `ILogger<CreditCardsController>`. Log all create/update/delete operations. Route: `api/credit-cards`. Key methods:

- `GetAll([FromQuery] Guid? groupId)` - list cards for accessible groups, include CurrentDebt
- `GetById(Guid id)` - card detail with CurrentDebt
- `Create([FromBody] CreateCreditCardRequest request)` - validate group access, validate BillingDay/DueDay range
- `Update(Guid id, [FromBody] UpdateCreditCardRequest request)` - partial update
- `Delete(Guid id)` - cascade delete

Debt computation helper:
```csharp
private async Task<decimal> ComputeCurrentDebt(Guid creditCardId)
{
    var unpaidStatements = await _db.CreditCardStatements
        .Where(s => s.CreditCardId == creditCardId && !s.IsPaid)
        .Select(s => (decimal?)s.TotalAmount)
        .SumAsync() ?? 0m;

    var latestStatementDate = await _db.CreditCardStatements
        .Where(s => s.CreditCardId == creditCardId)
        .OrderByDescending(s => s.StatementDate)
        .Select(s => (DateTime?)s.StatementDate)
        .FirstOrDefaultAsync();

    var unbilledQuery = _db.CreditCardSpendings
        .Where(cs => cs.CreditCardId == creditCardId);

    if (latestStatementDate.HasValue)
        unbilledQuery = unbilledQuery.Where(cs => cs.Date > latestStatementDate.Value);

    var unbilledSpendings = await unbilledQuery
        .Select(cs => (decimal?)cs.Amount)
        .SumAsync() ?? 0m;

    return unpaidStatements + unbilledSpendings;
}
```

All controllers in this module (Tasks 11, 12, 13) must also inject `ILogger<T>` and log create/update/delete operations following the BankAccountsController pattern.

Group access check helper (same pattern as BankAccountsController):
```csharp
private async Task<(bool Allowed, IActionResult? ErrorResult)> CheckGroupAccess(Guid groupId)
{
    var userId = User.GetUserId();
    var role = User.GetRole();

    if (role != UserRole.SuperAdmin && !await _access.IsUserInGroupAsync(userId, groupId))
        return (false, StatusCode(403, new { error = "forbidden", message = "You don't have access to this group." }));

    return (true, null);
}
```

- [ ] **Step 2: Verify it builds**

```bash
cd GurkanApi && dotnet build
```

- [ ] **Step 3: Commit**

```bash
git add GurkanApi/Controllers/CreditCardsController.cs
git commit -m "feat: add CreditCardsController with CRUD and debt computation"
```

---

### Task 11: Create CreditCardSpendingsController

**Files:**
- Create: `GurkanApi/Controllers/CreditCardSpendingsController.cs`

- [ ] **Step 1: Create controller**

Route: `api/credit-cards/{creditCardId:guid}/spendings`. Nested under credit card. Each action:
1. Load the CreditCard by creditCardId
2. Check group access via card's GroupId
3. Perform CRUD on CreditCardSpending

Methods: GetAll (with optional date range filter via `from`/`to` query params), Create, Update, Delete.

MapResponse helper:
```csharp
private static CreditCardSpendingResponse MapResponse(CreditCardSpending cs) => new()
{
    Id = cs.Id,
    CreditCardId = cs.CreditCardId,
    Description = cs.Description,
    Amount = cs.Amount,
    Date = cs.Date,
    CreatedAt = cs.CreatedAt,
};
```

- [ ] **Step 2: Verify it builds**

```bash
cd GurkanApi && dotnet build
```

- [ ] **Step 3: Commit**

```bash
git add GurkanApi/Controllers/CreditCardSpendingsController.cs
git commit -m "feat: add CreditCardSpendingsController"
```

---

### Task 12: Create CreditCardStatementsController

**Files:**
- Create: `GurkanApi/Controllers/CreditCardStatementsController.cs`

- [ ] **Step 1: Create controller**

Route: `api/credit-cards/{creditCardId:guid}/statements`. Key methods:

**GetAll:** List statements ordered by StatementDate descending. Include itemized spendings and computed GeneralAmount per statement.

**Create:** Compute StatementDate from card's BillingDay (use request.Month/Year or current month). Compute DueDate from card's DueDay. Day clamping: `Math.Min(day, DateTime.DaysInMonth(year, month))`. Validate no duplicate statement for same month. Validate TotalAmount >= sum of itemized spendings for the billing period.

Billing period calculation: previous statement's date to this statement's date. If no previous statement, from card creation date.

```csharp
private DateTime ClampDay(int year, int month, int day)
{
    var maxDay = DateTime.DaysInMonth(year, month);
    return new DateTime(year, month, Math.Min(day, maxDay), 0, 0, 0, DateTimeKind.Utc);
}
```

**Pay (PATCH /{statementId}/pay):**
1. Load statement, verify not already paid
2. If bankAccountId provided:
   - Load bank account, verify same GroupId as card
   - Create BankTransaction (CreditCardPayment type, statement TotalAmount, link RelatedStatementId)
3. Mark statement as paid (IsPaid=true, PaidDate=now, PaidFromBankAccountId)

**Delete:** Also delete any linked BankTransactions (cascade handles this via RelatedStatementId FK).

Statement response mapping with itemized spendings:
```csharp
private async Task<CreditCardStatementResponse> MapStatementResponse(CreditCardStatement s, Guid creditCardId)
{
    var previousStatementDate = await _db.CreditCardStatements
        .Where(ps => ps.CreditCardId == creditCardId && ps.StatementDate < s.StatementDate)
        .OrderByDescending(ps => ps.StatementDate)
        .Select(ps => (DateTime?)ps.StatementDate)
        .FirstOrDefaultAsync();

    var spendingsQuery = _db.CreditCardSpendings
        .Where(cs => cs.CreditCardId == creditCardId && cs.Date <= s.StatementDate);

    if (previousStatementDate.HasValue)
        spendingsQuery = spendingsQuery.Where(cs => cs.Date > previousStatementDate.Value);

    var spendings = await spendingsQuery.OrderByDescending(cs => cs.Date).ToListAsync();
    var itemizedTotal = spendings.Sum(cs => cs.Amount);

    return new CreditCardStatementResponse
    {
        Id = s.Id,
        CreditCardId = s.CreditCardId,
        StatementDate = s.StatementDate,
        DueDate = s.DueDate,
        TotalAmount = s.TotalAmount,
        IsPaid = s.IsPaid,
        PaidDate = s.PaidDate,
        PaidFromBankAccountId = s.PaidFromBankAccountId,
        ItemizedTotal = itemizedTotal,
        GeneralAmount = s.TotalAmount - itemizedTotal,
        ItemizedSpendings = spendings.Select(cs => new CreditCardSpendingResponse
        {
            Id = cs.Id,
            CreditCardId = cs.CreditCardId,
            Description = cs.Description,
            Amount = cs.Amount,
            Date = cs.Date,
            CreatedAt = cs.CreatedAt,
        }).ToList(),
        CreatedAt = s.CreatedAt,
    };
}
```

- [ ] **Step 2: Verify it builds**

```bash
cd GurkanApi && dotnet build
```

- [ ] **Step 3: Commit**

```bash
git add GurkanApi/Controllers/CreditCardStatementsController.cs
git commit -m "feat: add CreditCardStatementsController with pay endpoint"
```

---

### Task 13: Create BankTransactionsController

**Files:**
- Create: `GurkanApi/Controllers/BankTransactionsController.cs`

- [ ] **Step 1: Create controller**

Route: `api/bank-accounts/{bankAccountId:guid}/transactions`. Methods:

**GetAll:** List transactions ordered by Date descending. Optional `from`/`to` date filter.

**GetBalance:** Compute balance:
```csharp
var income = await _db.BankTransactions
    .Where(bt => bt.BankAccountId == bankAccountId && bt.Type == BankTransactionType.Income)
    .SumAsync(bt => bt.Amount);
var outgoing = await _db.BankTransactions
    .Where(bt => bt.BankAccountId == bankAccountId && bt.Type != BankTransactionType.Income)
    .SumAsync(bt => bt.Amount);

return Ok(new BankAccountBalanceResponse
{
    BankAccountId = bankAccountId,
    Balance = income - outgoing,
    Currency = account.Currency,
});
```

**Create:** Only allow Income or Expense types. Reject CreditCardPayment (400 error - those are created internally).

**Update:** Load transaction, reject if type is CreditCardPayment. Apply partial update.

**Delete:** Load transaction, reject if type is CreditCardPayment. Delete.

- [ ] **Step 2: Verify it builds**

```bash
cd GurkanApi && dotnet build
```

- [ ] **Step 3: Commit**

```bash
git add GurkanApi/Controllers/BankTransactionsController.cs
git commit -m "feat: add BankTransactionsController with balance endpoint"
```

---

### Task 14: Extend NotificationComputeService for credit card notifications

**Files:**
- Modify: `GurkanApi/DTOs/Notifications/NotificationResponse.cs`
- Modify: `GurkanApi/Services/NotificationComputeService.cs`

- [ ] **Step 1: Extend NotificationItem for group-level notifications**

In `NotificationResponse.cs`, make PropertyId nullable and add group fields:

```csharp
public Guid? PropertyId { get; set; }
public string PropertyName { get; set; } = string.Empty;
public Guid? GroupId { get; set; }
public string? GroupName { get; set; }
```

Update existing notification code to set `PropertyId` as nullable (existing code already assigns it, so it stays non-null for property-based notifications).

- [ ] **Step 2: Add credit card notification computation**

In `NotificationComputeService.ComputeNotificationsAsync`, after the rent increase section and before the dismissed filter section, add:

```csharp
// --- Resolve accessible group IDs ---
List<Guid> accessibleGroupIds;
if (role == UserRole.SuperAdmin)
    accessibleGroupIds = await _db.Groups.Select(g => g.Id).ToListAsync();
else
    accessibleGroupIds = await _access.GetUserGroupIdsAsync(userId);

var groupLookup = await _db.Groups
    .Where(g => accessibleGroupIds.Contains(g.Id))
    .ToDictionaryAsync(g => g.Id, g => g.Name);

// --- BillingCycleReminder: billing day reached, no statement for this month ---
var activeCards = await _db.CreditCards
    .Where(cc => accessibleGroupIds.Contains(cc.GroupId) && cc.IsActive)
    .ToListAsync();

foreach (var card in activeCards)
{
    var billingDay = Math.Min(card.BillingDay, DateTime.DaysInMonth(now.Year, now.Month));
    if (now.Day < billingDay) continue;

    var monthKey = $"{now:yyyy-MM}";
    var hasStatement = await _db.CreditCardStatements
        .AnyAsync(s => s.CreditCardId == card.Id
                    && s.StatementDate.Year == now.Year
                    && s.StatementDate.Month == now.Month);

    if (!hasStatement)
    {
        notifications.Add(new NotificationItem
        {
            Key = $"BillingCycleReminder:{card.Id}:{monthKey}",
            Type = "BillingCycleReminder",
            Severity = "Warning",
            Message = $"{card.Name} hesap kesim tarihi geldi, ekstre tutarını girin",
            GroupId = card.GroupId,
            GroupName = groupLookup.GetValueOrDefault(card.GroupId, ""),
            Date = new DateTime(now.Year, now.Month, billingDay, 0, 0, 0, DateTimeKind.Utc),
        });
    }
}

// --- CardPaymentDue: unpaid statement, due date is tomorrow or today ---
var unpaidStatements = await _db.CreditCardStatements
    .Include(s => s.CreditCard)
    .Where(s => !s.IsPaid
             && accessibleGroupIds.Contains(s.CreditCard.GroupId)
             && s.DueDate <= now.AddDays(1))
    .ToListAsync();

foreach (var statement in unpaidStatements)
{
    notifications.Add(new NotificationItem
    {
        Key = $"CardPaymentDue:{statement.Id}",
        Type = "CardPaymentDue",
        Severity = "Critical",
        Message = $"{statement.CreditCard.Name} son ödeme tarihi yarın, borç: {statement.TotalAmount} {statement.CreditCard.Currency}",
        GroupId = statement.CreditCard.GroupId,
        GroupName = groupLookup.GetValueOrDefault(statement.CreditCard.GroupId, ""),
        Date = statement.DueDate,
    });
}
```

- [ ] **Step 3: Verify it builds**

```bash
cd GurkanApi && dotnet build
```

- [ ] **Step 4: Commit**

```bash
git add GurkanApi/DTOs/Notifications/NotificationResponse.cs GurkanApi/Services/NotificationComputeService.cs
git commit -m "feat: add credit card billing cycle and payment due notifications"
```

---

### Task 15: Integration tests for payment tracking

**Files:**
- Create: `GurkanApi.Tests/IntegrationTests/PaymentTrackingTests.cs`

- [ ] **Step 1: Create test class with setup**

Follow the ExpenseAndBillTests pattern. Setup: create admin client, 2 users, 2 groups, assign users to groups, create a bank account in groupA.

Trait: `[Trait("Category", "S06")]`

- [ ] **Step 2: Write CreditCard CRUD tests**

Tests:
- `CreateCreditCard_ReturnsCreated` - create card, verify response fields
- `CreateCreditCard_CrossGroupAccess_Returns403` - user2 (groupB) can't create card in groupA
- `GetCreditCards_FiltersByUserGroups` - user1 sees only groupA cards
- `UpdateCreditCard_ReturnsOk`
- `DeleteCreditCard_Cascades`

- [ ] **Step 3: Write Spending tests**

Tests:
- `CreateSpending_ReturnsCreated`
- `GetSpendings_ReturnsListForCard`

- [ ] **Step 4: Write Statement tests**

Tests:
- `CreateStatement_ReturnsCreatedWithItemizedBreakdown` - create spendings first, then statement, verify GeneralAmount
- `CreateStatement_DuplicateMonth_Returns409` - second statement for same month rejected
- `CreateStatement_TotalLessThanItemized_Returns400`
- `PayStatement_MarksAsPaid`
- `PayStatement_WithBankAccount_CreatesBankTransaction` - verify BankTransaction created
- `PayStatement_CrossGroupBankAccount_Returns400` - bank from different group rejected

- [ ] **Step 5: Write BankTransaction tests**

Tests:
- `CreateBankTransaction_Income_ReturnsCreated`
- `CreateBankTransaction_CreditCardPaymentType_Returns400` - manual creation rejected
- `GetBalance_ComputesCorrectly` - add income + expense, verify balance
- `UpdateCreditCardPaymentTransaction_Returns400` - editing system-created tx rejected
- `DeleteCreditCardPaymentTransaction_Returns400`

- [ ] **Step 6: Run all tests**

```bash
cd GurkanApi.Tests && dotnet test --filter "Category=S06" -v normal
```

- [ ] **Step 7: Commit**

```bash
git add GurkanApi.Tests/IntegrationTests/PaymentTrackingTests.cs
git commit -m "test: add payment tracking integration tests"
```

---

### Task 16: Add frontend TypeScript types and enums

**Files:**
- Modify: `gurkan-ui/src/types/index.ts`

- [ ] **Step 1: Add BankTransactionType enum and labels**

```typescript
export const BankTransactionType = {
  Income: 'Income',
  Expense: 'Expense',
  CreditCardPayment: 'CreditCardPayment',
} as const;

export type BankTransactionType = (typeof BankTransactionType)[keyof typeof BankTransactionType];

export const BankTransactionTypeLabels: Record<BankTransactionType, string> = {
  [BankTransactionType.Income]: 'Gelir',
  [BankTransactionType.Expense]: 'Gider',
  [BankTransactionType.CreditCardPayment]: 'Kart Ödemesi',
};
```

- [ ] **Step 2: Add CreditCard response/request interfaces**

```typescript
export interface CreditCardResponse {
  id: string;
  groupId: string;
  name: string;
  bankName: string;
  billingDay: number;
  dueDay: number;
  currency: Currency;
  isActive: boolean;
  currentDebt: number;
  createdAt: string;
}

export interface CreditCardListResponse {
  id: string;
  name: string;
  bankName: string;
  currency: Currency;
  isActive: boolean;
  currentDebt: number;
}

export interface CreateCreditCardRequest {
  groupId: string;
  name: string;
  bankName: string;
  billingDay: number;
  dueDay: number;
  currency: Currency;
}

export interface UpdateCreditCardRequest {
  name?: string;
  bankName?: string;
  billingDay?: number;
  dueDay?: number;
  currency?: Currency;
  isActive?: boolean;
}
```

- [ ] **Step 3: Add CreditCardSpending interfaces**

```typescript
export interface CreditCardSpendingResponse {
  id: string;
  creditCardId: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
}

export interface CreateCreditCardSpendingRequest {
  description: string;
  amount: number;
  date: string;
}

export interface UpdateCreditCardSpendingRequest {
  description?: string;
  amount?: number;
  date?: string;
}
```

- [ ] **Step 4: Add CreditCardStatement interfaces**

```typescript
export interface CreditCardStatementResponse {
  id: string;
  creditCardId: string;
  statementDate: string;
  dueDate: string;
  totalAmount: number;
  isPaid: boolean;
  paidDate: string | null;
  paidFromBankAccountId: string | null;
  itemizedTotal: number;
  generalAmount: number;
  itemizedSpendings: CreditCardSpendingResponse[];
  createdAt: string;
}

export interface CreateStatementRequest {
  totalAmount: number;
  month?: number;
  year?: number;
}

export interface PayStatementRequest {
  bankAccountId?: string | null;
}
```

- [ ] **Step 5: Add BankTransaction interfaces**

```typescript
export interface BankTransactionResponse {
  id: string;
  bankAccountId: string;
  type: BankTransactionType;
  description: string;
  amount: number;
  date: string;
  relatedStatementId: string | null;
  createdAt: string;
}

export interface CreateBankTransactionRequest {
  type: BankTransactionType;
  description: string;
  amount: number;
  date: string;
}

export interface UpdateBankTransactionRequest {
  type?: BankTransactionType;
  description?: string;
  amount?: number;
  date?: string;
}

export interface BankAccountBalanceResponse {
  bankAccountId: string;
  balance: number;
  currency: Currency;
}
```

- [ ] **Step 6: Update existing BankAccountResponse interface**

Find the existing `BankAccountResponse` interface and add `currency: Currency` field. Also update `CreateBankAccountRequest` to include `currency: Currency` and `UpdateBankAccountRequest` to include `currency?: Currency`.

- [ ] **Step 7: Add new NotificationType values**

Update the existing `NotificationType` const object to include:
```typescript
BillingCycleReminder: 'BillingCycleReminder',
CardPaymentDue: 'CardPaymentDue',
```

Update `NotificationTypeLabels` to include:
```typescript
[NotificationType.BillingCycleReminder]: 'Hesap Kesim Hatırlatma',
[NotificationType.CardPaymentDue]: 'Kart Ödemesi',
```

- [ ] **Step 8: Update NotificationItem type for nullable PropertyId and add GroupId**

Update `NotificationItem` interface: `propertyId` to `string | null`, `propertyName` to `string | null`, add `groupId: string | null` and `groupName: string | null`.

- [ ] **Step 9: Commit**

```bash
git add gurkan-ui/src/types/index.ts
git commit -m "feat: add payment tracking TypeScript types"
```

---

### Task 17: Add frontend API client functions

**Files:**
- Modify: `gurkan-ui/src/api/client.ts`

- [ ] **Step 1: Add credit card API functions**

```typescript
export async function getCreditCards(groupId?: string): Promise<CreditCardListResponse[]> {
  const params = groupId ? { groupId } : {};
  const { data } = await api.get<CreditCardListResponse[]>('/credit-cards', { params });
  return data;
}

export async function getCreditCard(id: string): Promise<CreditCardResponse> {
  const { data } = await api.get<CreditCardResponse>(`/credit-cards/${id}`);
  return data;
}

export async function createCreditCard(payload: CreateCreditCardRequest): Promise<CreditCardResponse> {
  const { data } = await api.post<CreditCardResponse>('/credit-cards', payload);
  return data;
}

export async function updateCreditCard(id: string, payload: UpdateCreditCardRequest): Promise<CreditCardResponse> {
  const { data } = await api.put<CreditCardResponse>(`/credit-cards/${id}`, payload);
  return data;
}

export async function deleteCreditCard(id: string): Promise<void> {
  await api.delete(`/credit-cards/${id}`);
}
```

- [ ] **Step 2: Add spending API functions**

```typescript
export async function getCreditCardSpendings(creditCardId: string, from?: string, to?: string): Promise<CreditCardSpendingResponse[]> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.get<CreditCardSpendingResponse[]>(`/credit-cards/${creditCardId}/spendings`, { params });
  return data;
}

export async function createCreditCardSpending(creditCardId: string, payload: CreateCreditCardSpendingRequest): Promise<CreditCardSpendingResponse> {
  const { data } = await api.post<CreditCardSpendingResponse>(`/credit-cards/${creditCardId}/spendings`, payload);
  return data;
}

export async function updateCreditCardSpending(creditCardId: string, spendingId: string, payload: UpdateCreditCardSpendingRequest): Promise<CreditCardSpendingResponse> {
  const { data } = await api.put<CreditCardSpendingResponse>(`/credit-cards/${creditCardId}/spendings/${spendingId}`, payload);
  return data;
}

export async function deleteCreditCardSpending(creditCardId: string, spendingId: string): Promise<void> {
  await api.delete(`/credit-cards/${creditCardId}/spendings/${spendingId}`);
}
```

- [ ] **Step 3: Add statement API functions**

```typescript
export async function getCreditCardStatements(creditCardId: string): Promise<CreditCardStatementResponse[]> {
  const { data } = await api.get<CreditCardStatementResponse[]>(`/credit-cards/${creditCardId}/statements`);
  return data;
}

export async function createCreditCardStatement(creditCardId: string, payload: CreateStatementRequest): Promise<CreditCardStatementResponse> {
  const { data } = await api.post<CreditCardStatementResponse>(`/credit-cards/${creditCardId}/statements`, payload);
  return data;
}

export async function payStatement(creditCardId: string, statementId: string, payload: PayStatementRequest): Promise<CreditCardStatementResponse> {
  const { data } = await api.patch<CreditCardStatementResponse>(`/credit-cards/${creditCardId}/statements/${statementId}/pay`, payload);
  return data;
}

export async function deleteStatement(creditCardId: string, statementId: string): Promise<void> {
  await api.delete(`/credit-cards/${creditCardId}/statements/${statementId}`);
}
```

- [ ] **Step 4: Add bank transaction API functions**

```typescript
export async function getBankTransactions(bankAccountId: string, from?: string, to?: string): Promise<BankTransactionResponse[]> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.get<BankTransactionResponse[]>(`/bank-accounts/${bankAccountId}/transactions`, { params });
  return data;
}

export async function getBankAccountBalance(bankAccountId: string): Promise<BankAccountBalanceResponse> {
  const { data } = await api.get<BankAccountBalanceResponse>(`/bank-accounts/${bankAccountId}/transactions/balance`);
  return data;
}

export async function createBankTransaction(bankAccountId: string, payload: CreateBankTransactionRequest): Promise<BankTransactionResponse> {
  const { data } = await api.post<BankTransactionResponse>(`/bank-accounts/${bankAccountId}/transactions`, payload);
  return data;
}

export async function updateBankTransaction(bankAccountId: string, transactionId: string, payload: UpdateBankTransactionRequest): Promise<BankTransactionResponse> {
  const { data } = await api.put<BankTransactionResponse>(`/bank-accounts/${bankAccountId}/transactions/${transactionId}`, payload);
  return data;
}

export async function deleteBankTransaction(bankAccountId: string, transactionId: string): Promise<void> {
  await api.delete(`/bank-accounts/${bankAccountId}/transactions/${transactionId}`);
}
```

- [ ] **Step 5: Add necessary imports at top of file**

Add the new type imports to the existing import block from `../types`.

- [ ] **Step 6: Commit**

```bash
git add gurkan-ui/src/api/client.ts
git commit -m "feat: add payment tracking API client functions"
```

---

### Task 18: Create Payments CSS

**Files:**
- Create: `gurkan-ui/src/pages/Payments/Payments.css`

- [ ] **Step 1: Create styling**

Follow Bills.css pattern. Include:
- `.payment-summary` - summary card for debt/balance overview (same pattern as `.bill-summary`)
- `.debt-amount` / `.balance-amount` - styled amount displays
- `.statement-card` - expandable card for statement detail with spending breakdown
- `.statement-breakdown` - itemized + general spending display
- `.transaction-type-badge` variants: `--income` (green), `--expense` (red), `--card-payment` (orange)
- Badge for card status: `.card-status-badge--active` (green), `--inactive` (gray)
- `.btn-pay` reuse from Bills.css or shared.css

- [ ] **Step 2: Commit**

```bash
git add gurkan-ui/src/pages/Payments/Payments.css
git commit -m "feat: add Payments CSS styles"
```

---

### Task 19: Create CreditCardList page

**Files:**
- Create: `gurkan-ui/src/pages/Payments/CreditCardList.tsx`

- [ ] **Step 1: Create credit card list page**

Follow BillList.tsx pattern. State: `cards`, `loading`, `error`, `deletingId`. Fetch via `getCreditCards()`. Display table with columns: Name, BankName, Currency, CurrentDebt, IsActive (badge), Actions (detail/edit/delete). Summary card showing total debt. Link to `/payments/credit-cards/new` for creating.

- [ ] **Step 2: Commit**

```bash
git add gurkan-ui/src/pages/Payments/CreditCardList.tsx
git commit -m "feat: add CreditCardList page"
```

---

### Task 20: Create CreditCardForm page

**Files:**
- Create: `gurkan-ui/src/pages/Payments/CreditCardForm.tsx`

- [ ] **Step 1: Create form page**

Follow BillForm.tsx pattern. Fields: Name, BankName, BillingDay (number 1-31), DueDay (number 1-31), Currency (select), GroupId (select, fetch groups via API). Support both create and edit modes via URL param.

- [ ] **Step 2: Commit**

```bash
git add gurkan-ui/src/pages/Payments/CreditCardForm.tsx
git commit -m "feat: add CreditCardForm page"
```

---

### Task 21: Create CreditCardDetail page

**Files:**
- Create: `gurkan-ui/src/pages/Payments/CreditCardDetail.tsx`

- [ ] **Step 1: Create detail page**

This is the most complex page. Sections:

**Header:** Card info (name, bank, billing/due days), current debt, next billing date, next due date.

**Statements section:** List of statements with expandable detail. Each shows: month, total amount, paid status, pay button. Expanded view: itemized spendings list + "Genel Harcama" line. Pay button opens confirmation with optional bank account select.

**Recent spendings section:** Spendings since last statement. Link to add new spending.

**Add buttons:** "Ekstre Gir" and "Harcama Ekle" at top.

Fetches: `getCreditCard(id)`, `getCreditCardStatements(id)`, `getCreditCardSpendings(id)`.

- [ ] **Step 2: Commit**

```bash
git add gurkan-ui/src/pages/Payments/CreditCardDetail.tsx
git commit -m "feat: add CreditCardDetail page with statement and spending views"
```

---

### Task 22: Create StatementForm and SpendingForm pages

**Files:**
- Create: `gurkan-ui/src/pages/Payments/StatementForm.tsx`
- Create: `gurkan-ui/src/pages/Payments/SpendingForm.tsx`

- [ ] **Step 1: Create StatementForm**

Fields: TotalAmount (number), Month (optional select), Year (optional select). Submits to `createCreditCardStatement(cardId, payload)`. Navigate back to card detail on success.

- [ ] **Step 2: Create SpendingForm**

Fields: Description (text), Amount (number), Date (date input). Submits to `createCreditCardSpending(cardId, payload)`. Navigate back to card detail on success.

- [ ] **Step 3: Commit**

```bash
git add gurkan-ui/src/pages/Payments/StatementForm.tsx gurkan-ui/src/pages/Payments/SpendingForm.tsx
git commit -m "feat: add StatementForm and SpendingForm pages"
```

---

### Task 23: Create BankAccountList and BankAccountDetail pages

**Files:**
- Create: `gurkan-ui/src/pages/Payments/BankAccountList.tsx`
- Create: `gurkan-ui/src/pages/Payments/BankAccountDetail.tsx`

- [ ] **Step 1: Create BankAccountList**

Fetch bank accounts via existing `getBankAccounts()` (already in client.ts). For each account, also fetch balance via `getBankAccountBalance(id)`. Table: HolderName, BankName, IBAN, Currency, Balance, Actions (detail link).

- [ ] **Step 2: Create BankAccountDetail**

Header: account info + current balance. Transaction list table: Date, Type (badge), Description, Amount, Actions (edit/delete - disabled for CreditCardPayment). Link to add new transaction. Fetch via `getBankTransactions(bankAccountId)`.

- [ ] **Step 3: Commit**

```bash
git add gurkan-ui/src/pages/Payments/BankAccountList.tsx gurkan-ui/src/pages/Payments/BankAccountDetail.tsx
git commit -m "feat: add BankAccountList and BankAccountDetail pages"
```

---

### Task 24: Create BankTransactionForm page

**Files:**
- Create: `gurkan-ui/src/pages/Payments/BankTransactionForm.tsx`

- [ ] **Step 1: Create form**

Fields: Type (select: Gelir/Gider), Description (text), Amount (number), Date (date). Support both create and edit modes via URL param `transactionId`. In edit mode, load existing data via `getBankTransactions` and filter. Submit to `createBankTransaction` or `updateBankTransaction`. Navigate back to account detail on success.

- [ ] **Step 2: Commit**

```bash
git add gurkan-ui/src/pages/Payments/BankTransactionForm.tsx
git commit -m "feat: add BankTransactionForm page"
```

---

### Task 25: Create PaymentsDashboard page

**Files:**
- Create: `gurkan-ui/src/pages/Payments/PaymentsDashboard.tsx`

- [ ] **Step 1: Create dashboard overview page**

Sections:
- **Kredi Kartları:** Cards with current debt, link to detail. Summary of total debt per currency.
- **Banka Hesapları:** Accounts with balances, link to detail. Summary of total balance per currency.
- **Yaklaşan Ödemeler:** Unpaid statements with due dates approaching.

Links to sub-pages: "Tüm Kartlar", "Tüm Hesaplar".

- [ ] **Step 2: Commit**

```bash
git add gurkan-ui/src/pages/Payments/PaymentsDashboard.tsx
git commit -m "feat: add PaymentsDashboard overview page"
```

---

### Task 26: Add routing and sidebar navigation

**Files:**
- Modify: `gurkan-ui/src/App.tsx`
- Modify: `gurkan-ui/src/components/Layout.tsx`

- [ ] **Step 1: Add routes to App.tsx**

Add inside the Layout wrapper route section (after existing routes, before admin section):

```tsx
<Route path="/payments" element={<PaymentsDashboard />} />
<Route path="/payments/credit-cards" element={<CreditCardList />} />
<Route path="/payments/credit-cards/new" element={<CreditCardForm />} />
<Route path="/payments/credit-cards/:id" element={<CreditCardDetail />} />
<Route path="/payments/credit-cards/:id/edit" element={<CreditCardForm />} />
<Route path="/payments/credit-cards/:id/statements/new" element={<StatementForm />} />
<Route path="/payments/credit-cards/:id/spendings/new" element={<SpendingForm />} />
<Route path="/payments/bank-accounts" element={<BankAccountList />} />
<Route path="/payments/bank-accounts/:id" element={<BankAccountDetail />} />
<Route path="/payments/bank-accounts/:id/transactions/new" element={<BankTransactionForm />} />
<Route path="/payments/bank-accounts/:id/transactions/:transactionId/edit" element={<BankTransactionForm />} />
```

Add imports for all new page components.

- [ ] **Step 2: Add sidebar nav item to Layout.tsx**

Add a new NavLink between the "Abonelikler" and "Bildirimler" items. Use a wallet/payment SVG icon:

```tsx
<NavLink
  to="/payments"
  className={({ isActive }) =>
    `nav-item ${isActive ? 'nav-item--active' : ''}`
  }
>
  <svg
    className="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
  <span>Ödemeler</span>
</NavLink>
```

- [ ] **Step 3: Update NotificationList for nullable PropertyId and group notifications**

In `gurkan-ui/src/pages/Notifications/NotificationList.tsx`, update the notification card footer (`.notification-meta` section):
- If `n.propertyId` is set: show property link as before (`/properties/${n.propertyId}`)
- If `n.groupId` is set (and no propertyId): show group name as plain text (no link needed)
- Update `NotificationTypeLabels` usage to handle new types `BillingCycleReminder` and `CardPaymentDue`

- [ ] **Step 4: Verify frontend compiles**

```bash
cd gurkan-ui && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add gurkan-ui/src/App.tsx gurkan-ui/src/components/Layout.tsx gurkan-ui/src/pages/Payments/ gurkan-ui/src/pages/Notifications/NotificationList.tsx
git commit -m "feat: add payment tracking routes and sidebar navigation"
```

---

### Task 27: End-to-end smoke test

- [ ] **Step 1: Run backend tests**

```bash
cd GurkanApi.Tests && dotnet test -v normal
```

Verify all tests pass including new payment tracking tests.

- [ ] **Step 2: Run frontend build**

```bash
cd gurkan-ui && npm run build
```

Verify no build errors.

- [ ] **Step 3: Manual smoke test**

Start the app and verify:
1. Sidebar shows "Ödemeler" link
2. Payment dashboard loads
3. Can create a credit card
4. Can add spending to card
5. Can create statement (verify itemized breakdown)
6. Can pay statement (with and without bank account)
7. Can add bank transactions (income/expense)
8. Bank balance computes correctly
9. Notifications appear for billing cycle and payment due

- [ ] **Step 4: Final commit if any fixes needed**
