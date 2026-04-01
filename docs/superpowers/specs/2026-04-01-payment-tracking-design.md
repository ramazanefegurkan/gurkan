# Payment Tracking Module Design

## Overview

Group-level payment tracking module for credit cards and bank accounts. Tracks credit card debt via monthly statements with itemized spending breakdown, and bank account balances via income/expense transactions. Notifications for billing cycles and payment due dates. Web UI only (mobile later).

## Scope

**In scope:** Credit card definitions, card spendings, monthly statements, statement payments, bank account transactions (income/expense/card payment), balance tracking, notifications (billing cycle + payment due).

**Out of scope:** Loans/credits (future), mobile app, automatic bank integrations, recurring/scheduled transactions.

## Data Model

### BankAccount (existing entity - migration required)

Add `Currency` field (Currency enum, default TRY) to existing BankAccount entity. Existing rows get TRY as default.

### CreditCard

| Field | Type | Constraints |
|-------|------|-------------|
| Id | Guid | PK |
| GroupId | Guid | FK -> Group, Required |
| Name | string | Required, max 200 |
| BankName | string | Required, max 200 |
| BillingDay | int | 1-31 (clamped to last day of month at runtime) |
| DueDay | int | 1-31 (clamped to last day of month at runtime) |
| Currency | Currency enum | TRY/USD/EUR |
| IsActive | bool | Default true |
| CreatedAt | DateTime | |

Relationships: belongs to Group (cascade delete), has many CreditCardSpendings, has many CreditCardStatements.

Day clamping: BillingDay=31 in February resolves to 28 (or 29 in leap year). Clamping is applied at computation time (notification triggers, statement date calculation), not stored.

### CreditCardSpending

| Field | Type | Constraints |
|-------|------|-------------|
| Id | Guid | PK |
| CreditCardId | Guid | FK -> CreditCard, Required |
| Description | string | Required, max 500 |
| Amount | decimal(18,2) | > 0 |
| Date | DateTime | |
| CreatedAt | DateTime | |

Relationships: belongs to CreditCard (cascade delete).

### CreditCardStatement

| Field | Type | Constraints |
|-------|------|-------------|
| Id | Guid | PK |
| CreditCardId | Guid | FK -> CreditCard, Required |
| StatementDate | DateTime | Billing cycle date |
| DueDate | DateTime | Payment due date |
| TotalAmount | decimal(18,2) | > 0 |
| IsPaid | bool | Default false |
| PaidDate | DateTime? | |
| PaidFromBankAccountId | Guid? | FK -> BankAccount, optional |
| CreatedAt | DateTime | |

Relationships: belongs to CreditCard (cascade delete), optional PaidFromBankAccount (SetNull on delete).

Unique constraint: (CreditCardId, StatementDate) - prevents duplicate statements for the same billing period.

Validation: TotalAmount must be >= sum of itemized spendings for the billing period. If less, return 400 with explanation.

### BankTransaction

| Field | Type | Constraints |
|-------|------|-------------|
| Id | Guid | PK |
| BankAccountId | Guid | FK -> BankAccount, Required |
| Type | BankTransactionType | Income / Expense / CreditCardPayment |
| Description | string | Required, max 500 |
| Amount | decimal(18,2) | > 0 (always positive, direction from Type) |
| Date | DateTime | |
| RelatedStatementId | Guid? | FK -> CreditCardStatement, for card payments |
| CreatedAt | DateTime | |

Relationships: belongs to BankAccount (cascade delete), optional RelatedStatement (Cascade delete - when statement is deleted, related BankTransaction is also deleted).

CreditCardPayment transactions are system-created (via statement pay endpoint). They cannot be edited or deleted directly through the transactions endpoint.

### New Enums

```
BankTransactionType: Income, Expense, CreditCardPayment
```

Added to Entities/Enums.cs.

## Balance Computation

**Bank account balance** = SUM(Income amounts) - SUM(Expense amounts) - SUM(CreditCardPayment amounts)

**Credit card current debt:**
- If statements exist: SUM(unpaid statement TotalAmounts) + SUM(spendings after latest statement date)
- If no statements exist: SUM(all spendings for this card)

**Statement spending breakdown:**
- Itemized = SUM(spendings between previous statement date and this statement date)
- General = TotalAmount - Itemized (always >= 0, enforced by validation)
- Display: individual spending lines + "Genel Harcama" line = TotalAmount

## Notifications

Computed dynamically via NotificationComputeService (extended for group-level notifications).

### NotificationItem extension

Existing NotificationItem has PropertyId/PropertyName (property-scoped). For group-level notifications, these fields will be nullable. New fields added: GroupId (nullable Guid), GroupName (nullable string). The compute service will resolve accessible group IDs alongside property IDs.

### BillingCycleReminder

- **Trigger:** Today >= card's BillingDay (clamped) for current month AND no statement exists for this month yet AND card IsActive
- **Severity:** Warning
- **Key format:** `BillingCycleReminder:{CreditCardId}:{YYYY-MM}`
- **Message:** "{CardName} hesap kesim tarihi geldi, ekstre tutarını girin"
- **Auto-dismiss:** When statement is created for that month

### CardPaymentDue

- **Trigger:** Unpaid statement exists AND today >= DueDate - 1 day
- **Severity:** Critical
- **Key format:** `CardPaymentDue:{StatementId}`
- **Message:** "{CardName} son ödeme tarihi yarın, borç: {Amount} {Currency}"
- **Auto-dismiss:** When statement is marked as paid

