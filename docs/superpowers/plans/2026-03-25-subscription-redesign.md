# Abonelik Yeniden Tasarımı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mülk aboneliklerini flat string alanlardan ayrı bir entity'ye taşı; her abonelik tipi için sahip (kullanıcı/kiracı), abone no, otomatik ödeme ve banka bilgisi tut.

**Architecture:** Property üzerindeki 6 subscription alanı kaldırılıp yerine PropertySubscription tablosu ekleniyor. Yeni Bank tablosu otomatik ödeme bankalarını tutuyor. Frontend'de PropertyForm'un abonelik bölümü yeniden yazılıyor.

**Tech Stack:** .NET 10, EF Core, PostgreSQL, React 19, TypeScript, Vite

---

## File Structure

### Backend - New Files
- `GurkanApi/Entities/PropertySubscription.cs` — Subscription entity
- `GurkanApi/Entities/Bank.cs` — Bank entity (banka adları listesi)
- `GurkanApi/DTOs/Subscriptions/SubscriptionRequest.cs` — Create/update DTO
- `GurkanApi/DTOs/Subscriptions/SubscriptionResponse.cs` — Response DTO
- `GurkanApi/DTOs/Banks/BankRequest.cs` — Bank create DTO
- `GurkanApi/DTOs/Banks/BankResponse.cs` — Bank response DTO
- `GurkanApi/Controllers/BanksController.cs` — Bank CRUD controller
- Migration file (auto-generated)

### Backend - Modified Files
- `GurkanApi/Entities/Enums.cs` — Add SubscriptionType, SubscriptionHolderType enums
- `GurkanApi/Entities/Property.cs` — Remove subscription fields, add navigation property
- `GurkanApi/Data/ApplicationDbContext.cs` — Add DbSets, configure new entities
- `GurkanApi/Controllers/PropertiesController.cs` — Add subscription endpoints, remove old field mappings
- `GurkanApi/DTOs/Properties/CreatePropertyRequest.cs` — Remove subscription fields
- `GurkanApi/DTOs/Properties/UpdatePropertyRequest.cs` — Remove subscription fields
- `GurkanApi/DTOs/Properties/PropertyResponse.cs` — Remove subscription fields, add subscriptions list

### Frontend - Modified Files
- `gurkan-ui/src/types/index.ts` — Add subscription/bank types, update property types
- `gurkan-ui/src/api/client.ts` — Add subscription/bank API calls
- `gurkan-ui/src/pages/Properties/PropertyForm.tsx` — Rewrite subscription section
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — Rewrite subscription display

---

## Task 1: Backend Enums

**Files:**
- Modify: `GurkanApi/Entities/Enums.cs`

- [ ] **Step 1: Add SubscriptionType and SubscriptionHolderType enums**

Add to `Enums.cs` after BillType:

```csharp
public enum SubscriptionType
{
    Electric,
    Gas,
    Water,
    Internet,
    Dues
}

public enum SubscriptionHolderType
{
    User,
    Tenant
}
```

- [ ] **Step 2: Build to verify**

Run: `dotnet build GurkanApi/`
Expected: Build succeeded

- [ ] **Step 3: Commit**

```bash
git add GurkanApi/Entities/Enums.cs
git commit -m "feat: add SubscriptionType and SubscriptionHolderType enums"
```

---

## Task 2: Bank Entity & Controller

**Files:**
- Create: `GurkanApi/Entities/Bank.cs`
- Create: `GurkanApi/DTOs/Banks/BankRequest.cs`
- Create: `GurkanApi/DTOs/Banks/BankResponse.cs`
- Create: `GurkanApi/Controllers/BanksController.cs`
- Modify: `GurkanApi/Data/ApplicationDbContext.cs`

- [ ] **Step 1: Create Bank entity**

Create `GurkanApi/Entities/Bank.cs`:

```csharp
namespace GurkanApi.Entities;

public class Bank
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
```

- [ ] **Step 2: Create Bank DTOs**

Create `GurkanApi/DTOs/Banks/BankRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace GurkanApi.DTOs.Banks;

public class CreateBankRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
}
```

Create `GurkanApi/DTOs/Banks/BankResponse.cs`:

```csharp
namespace GurkanApi.DTOs.Banks;

public class BankResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
```

- [ ] **Step 3: Add DbSet and configure Bank in ApplicationDbContext**

In `ApplicationDbContext.cs`:

Add DbSet:
```csharp
public DbSet<Bank> Banks => Set<Bank>();
```

