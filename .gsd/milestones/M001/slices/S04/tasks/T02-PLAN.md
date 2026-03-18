---
estimated_steps: 4
estimated_files: 4
---

# T02: Wire frontend types, API client, routes, and PropertyLayout tabs

**Slice:** S04 — Gider & Fatura Takibi
**Milestone:** M001

## Description

Add TypeScript types and const label objects for expenses and bills, wire API client functions, add React Router routes nested under PropertyLayout, and add "Giderler" and "Faturalar" tabs to PropertyLayout. This is the frontend wiring layer that connects to the T01 backend and unblocks T03 page development.

## Steps

1. **Add TypeScript types and label objects to `gurkan-ui/src/types/index.ts`:**
   - Add const objects with Turkish labels (string values matching backend JsonStringEnumConverter — K011):
     ```typescript
     export const ExpenseCategory = { Maintenance: "Maintenance", Repair: "Repair", Tax: "Tax", Insurance: "Insurance", Management: "Management", Other: "Other" } as const;
     export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];
     export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = { Maintenance: "Bakım", Repair: "Tamir", Tax: "Vergi", Insurance: "Sigorta", Management: "Yönetim", Other: "Diğer" };

     export const BillType = { Water: "Water", Electric: "Electric", Gas: "Gas", Internet: "Internet", Dues: "Dues" } as const;
     export type BillType = (typeof BillType)[keyof typeof BillType];
     export const BillTypeLabels: Record<BillType, string> = { Water: "Su", Electric: "Elektrik", Gas: "Doğalgaz", Internet: "İnternet", Dues: "Aidat" };

     export const BillPaymentStatus = { Pending: "Pending", Paid: "Paid", Overdue: "Overdue" } as const;
     export type BillPaymentStatus = (typeof BillPaymentStatus)[keyof typeof BillPaymentStatus];
     export const BillPaymentStatusLabels: Record<BillPaymentStatus, string> = { Pending: "Bekliyor", Paid: "Ödendi", Overdue: "Gecikmiş" };
     ```
   - Add interfaces:
     ```typescript
     export interface ExpenseResponse {
       id: string; propertyId: string; category: ExpenseCategory; description: string;
       amount: number; currency: Currency; date: string; isRecurring: boolean;
       recurrenceInterval: string | null; notes: string | null; createdAt: string;
     }
     export interface CreateExpenseRequest {
       category: ExpenseCategory; description: string; amount: number; currency: Currency;
       date: string; isRecurring: boolean; recurrenceInterval?: string | null; notes?: string | null;
     }
     export interface UpdateExpenseRequest extends CreateExpenseRequest {}

     export interface BillResponse {
       id: string; propertyId: string; type: BillType; amount: number; currency: Currency;
       dueDate: string; paidDate: string | null; status: BillPaymentStatus;
       notes: string | null; createdAt: string;
     }
     export interface CreateBillRequest {
       type: BillType; amount: number; currency: Currency; dueDate: string; notes?: string | null;
     }
     export interface UpdateBillRequest extends CreateBillRequest {}
     ```

2. **Add API functions to `gurkan-ui/src/api/client.ts`:**
   - Expenses (nested under propertyId):
     - `getExpenses(propertyId: string, category?: string): Promise<ExpenseResponse[]>` — GET with optional `?category=` param
     - `getExpense(propertyId: string, id: string): Promise<ExpenseResponse>` — GET by id
     - `createExpense(propertyId: string, data: CreateExpenseRequest): Promise<ExpenseResponse>` — POST
     - `updateExpense(propertyId: string, id: string, data: UpdateExpenseRequest): Promise<ExpenseResponse>` — PUT
     - `deleteExpense(propertyId: string, id: string): Promise<void>` — DELETE
   - Bills (nested under propertyId):
     - `getBills(propertyId: string, status?: string): Promise<BillResponse[]>` — GET with optional `?status=` param
     - `getBill(propertyId: string, id: string): Promise<BillResponse>` — GET by id
     - `createBill(propertyId: string, data: CreateBillRequest): Promise<BillResponse>` — POST
     - `updateBill(propertyId: string, id: string, data: UpdateBillRequest): Promise<BillResponse>` — PUT
     - `deleteBill(propertyId: string, id: string): Promise<void>` — DELETE
     - `markBillPaid(propertyId: string, id: string): Promise<BillResponse>` — PATCH `/{id}/pay`