## API Endpoints

### Credit Cards - `api/credit-cards`

| Method | Route | Description |
|--------|-------|-------------|
| GET | / | List cards for user's accessible groups |
| GET | /{id} | Card detail with current debt |
| POST | / | Create card (body: CreateCreditCardRequest) |
| PUT | /{id} | Update card (body: UpdateCreditCardRequest) |
| DELETE | /{id} | Delete card (cascades spendings + statements) |

### Card Spendings - `api/credit-cards/{creditCardId}/spendings`

| Method | Route | Description |
|--------|-------|-------------|
| GET | / | List spendings (optional date range filter) |
| POST | / | Create spending |
| PUT | /{spendingId} | Update spending |
| DELETE | /{spendingId} | Delete spending |

### Statements - `api/credit-cards/{creditCardId}/statements`

| Method | Route | Description |
|--------|-------|-------------|
| GET | / | List statements |
| POST | / | Create statement (enter monthly bill, optional month/year for past months) |
| PATCH | /{statementId}/pay | Mark as paid (optional bankAccountId in body) |
| DELETE | /{statementId} | Delete statement (cascades related BankTransactions) |

PATCH pay behavior: If bankAccountId provided, validates it belongs to same group as card, then creates BankTransaction (type: CreditCardPayment, amount: statement total, relatedStatementId). If not provided, only marks statement as paid.

### Bank Transactions - `api/bank-accounts/{bankAccountId}/transactions`

| Method | Route | Description |
|--------|-------|-------------|
| GET | / | List transactions (optional date range filter) |
| GET | /balance | Computed balance |
| POST | / | Create transaction (Income or Expense only) |
| PUT | /{transactionId} | Update transaction (Income/Expense only, rejects CreditCardPayment) |
| DELETE | /{transactionId} | Delete transaction (Income/Expense only, rejects CreditCardPayment) |

Authorization: All endpoints use IGroupAccessService to verify user has access to the card's/account's group.

## DTOs

### Credit Card DTOs (DTOs/CreditCards/)

- **CreateCreditCardRequest:** GroupId, Name, BankName, BillingDay, DueDay, Currency
- **UpdateCreditCardRequest:** Name?, BankName?, BillingDay?, DueDay?, Currency?, IsActive?
- **CreditCardResponse:** All fields + CurrentDebt (computed)
- **CreditCardListResponse:** Id, Name, BankName, Currency, CurrentDebt, IsActive

### Credit Card Spending DTOs (DTOs/CreditCards/)

- **CreateCreditCardSpendingRequest:** Description, Amount, Date
- **UpdateCreditCardSpendingRequest:** Description?, Amount?, Date?
- **CreditCardSpendingResponse:** All fields

### Credit Card Statement DTOs (DTOs/CreditCards/)

- **CreateStatementRequest:** TotalAmount, Month? (int), Year? (int) - defaults to current month if omitted
- **PayStatementRequest:** BankAccountId? (optional)
- **CreditCardStatementResponse:** All fields + ItemizedSpendings (list) + GeneralAmount (computed)

### Bank Transaction DTOs (DTOs/BankAccounts/)

- **CreateBankTransactionRequest:** Type (Income/Expense only), Description, Amount, Date
- **UpdateBankTransactionRequest:** Type?, Description?, Amount?, Date? (rejects if transaction is CreditCardPayment)
- **BankTransactionResponse:** All fields
- **BankAccountBalanceResponse:** BankAccountId, Balance, Currency

## Web UI

### Navigation

New sidebar item "Ödemeler" between "Abonelikler" and "Bildirimler".

### Routes

| Route | Page | Content |
|-------|------|---------|
| /payments | Dashboard | Card debts summary, bank balances, upcoming payments |
| /payments/credit-cards | Card list | All cards with current debt |
| /payments/credit-cards/new | Card form | Create card |
| /payments/credit-cards/:id | Card detail | Statements, spendings, debt summary |
| /payments/credit-cards/:id/edit | Card edit | Edit card |
| /payments/credit-cards/:id/statements/new | Statement form | Enter monthly bill |
| /payments/credit-cards/:id/spendings/new | Spending form | Enter card spending |
| /payments/bank-accounts | Account list | All accounts with balances |
| /payments/bank-accounts/:id | Account detail | Transaction list, balance |
| /payments/bank-accounts/:id/transactions/new | Transaction form | Enter income/expense |

### Card Detail Page

- Header: kart bilgileri, güncel borç, bir sonraki kesim/ödeme tarihi
- Ekstre listesi: ay bazlı, toplam borç, ödeme durumu, "Ödendi İşaretle" butonu
- Ekstre detayı: itemize harcamalar + genel harcama ayrımı (örn: 100 TL Market + 300 TL Genel = 400 TL)
- Son harcamalar: son ekstreden bu yana girilen harcamalar

### Bank Account Detail Page

- Header: hesap bilgileri, güncel bakiye
- İşlem listesi: Gelir (yeşil badge), Gider (kırmızı badge), Kart Ödemesi (turuncu badge)
- Kart ödemesi satırları düzenlenemez/silinemez (UI'da disabled)

### Styling

New `Payments.css` file. Reuses existing shared classes: .data-table, .btn, .badge, .form-*, .modal-overlay, .confirm-dialog, .empty-state, .loading-spinner.