Add configuration in `OnModelCreating` after BankAccount section:
```csharp
// ---------- Bank ----------
modelBuilder.Entity<Bank>(entity =>
{
    entity.HasKey(b => b.Id);
    entity.Property(b => b.Name).IsRequired().HasMaxLength(200);
    entity.HasIndex(b => b.Name).IsUnique();
    entity.Property(b => b.CreatedAt)
          .HasDefaultValueSql("now() at time zone 'utc'");
});
```

- [ ] **Step 4: Create BanksController**

Create `GurkanApi/Controllers/BanksController.cs`:

```csharp
using GurkanApi.Data;
using GurkanApi.DTOs.Banks;
using GurkanApi.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BanksController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public BanksController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var banks = await _db.Banks.OrderBy(b => b.Name).ToListAsync();
        return Ok(banks.Select(b => new BankResponse { Id = b.Id, Name = b.Name, CreatedAt = b.CreatedAt }));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBankRequest request)
    {
        var exists = await _db.Banks.AnyAsync(b => b.Name == request.Name);
        if (exists)
            return Conflict(new { error = "duplicate", message = "Bu banka zaten kayıtlı." });

        var bank = new Bank
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Banks.Add(bank);
        await _db.SaveChangesAsync();

        return StatusCode(201, new BankResponse { Id = bank.Id, Name = bank.Name, CreatedAt = bank.CreatedAt });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var bank = await _db.Banks.FindAsync(id);
        if (bank is null)
            return NotFound(new { error = "not_found", message = "Bank not found." });

        _db.Banks.Remove(bank);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
```

- [ ] **Step 5: Build to verify**

Run: `dotnet build GurkanApi/`
Expected: Build succeeded

- [ ] **Step 6: Commit**

```bash
git add GurkanApi/Entities/Bank.cs GurkanApi/DTOs/Banks/ GurkanApi/Controllers/BanksController.cs GurkanApi/Data/ApplicationDbContext.cs
git commit -m "feat: add Bank entity with CRUD controller"
```

---

## Task 3: PropertySubscription Entity

**Files:**
- Create: `GurkanApi/Entities/PropertySubscription.cs`
- Create: `GurkanApi/DTOs/Subscriptions/SubscriptionRequest.cs`
- Create: `GurkanApi/DTOs/Subscriptions/SubscriptionResponse.cs`
- Modify: `GurkanApi/Data/ApplicationDbContext.cs`
- Modify: `GurkanApi/Entities/Property.cs`

- [ ] **Step 1: Create PropertySubscription entity**

Create `GurkanApi/Entities/PropertySubscription.cs`:

```csharp
namespace GurkanApi.Entities;

public class PropertySubscription
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public SubscriptionType Type { get; set; }
    public string? SubscriptionNo { get; set; }
    public SubscriptionHolderType HolderType { get; set; }
    public Guid? HolderUserId { get; set; }
    public bool HasAutoPayment { get; set; }
    public Guid? AutoPaymentBankId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Property Property { get; set; } = null!;
    public User? HolderUser { get; set; }
    public Bank? AutoPaymentBank { get; set; }
}
```

- [ ] **Step 2: Add navigation property to Property entity**

In `GurkanApi/Entities/Property.cs`, remove these fields:
- `SubscriptionHolder`
- `ElectricSubscriptionNo`
- `GasSubscriptionNo`
- `WaterSubscriptionNo`
- `InternetSubscriptionNo`
- `DuesSubscriptionNo`

Add navigation property:
```csharp
public ICollection<PropertySubscription> Subscriptions { get; set; } = new List<PropertySubscription>();
```

Keep `TitleDeedOwner` — it's about the deed, not subscriptions.

- [ ] **Step 3: Create Subscription DTOs**

Create `GurkanApi/DTOs/Subscriptions/SubscriptionRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;
using GurkanApi.Entities;

namespace GurkanApi.DTOs.Subscriptions;

public class UpsertSubscriptionRequest
{
    [Required]
    public SubscriptionType Type { get; set; }

    [MaxLength(50)]
    public string? SubscriptionNo { get; set; }

    [Required]
    public SubscriptionHolderType HolderType { get; set; }

    public Guid? HolderUserId { get; set; }
    public bool HasAutoPayment { get; set; }
    public Guid? AutoPaymentBankId { get; set; }
}
```

Create `GurkanApi/DTOs/Subscriptions/SubscriptionResponse.cs`:

```csharp
using GurkanApi.Entities;

namespace GurkanApi.DTOs.Subscriptions;

public class SubscriptionResponse
{
    public Guid Id { get; set; }
    public SubscriptionType Type { get; set; }
    public string? SubscriptionNo { get; set; }
    public SubscriptionHolderType HolderType { get; set; }
    public Guid? HolderUserId { get; set; }
    public string? HolderUserName { get; set; }
    public bool HasAutoPayment { get; set; }
    public Guid? AutoPaymentBankId { get; set; }
    public string? AutoPaymentBankName { get; set; }
}
```

- [ ] **Step 4: Add DbSet and configure PropertySubscription in ApplicationDbContext**

Add DbSet:
```csharp
public DbSet<PropertySubscription> PropertySubscriptions => Set<PropertySubscription>();
```

Remove these lines from Property configuration:
```csharp
entity.Property(p => p.SubscriptionHolder).HasMaxLength(200);
entity.Property(p => p.ElectricSubscriptionNo).HasMaxLength(50);
entity.Property(p => p.GasSubscriptionNo).HasMaxLength(50);
entity.Property(p => p.WaterSubscriptionNo).HasMaxLength(50);
entity.Property(p => p.InternetSubscriptionNo).HasMaxLength(50);
entity.Property(p => p.DuesSubscriptionNo).HasMaxLength(50);
```

Add configuration:
```csharp
// ---------- PropertySubscription ----------
modelBuilder.Entity<PropertySubscription>(entity =>
{
    entity.HasKey(ps => ps.Id);
    entity.Property(ps => ps.Type)
          .HasConversion<string>()
          .HasMaxLength(50);
    entity.Property(ps => ps.HolderType)
          .HasConversion<string>()
          .HasMaxLength(50);
    entity.Property(ps => ps.SubscriptionNo).HasMaxLength(50);
    entity.Property(ps => ps.CreatedAt)
          .HasDefaultValueSql("now() at time zone 'utc'");

    entity.HasIndex(ps => new { ps.PropertyId, ps.Type }).IsUnique();

    entity.HasOne(ps => ps.Property)
          .WithMany(p => p.Subscriptions)
          .HasForeignKey(ps => ps.PropertyId)
          .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(ps => ps.HolderUser)
          .WithMany()
          .HasForeignKey(ps => ps.HolderUserId)
          .OnDelete(DeleteBehavior.SetNull);

    entity.HasOne(ps => ps.AutoPaymentBank)
          .WithMany()
          .HasForeignKey(ps => ps.AutoPaymentBankId)
          .OnDelete(DeleteBehavior.SetNull);
});
```

- [ ] **Step 5: Build to verify**

Run: `dotnet build GurkanApi/`
Expected: Build succeeded

- [ ] **Step 6: Commit**

```bash
git add GurkanApi/Entities/PropertySubscription.cs GurkanApi/Entities/Property.cs GurkanApi/DTOs/Subscriptions/ GurkanApi/Data/ApplicationDbContext.cs
git commit -m "feat: add PropertySubscription entity replacing flat subscription fields"
```

---

## Task 4: Update PropertiesController & DTOs

**Files:**
- Modify: `GurkanApi/DTOs/Properties/CreatePropertyRequest.cs`
- Modify: `GurkanApi/DTOs/Properties/UpdatePropertyRequest.cs`
- Modify: `GurkanApi/DTOs/Properties/PropertyResponse.cs`
- Modify: `GurkanApi/Controllers/PropertiesController.cs`

- [ ] **Step 1: Remove subscription fields from CreatePropertyRequest**

Remove from `CreatePropertyRequest.cs`:
- `SubscriptionHolder` field and its MaxLength attribute
- `ElectricSubscriptionNo` field and its MaxLength attribute
- `GasSubscriptionNo` field and its MaxLength attribute
- `WaterSubscriptionNo` field and its MaxLength attribute
- `InternetSubscriptionNo` field and its MaxLength attribute
- `DuesSubscriptionNo` field and its MaxLength attribute

Keep `TitleDeedOwner` and `DefaultBankAccountId`.

- [ ] **Step 2: Remove subscription fields from UpdatePropertyRequest**

Remove from `UpdatePropertyRequest.cs`:
- `SubscriptionHolder`
- `ElectricSubscriptionNo`
- `GasSubscriptionNo`
- `WaterSubscriptionNo`
- `InternetSubscriptionNo`
- `DuesSubscriptionNo`

Keep `TitleDeedOwner` and `DefaultBankAccountId`.

- [ ] **Step 3: Update PropertyResponse**

Remove from `PropertyResponse.cs`:
- `SubscriptionHolder`
- `ElectricSubscriptionNo`
- `GasSubscriptionNo`
- `WaterSubscriptionNo`
- `InternetSubscriptionNo`
- `DuesSubscriptionNo`