3. **Add routes to `gurkan-ui/src/App.tsx`:**
   - Import ExpenseList, ExpenseForm, BillList, BillForm (lazy imports or direct — follow existing pattern)
   - Add inside the `<Route path="/properties/:id" element={<PropertyLayout />}>` block:
     ```
     <Route path="expenses" element={<ExpenseList />} />
     <Route path="expenses/new" element={<ExpenseForm />} />
     <Route path="expenses/:expenseId/edit" element={<ExpenseForm />} />
     <Route path="bills" element={<BillList />} />
     <Route path="bills/new" element={<BillForm />} />
     <Route path="bills/:billId/edit" element={<BillForm />} />
     ```
   - Note: The page components don't exist yet — they'll be created in T03. The imports will cause TypeScript errors until T03, BUT since we verify with `npm run build`, temporarily create minimal placeholder files OR add the imports in T03 instead. **Recommended approach:** Add the routes but comment out the imports/routes, leaving a clear `// TODO T03: uncomment when pages exist` marker. OR: create empty placeholder components that export a `<div>Loading...</div>`. Either approach works — choose whichever keeps `npm run build` passing.

4. **Add tabs to `gurkan-ui/src/pages/Properties/PropertyLayout.tsx`:**
   - Add route detection variables (following existing pattern):
     ```typescript
     const isExpenses = location.pathname.includes('/expenses');
     const isBills = location.pathname.includes('/bills');
     ```
   - Add two new `<Link>` elements in the `<nav className="property-tabs">` section, after the "Kısa Dönem" tab:
     ```tsx
     <Link to={`${basePath}/expenses`} className={`property-tab ${isExpenses ? 'property-tab--active' : ''}`}>
       Giderler
     </Link>
     <Link to={`${basePath}/bills`} className={`property-tab ${isBills ? 'property-tab--active' : ''}`}>
       Faturalar
     </Link>
     ```

## Must-Haves

- [ ] ExpenseResponse, CreateExpenseRequest, UpdateExpenseRequest types in types/index.ts
- [ ] BillResponse, CreateBillRequest, UpdateBillRequest types in types/index.ts
- [ ] ExpenseCategory, BillType, BillPaymentStatus const objects with Turkish label records
- [ ] 5 expense API functions + 6 bill API functions in client.ts
- [ ] Expense and bill routes defined in App.tsx (or ready to uncomment)
- [ ] "Giderler" and "Faturalar" tabs in PropertyLayout.tsx
- [ ] `npm run build` passes with zero errors

## Verification

- `cd gurkan-ui && npm run build` — TypeScript compiles with zero errors
- Visually inspect PropertyLayout tabs in browser (tabs should appear even if pages are placeholder)

## Inputs

- `gurkan-ui/src/types/index.ts` — existing types to extend (has Currency, PropertyResponse, etc.)
- `gurkan-ui/src/api/client.ts` — existing API functions to extend (follows axios pattern with typed returns)
- `gurkan-ui/src/App.tsx` — existing route structure with PropertyLayout wrapper
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — existing tab navigation with 3 tabs
- T01 backend must be complete (endpoints available for API function URLs)

## Expected Output

- `gurkan-ui/src/types/index.ts` — extended with expense/bill types and label objects
- `gurkan-ui/src/api/client.ts` — extended with 11 API functions
- `gurkan-ui/src/App.tsx` — extended with 6 new routes (or placeholder-ready)
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — 5 tabs instead of 3