Add:
```csharp
using GurkanApi.DTOs.Subscriptions;

// Add inside the class:
public List<SubscriptionResponse> Subscriptions { get; set; } = new();
```

- [ ] **Step 4: Update PropertiesController**

In `Create` method, remove subscription field mappings:
```csharp
// Remove these lines:
SubscriptionHolder = request.SubscriptionHolder,
ElectricSubscriptionNo = request.ElectricSubscriptionNo,
GasSubscriptionNo = request.GasSubscriptionNo,
WaterSubscriptionNo = request.WaterSubscriptionNo,
InternetSubscriptionNo = request.InternetSubscriptionNo,
DuesSubscriptionNo = request.DuesSubscriptionNo,
```

In `Update` method, remove subscription field update lines:
```csharp
// Remove these lines:
if (request.SubscriptionHolder is not null) property.SubscriptionHolder = request.SubscriptionHolder;
if (request.ElectricSubscriptionNo is not null) property.ElectricSubscriptionNo = request.ElectricSubscriptionNo;
if (request.GasSubscriptionNo is not null) property.GasSubscriptionNo = request.GasSubscriptionNo;
if (request.WaterSubscriptionNo is not null) property.WaterSubscriptionNo = request.WaterSubscriptionNo;
if (request.InternetSubscriptionNo is not null) property.InternetSubscriptionNo = request.InternetSubscriptionNo;
if (request.DuesSubscriptionNo is not null) property.DuesSubscriptionNo = request.DuesSubscriptionNo;
```

In `GetById`, add `.Include(p => p.Subscriptions).ThenInclude(s => s.HolderUser).Include(p => p.Subscriptions).ThenInclude(s => s.AutoPaymentBank)` to the query.

Update `MapPropertyResponse` to remove old fields and add:
```csharp
Subscriptions = p.Subscriptions?.Select(s => new SubscriptionResponse
{
    Id = s.Id,
    Type = s.Type,
    SubscriptionNo = s.SubscriptionNo,
    HolderType = s.HolderType,
    HolderUserId = s.HolderUserId,
    HolderUserName = s.HolderUser?.FullName,
    HasAutoPayment = s.HasAutoPayment,
    AutoPaymentBankId = s.AutoPaymentBankId,
    AutoPaymentBankName = s.AutoPaymentBank?.Name,
}).ToList() ?? new(),
```

Add subscription bulk upsert endpoint:

```csharp
[HttpPut("{id:guid}/subscriptions")]
public async Task<IActionResult> UpdateSubscriptions(Guid id, [FromBody] List<UpsertSubscriptionRequest> requests)
{
    var property = await _db.Properties.FindAsync(id);
    if (property is null)
        return NotFound(new { error = "not_found", message = "Property not found." });

    var userId = User.GetUserId();
    var role = User.GetRole();

    if (!await _access.CanAccessPropertyAsync(userId, id, role))
        return StatusCode(403, new { error = "forbidden", message = "You don't have access to this property." });

    var existing = await _db.PropertySubscriptions
        .Where(ps => ps.PropertyId == id)
        .ToListAsync();

    _db.PropertySubscriptions.RemoveRange(existing);

    var newSubscriptions = requests.Select(r => new PropertySubscription
    {
        Id = Guid.NewGuid(),
        PropertyId = id,
        Type = r.Type,
        SubscriptionNo = r.SubscriptionNo,
        HolderType = r.HolderType,
        HolderUserId = r.HolderType == SubscriptionHolderType.User ? r.HolderUserId : null,
        HasAutoPayment = r.HasAutoPayment,
        AutoPaymentBankId = r.HasAutoPayment ? r.AutoPaymentBankId : null,
        CreatedAt = DateTime.UtcNow,
    }).ToList();

    _db.PropertySubscriptions.AddRange(newSubscriptions);
    await _db.SaveChangesAsync();

    // Reload with navigation properties
    var saved = await _db.PropertySubscriptions
        .Include(ps => ps.HolderUser)
        .Include(ps => ps.AutoPaymentBank)
        .Where(ps => ps.PropertyId == id)
        .ToListAsync();

    return Ok(saved.Select(s => new SubscriptionResponse
    {
        Id = s.Id,
        Type = s.Type,
        SubscriptionNo = s.SubscriptionNo,
        HolderType = s.HolderType,
        HolderUserId = s.HolderUserId,
        HolderUserName = s.HolderUser?.FullName,
        HasAutoPayment = s.HasAutoPayment,
        AutoPaymentBankId = s.AutoPaymentBankId,
        AutoPaymentBankName = s.AutoPaymentBank?.Name,
    }).ToList());
}
```

Add required using:
```csharp
using GurkanApi.DTOs.Subscriptions;
```

- [ ] **Step 5: Build to verify**

Run: `dotnet build GurkanApi/`
Expected: Build succeeded

- [ ] **Step 6: Commit**

```bash
git add GurkanApi/DTOs/Properties/ GurkanApi/Controllers/PropertiesController.cs
git commit -m "feat: update property controller and DTOs for new subscription model"
```

---

## Task 5: EF Core Migration

**Files:**
- Auto-generated migration file

- [ ] **Step 1: Create migration**

Run: `dotnet ef migrations add RedesignSubscriptions --project GurkanApi/`
Expected: Migration file created

- [ ] **Step 2: Review migration**

Read the generated migration file and verify:
- PropertySubscriptions table is created with correct columns
- Banks table is created with unique name index
- Old subscription columns are dropped from Properties table
- No unexpected changes

- [ ] **Step 3: Apply migration (local)**

Run: `dotnet ef database update --project GurkanApi/`
Expected: Database updated successfully

- [ ] **Step 4: Commit**

```bash
git add GurkanApi/Migrations/
git commit -m "feat: add migration for subscription redesign"
```

---

## Task 6: Frontend Types & API Client

**Files:**
- Modify: `gurkan-ui/src/types/index.ts`
- Modify: `gurkan-ui/src/api/client.ts`

- [ ] **Step 1: Update frontend types**

In `gurkan-ui/src/types/index.ts`:

Remove from `PropertyResponse` interface:
- `subscriptionHolder`
- `electricSubscriptionNo`
- `gasSubscriptionNo`
- `waterSubscriptionNo`
- `internetSubscriptionNo`
- `duesSubscriptionNo`

Add to `PropertyResponse`:
```typescript
subscriptions: SubscriptionResponse[];
```

Remove same fields from `CreatePropertyRequest` and `UpdatePropertyRequest`.

Add new types:

```typescript
// ── Subscriptions ──

export const SubscriptionType = {
  Electric: 'Electric',
  Gas: 'Gas',
  Water: 'Water',
  Internet: 'Internet',
  Dues: 'Dues',
} as const;

export type SubscriptionType = (typeof SubscriptionType)[keyof typeof SubscriptionType];

export const SubscriptionTypeLabels: Record<SubscriptionType, string> = {
  [SubscriptionType.Electric]: 'Elektrik',
  [SubscriptionType.Gas]: 'Doğalgaz',
  [SubscriptionType.Water]: 'Su',
  [SubscriptionType.Internet]: 'İnternet',
  [SubscriptionType.Dues]: 'Aidat',
};

export const SubscriptionHolderType = {
  User: 'User',
  Tenant: 'Tenant',
} as const;

export type SubscriptionHolderType = (typeof SubscriptionHolderType)[keyof typeof SubscriptionHolderType];

export const SubscriptionHolderTypeLabels: Record<SubscriptionHolderType, string> = {
  [SubscriptionHolderType.User]: 'Kullanıcı',
  [SubscriptionHolderType.Tenant]: 'Kiracı',
};

export interface SubscriptionResponse {
  id: string;
  type: SubscriptionType;
  subscriptionNo: string | null;
  holderType: SubscriptionHolderType;
  holderUserId: string | null;
  holderUserName: string | null;
  hasAutoPayment: boolean;
  autoPaymentBankId: string | null;
  autoPaymentBankName: string | null;
}

export interface UpsertSubscriptionRequest {
  type: SubscriptionType;
  subscriptionNo?: string | null;
  holderType: SubscriptionHolderType;
  holderUserId?: string | null;
  hasAutoPayment: boolean;
  autoPaymentBankId?: string | null;
}

// ── Banks ──

export interface BankResponse {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateBankRequest {
  name: string;
}
```

- [ ] **Step 2: Add API client functions**

In `gurkan-ui/src/api/client.ts`, add:

```typescript
// ── Banks ────────────────────────────────────

export async function getBanks(): Promise<BankResponse[]> {
  const { data } = await api.get<BankResponse[]>('/banks');
  return data;
}

export async function createBank(payload: CreateBankRequest): Promise<BankResponse> {
  const { data } = await api.post<BankResponse>('/banks', payload);
  return data;
}

export async function deleteBank(id: string): Promise<void> {
  await api.delete(`/banks/${id}`);
}

// ── Property Subscriptions ────────────────────

export async function updatePropertySubscriptions(
  propertyId: string,
  payload: UpsertSubscriptionRequest[],
): Promise<SubscriptionResponse[]> {
  const { data } = await api.put<SubscriptionResponse[]>(
    `/properties/${propertyId}/subscriptions`,
    payload,
  );
  return data;
}
```

Add imports for new types at the top of the file.

- [ ] **Step 3: Verify frontend builds**

Run: `cd gurkan-ui && npm run build`
Expected: Build succeeded (with possibly unused import warnings, which is fine)

- [ ] **Step 4: Commit**

```bash
git add gurkan-ui/src/types/index.ts gurkan-ui/src/api/client.ts
git commit -m "feat: add subscription and bank types with API client functions"
```

---

## Task 7: PropertyForm Subscription Section Rewrite

**Files:**
- Modify: `gurkan-ui/src/pages/Properties/PropertyForm.tsx`

- [ ] **Step 1: Update imports**

Add to imports:
```typescript
import {
  // ... existing imports
  SubscriptionType,
  SubscriptionTypeLabels,
  SubscriptionHolderType,
  SubscriptionHolderTypeLabels,
  type SubscriptionResponse,
  type UpsertSubscriptionRequest,
  type BankResponse as BankListResponse,
} from '../../types';
```

Add API imports:
```typescript
import {
  // ... existing imports
  getBanks,
  createBank,
  updatePropertySubscriptions,
} from '../../api/client';
```

Also need to import `getGroupMembers` or load group members. Since there's no dedicated getGroupMembers function visible, we need to use `getGroup` which returns members. Add `getGroup` to imports if not already there.

- [ ] **Step 2: Replace subscription state**

Remove old subscription state:
```typescript
// Remove these:
const [subscriptionHolder, setSubscriptionHolder] = useState('');
const [electricSubNo, setElectricSubNo] = useState('');
const [gasSubNo, setGasSubNo] = useState('');
const [waterSubNo, setWaterSubNo] = useState('');
const [internetSubNo, setInternetSubNo] = useState('');
const [duesSubNo, setDuesSubNo] = useState('');
```

Add new subscription state:
```typescript
interface SubscriptionFormData {
  type: SubscriptionType;
  subscriptionNo: string;
  holderType: SubscriptionHolderType;
  holderUserId: string;
  hasAutoPayment: boolean;
  autoPaymentBankId: string;
}

const defaultSubscriptions: SubscriptionFormData[] = Object.values(SubscriptionType).map((t) => ({
  type: t,
  subscriptionNo: '',
  holderType: SubscriptionHolderType.User,
  holderUserId: '',
  hasAutoPayment: false,
  autoPaymentBankId: '',
}));

// Inside component:
const [subscriptions, setSubscriptions] = useState<SubscriptionFormData[]>(defaultSubscriptions);
const [banks, setBanks] = useState<BankListResponse[]>([]);
const [groupMembers, setGroupMembers] = useState<{ id: string; fullName: string }[]>([]);
const [showNewBank, setShowNewBank] = useState(false);
const [newBankName, setNewBankName] = useState('');
const [savingBank, setSavingBank] = useState(false);
```

- [ ] **Step 3: Update data loading**

In the `loadData` function, add `getBanks()` to the Promise.all. Also, when groupId is available (from propertyData in edit mode), load group detail to get members:

```typescript
const [groupsData, bankAccountsData, banksData, propertyData] = await Promise.all([
  getGroups(),
  getBankAccounts(),
  getBanks(),
  isEdit && id ? getProperty(id) : Promise.resolve(null),
]);

setBanks(banksData);

if (propertyData) {
  // ... existing field setups ...

  // Load group members
  if (propertyData.groupId) {
    const groupDetail = await getGroup(propertyData.groupId);
    setGroupMembers(groupDetail.members.map((m) => ({ id: m.userId, fullName: m.fullName })));
  }

  // Map subscriptions
  if (propertyData.subscriptions?.length) {
    setSubscriptions(
      defaultSubscriptions.map((ds) => {
        const existing = propertyData.subscriptions.find((s) => s.type === ds.type);
        if (!existing) return ds;
        return {
          type: existing.type,
          subscriptionNo: existing.subscriptionNo ?? '',
          holderType: existing.holderType,
          holderUserId: existing.holderUserId ?? '',
          hasAutoPayment: existing.hasAutoPayment,
          autoPaymentBankId: existing.autoPaymentBankId ?? '',
        };
      }),
    );
  }
}
```

Also add an effect to load group members when groupId changes (for create mode):

```typescript
useEffect(() => {
  if (!groupId) {
    setGroupMembers([]);
    return;
  }
  let cancelled = false;
  getGroup(groupId).then((g) => {
    if (!cancelled) setGroupMembers(g.members.map((m) => ({ id: m.userId, fullName: m.fullName })));
  }).catch(() => {});
  return () => { cancelled = true; };
}, [groupId]);
```

- [ ] **Step 4: Update form submission**

In `handleSubmit`, remove old subscription fields from the create/update payloads:
```typescript
// Remove these from both create and update payloads:
subscriptionHolder: subscriptionHolder.trim() || null,
electricSubscriptionNo: electricSubNo.trim() || null,
gasSubscriptionNo: gasSubNo.trim() || null,
waterSubscriptionNo: waterSubNo.trim() || null,
internetSubscriptionNo: internetSubNo.trim() || null,
duesSubscriptionNo: duesSubNo.trim() || null,
```

After property create/update succeeds, save subscriptions:

```typescript
// After creating/updating property, save subscriptions
const activeSubscriptions = subscriptions.filter(
  (s) => s.subscriptionNo || s.holderUserId || s.holderType === SubscriptionHolderType.Tenant || s.hasAutoPayment,
);

if (activeSubscriptions.length > 0) {
  await updatePropertySubscriptions(
    result.id,
    activeSubscriptions.map((s) => ({
      type: s.type,
      subscriptionNo: s.subscriptionNo.trim() || null,
      holderType: s.holderType,
      holderUserId: s.holderType === SubscriptionHolderType.User && s.holderUserId ? s.holderUserId : null,
      hasAutoPayment: s.hasAutoPayment,
      autoPaymentBankId: s.hasAutoPayment && s.autoPaymentBankId ? s.autoPaymentBankId : null,
    })),
  );
}
```

- [ ] **Step 5: Replace subscription form section JSX**

Replace the old subscription inputs (electricSubNo, gasSubNo, etc.) with:

```tsx
{/* ── Abonelikler ── */}
{subscriptions.map((sub, idx) => (
  <div key={sub.type} style={{
    padding: '16px',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '12px',
    background: 'var(--bg-card)',
  }}>
    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
      {SubscriptionTypeLabels[sub.type]}
    </div>

    <div className="form-row">
      <div className="form-field">
        <label className="form-label">Abone Sahibi</label>
        <select
          className="form-select"
          value={sub.holderType === SubscriptionHolderType.Tenant ? '__tenant__' : sub.holderUserId}
          onChange={(e) => {
            const val = e.target.value;
            setSubscriptions((prev) => prev.map((s, i) => i !== idx ? s : {
              ...s,
              holderType: val === '__tenant__' ? SubscriptionHolderType.Tenant : SubscriptionHolderType.User,
              holderUserId: val === '__tenant__' ? '' : val,
            }));
          }}
          disabled={submitting}
        >
          <option value="">Seçilmemiş</option>
          {groupMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.fullName}</option>
          ))}
          <option value="__tenant__">Kiracı</option>
        </select>
      </div>

      <div className="form-field">
        <label className="form-label">Abone No</label>
        <input
          className="form-input"
          value={sub.subscriptionNo}
          onChange={(e) => {
            setSubscriptions((prev) => prev.map((s, i) => i !== idx ? s : { ...s, subscriptionNo: e.target.value }));
          }}
          maxLength={50}
          disabled={submitting}
          placeholder={sub.holderType === SubscriptionHolderType.Tenant ? 'Opsiyonel' : ''}
        />
      </div>
    </div>

    <div className="form-row" style={{ alignItems: 'center' }}>
      <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          id={`auto-${sub.type}`}
          checked={sub.hasAutoPayment}
          onChange={(e) => {
            setSubscriptions((prev) => prev.map((s, i) => i !== idx ? s : {
              ...s,
              hasAutoPayment: e.target.checked,
              autoPaymentBankId: e.target.checked ? s.autoPaymentBankId : '',
            }));
          }}
          disabled={submitting}
        />
        <label className="form-label" htmlFor={`auto-${sub.type}`} style={{ marginBottom: 0 }}>
          Otomatik Ödeme
        </label>
      </div>

      {sub.hasAutoPayment && (
        <div className="form-field">
          <label className="form-label">Banka</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="form-select"
              value={sub.autoPaymentBankId}
              onChange={(e) => {
                setSubscriptions((prev) => prev.map((s, i) => i !== idx ? s : { ...s, autoPaymentBankId: e.target.value }));
              }}
              disabled={submitting}
              style={{ flex: 1 }}
            >
              <option value="">Banka seçin...</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {idx === 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                onClick={() => setShowNewBank(true)}
                disabled={submitting}
              >
                + Yeni
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
))}

{/* ── New Bank inline form ── */}
{showNewBank && (
  <div style={{
    padding: '16px',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-card)',
    marginBottom: '12px',
  }}>
    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Yeni Banka</div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        className="form-input"
        value={newBankName}
        onChange={(e) => setNewBankName(e.target.value)}
        placeholder="Banka adı"
        maxLength={200}
        style={{ flex: 1 }}
      />
      <button
        type="button"
        className="btn btn-primary"
        disabled={!newBankName.trim() || savingBank}
        onClick={async () => {
          setSavingBank(true);
          try {
            const created = await createBank({ name: newBankName.trim() });
            setBanks((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setShowNewBank(false);
            setNewBankName('');
          } catch { /* ignore */ }
          finally { setSavingBank(false); }
        }}
      >
        {savingBank ? '...' : 'Kaydet'}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => { setShowNewBank(false); setNewBankName(''); }}
      >
        İptal
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 6: Verify frontend builds**

Run: `cd gurkan-ui && npm run build`
Expected: Build succeeded

- [ ] **Step 7: Commit**

```bash
git add gurkan-ui/src/pages/Properties/PropertyForm.tsx
git commit -m "feat: rewrite PropertyForm subscription section with per-type holder and auto-payment"
```

---

## Task 8: PropertyDetail Subscription Display Update

**Files:**
- Modify: `gurkan-ui/src/pages/Properties/PropertyDetail.tsx`

- [ ] **Step 1: Update imports**

Add to imports:
```typescript
import {
  // ... existing imports
  SubscriptionTypeLabels,
  SubscriptionHolderType,
  SubscriptionHolderTypeLabels,
  type SubscriptionResponse,
} from '../../types';
```

- [ ] **Step 2: Replace subscription display section**

Replace the old "Sahiplik & Abonelik Bilgileri" section. Remove the condition that checks old subscription fields. Replace with:

```tsx
{/* ── Sahiplik Bilgileri ── */}
{(property.titleDeedOwner || property.defaultBankAccountName) && (
  <div className="detail-body" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
      Sahiplik Bilgileri
    </h3>
    <div className="detail-grid">
      {renderField('Tapu Sahibi', property.titleDeedOwner)}
      {renderField('Kira Hesabı', property.defaultBankAccountName)}
    </div>
  </div>
)}

{/* ── Abonelik Bilgileri ── */}
{property.subscriptions?.length > 0 && (
  <div className="detail-body" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
      Abonelik Bilgileri
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {property.subscriptions.map((sub: SubscriptionResponse) => (
        <div key={sub.id} style={{
          padding: '12px 16px',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px' }}>
              {SubscriptionTypeLabels[sub.type]}
            </span>
            {sub.hasAutoPayment && (
              <span className="badge" style={{ fontSize: '11px' }}>
                Otomatik Ödeme{sub.autoPaymentBankName ? ` — ${sub.autoPaymentBankName}` : ''}
              </span>
            )}
          </div>
          <div className="detail-grid">
            {renderField('Abone Sahibi',
              sub.holderType === SubscriptionHolderType.Tenant
                ? 'Kiracı'
                : sub.holderUserName ?? '—'
            )}
            {renderField('Abone No', sub.subscriptionNo)}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify frontend builds**

Run: `cd gurkan-ui && npm run build`
Expected: Build succeeded

- [ ] **Step 4: Commit**

```bash
git add gurkan-ui/src/pages/Properties/PropertyDetail.tsx
git commit -m "feat: update PropertyDetail to show new subscription model"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run backend build**

Run: `dotnet build GurkanApi/`
Expected: Build succeeded with 0 errors

- [ ] **Step 2: Run frontend build**

Run: `cd gurkan-ui && npm run build`
Expected: Build succeeded

- [ ] **Step 3: Manual smoke test**

Start the app and verify:
1. Property create form shows 5 subscription cards (Elektrik, Doğalgaz, Su, İnternet, Aidat)
2. Each card has: sahip dropdown (users + Kiracı), abone no input, otomatik ödeme checkbox, banka dropdown
3. Property detail shows subscriptions correctly
4. Bank CRUD works (add new bank from form, appears in dropdown)
5. Kiracı seçilince abone no "Opsiyonel" placeholder gösteriyor

- [ ] **Step 4: Final commit if needed**

Any remaining fixes.
