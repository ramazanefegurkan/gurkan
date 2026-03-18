---
estimated_steps: 9
estimated_files: 8
---

# T04: Build frontend Dashboard page, Notification list, and export wiring

**Slice:** S06 — Dashboard, Bildirimler & Raporlama
**Milestone:** M001

## Description

Build the complete frontend for S06: TypeScript interfaces for dashboard/notification/report responses, API client functions (including blob download for exports), sidebar navigation updates with "Dashboard" and "Bildirimler" links, route wiring, Dashboard page with summary cards and per-property breakdown table and export buttons, and Notification list page with severity-colored cards. Makes /dashboard the default authenticated route. Follows the existing CSS design system and component patterns.

**Relevant skills:** `frontend-design` skill should be loaded for UI design quality.

## Steps

1. **Add TypeScript interfaces** to `gurkan-ui/src/types/index.ts`:
   - Add after the existing Documents section:
   ```typescript
   // ── Dashboard ──────────────────────────────────────
   
   export interface CurrencyAmount {
     currency: Currency;
     amount: number;
   }
   
   export interface CurrencySummary {
     currency: Currency;
     totalIncome: number;
     totalExpenses: number;
     totalProfit: number;
     unpaidRentCount: number;
     upcomingBillCount: number;
   }
   
   export interface PropertyFinancials {
     propertyId: string;
     propertyName: string;
     propertyType: PropertyType;
     currency: Currency;
     income: CurrencyAmount[];
     expenses: CurrencyAmount[];
     profit: CurrencyAmount[];
     unpaidRentCount: number;
     upcomingBillCount: number;
   }
   
   export interface DashboardResponse {
     summary: CurrencySummary[];
     properties: PropertyFinancials[];
   }
   
   // ── Notifications ─────────────────────────────────
   
   export const NotificationType = {
     LateRent: 'LateRent',
     UpcomingBill: 'UpcomingBill',
     LeaseExpiry: 'LeaseExpiry',
     RentIncrease: 'RentIncrease',
   } as const;
   
   export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
   
   export const NotificationTypeLabels: Record<NotificationType, string> = {
     [NotificationType.LateRent]: 'Kira Gecikmesi',
     [NotificationType.UpcomingBill]: 'Fatura Hatırlatması',
     [NotificationType.LeaseExpiry]: 'Sözleşme Bitişi',
     [NotificationType.RentIncrease]: 'Kira Artışı',
   };
   
   export const NotificationSeverity = {
     Critical: 'Critical',
     Warning: 'Warning',
     Info: 'Info',
   } as const;
   
   export type NotificationSeverity = (typeof NotificationSeverity)[keyof typeof NotificationSeverity];
   
   export interface NotificationItem {
     type: NotificationType;
     severity: NotificationSeverity;
     message: string;
     propertyId: string;
     propertyName: string;
     relatedEntityId: string | null;
     date: string;
   }
   
   // ── Reports ───────────────────────────────────────
   
   export interface PropertyReport {
     propertyId: string;
     propertyName: string;
     propertyType: PropertyType;
     city: string;
     currency: Currency;
     rentIncome: number;
     shortTermIncome: number;
     totalIncome: number;
     expenseTotal: number;
     billTotal: number;
     totalExpenses: number;
     profit: number;
     roi: number | null;
   }
   
   export interface ProfitLossReport {
     generatedAt: string;
     period: string;
     summary: { currency: Currency; totalIncome: number; totalExpenses: number; totalProfit: number }[];
     properties: PropertyReport[];
   }
   ```
   - Use `const` objects with `as const` for enums (K009 compliance)

2. **Add API client functions** to `gurkan-ui/src/api/client.ts`:
   - Add imports for the new types at the top import block
   - Add functions:
   ```typescript
   // ── Dashboard ─────────────────────────────────────
   export async function getDashboard(): Promise<DashboardResponse> {
     const { data } = await api.get<DashboardResponse>('/dashboard');
     return data;
   }
   
   // ── Notifications ─────────────────────────────────
   export async function getNotifications(): Promise<NotificationItem[]> {
     const { data } = await api.get<NotificationItem[]>('/notifications');
     return data;
   }
   
   // ── Reports ───────────────────────────────────────
   export async function getProfitLossReport(year?: number): Promise<ProfitLossReport> {
     const params = year ? { year } : {};
     const { data } = await api.get<ProfitLossReport>('/reports/profit-loss', { params });
     return data;
   }
   
   export async function exportExcel(): Promise<void> {
     const { data, headers } = await api.get('/reports/export/excel', { responseType: 'blob' });
     const blob = new Blob([data]);
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = 'portfoy-raporu.xlsx';
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
   }
   
   export async function exportPdf(): Promise<void> {
     const { data, headers } = await api.get('/reports/export/pdf', { responseType: 'blob' });
     const blob = new Blob([data]);
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = 'portfoy-raporu.pdf';
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
   }
   ```
   - The export functions reuse the same blob download pattern as the existing `downloadDocument()` function

3. **Update Layout.tsx sidebar** in `gurkan-ui/src/components/Layout.tsx`:
   - Add "Dashboard" NavLink BEFORE the existing "Mülkler" NavLink (Dashboard is the main landing page):
     ```tsx
     <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
       <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
         <rect x="3" y="3" width="7" height="7" rx="1" />
         <rect x="14" y="3" width="7" height="4" rx="1" />
         <rect x="14" y="11" width="7" height="10" rx="1" />
         <rect x="3" y="14" width="7" height="7" rx="1" />
       </svg>
       Dashboard
     </NavLink>
     ```
   - Add "Bildirimler" NavLink AFTER "Mülkler":
     ```tsx
     <NavLink to="/notifications" className={({isActive}) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
       <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
         <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
         <path d="M13.73 21a2 2 0 01-3.46 0" />
       </svg>
       Bildirimler
     </NavLink>
     ```

4. **Update App.tsx routes** in `gurkan-ui/src/App.tsx`:
   - Add imports for Dashboard and NotificationList components
   - Change the default route from `/properties` to `/dashboard`:
     ```tsx
     <Route index element={<Navigate to="/dashboard" replace />} />
     ```
   - Add routes inside the protected layout:
     ```tsx
     <Route path="/dashboard" element={<Dashboard />} />
     <Route path="/notifications" element={<NotificationList />} />
     ```
   - Update the catch-all redirect from `/properties` to `/dashboard`

5. **Create Dashboard page** `gurkan-ui/src/pages/Dashboard/Dashboard.tsx`:
   - Import `getDashboard`, `getNotifications`, `exportExcel`, `exportPdf` from API client
   - Import types: `DashboardResponse`, `NotificationItem`, `CurrencyLabels`, `PropertyTypeLabels`
   - State: `dashboard` (DashboardResponse | null), `notifications` (NotificationItem[]), `loading` (boolean), `exporting` (string | null — 'excel' | 'pdf' | null)
   - useEffect: fetch dashboard and notifications on mount
   - Render:
     - Page header: "Dashboard" with export buttons (Excel / PDF) on the right — show spinner on button during export
     - **Notification banner** (if notifications.length > 0): colored banner showing critical count + warning count, links to /notifications
     - **Summary cards row**: one card per currency in dashboard.summary — each card shows: Toplam Gelir, Toplam Gider, Kâr/Zarar (color-coded green/red), Ödenmemiş Kira count, Yaklaşan Fatura count
     - **Per-property table**: columns = Mülk, Tür, Gelir, Gider, Kâr/Zarar, Ödenmemiş, Fatura. Each row links to the property detail page. Show CurrencyAmount arrays as comma-separated if multi-currency on a single property.
     - Loading state: show spinner
     - Empty state: "Henüz mülk bulunmuyor" message with link to /properties/new
   - Export handlers: call exportExcel()/exportPdf(), set exporting state during download, catch errors and show alert

6. **Create Dashboard.css** `gurkan-ui/src/pages/Dashboard/Dashboard.css`:
   - Use existing CSS custom properties (var(--bg-card), var(--text-primary), var(--accent), etc.)
   - `.dashboard-header` — flexbox with title left, export buttons right
   - `.summary-cards` — CSS grid, responsive (3 columns on desktop, 1 on mobile)
   - `.summary-card` — styled card with currency label, big number for profit, smaller for income/expense
   - `.notification-banner` — colored banner (red for critical, yellow for warning)
   - `.property-table` — styled table matching existing table patterns in the app
   - `.export-btn` — button style for Excel (green accent) and PDF (red accent)
   - Profit positive = green text, negative = red text

7. **Create NotificationList page** `gurkan-ui/src/pages/Notifications/NotificationList.tsx`:
   - Import `getNotifications` from API client
   - Import types: `NotificationItem`, `NotificationTypeLabels`, `NotificationSeverity`
   - State: `notifications` (NotificationItem[]), `loading` (boolean)
   - useEffect: fetch notifications on mount
   - Render:
     - Page header: "Bildirimler"
     - List of notification cards, each showing:
       - Severity badge (Critical=red "Kritik", Warning=yellow "Uyarı", Info=blue "Bilgi")
       - Type label (from NotificationTypeLabels)
       - Message text
       - Property name as link to `/properties/{propertyId}`
       - Date formatted as Turkish locale
     - Group by severity: Critical first, then Warning, then Info
     - Empty state: "Bildirim bulunmuyor" with checkmark icon

8. **Create Notifications.css** `gurkan-ui/src/pages/Notifications/Notifications.css`:
   - `.notification-card` — card with left border color based on severity
   - `.severity-badge--Critical` — red background
   - `.severity-badge--Warning` — yellow/amber background
   - `.severity-badge--Info` — blue background
   - `.notification-type` — bold label
   - `.notification-message` — body text
   - `.notification-meta` — property link + date, muted color

9. **Verify:** Run `cd gurkan-ui && npm run build` — must compile with zero TypeScript errors.

## Must-Haves

- [ ] TypeScript interfaces for DashboardResponse, NotificationItem, ProfitLossReport, PropertyReport added to types/index.ts
- [ ] Enum-like types use `const` with `as const` pattern (K009)
- [ ] API client functions: getDashboard(), getNotifications(), getProfitLossReport(), exportExcel(), exportPdf()
- [ ] Export functions use responseType:'blob' and blob download pattern (matching existing downloadDocument)
- [ ] Layout.tsx sidebar has "Dashboard" and "Bildirimler" nav items with SVG icons
- [ ] App.tsx routes: /dashboard, /notifications added; default route changed to /dashboard
- [ ] Dashboard page renders summary cards per currency with income/expense/profit
- [ ] Dashboard page renders per-property breakdown table
- [ ] Dashboard page has working Excel and PDF export buttons
- [ ] NotificationList page renders severity-colored notification cards
- [ ] NotificationList links to property detail pages
- [ ] `npm run build` compiles with zero TypeScript errors

## Verification

- `cd gurkan-ui && npm run build` — zero errors, successful bundle
- Browser: login → lands on /dashboard → sees summary cards and property table
- Browser: click "Bildirimler" in sidebar → sees notification list with severity badges
- Browser: click Excel export → file downloads
- Browser: click PDF export → file downloads

## Inputs

- `gurkan-ui/src/types/index.ts` — existing types, add new interfaces at the end
- `gurkan-ui/src/api/client.ts` — existing API client with axios instance and `downloadDocument()` blob download pattern
- `gurkan-ui/src/App.tsx` — existing route structure to add /dashboard and /notifications
- `gurkan-ui/src/components/Layout.tsx` — existing sidebar with "Mülkler" NavLink to extend
- `gurkan-ui/src/components/Layout.css` — CSS custom properties and nav-item styles for reference
- `GurkanApi/DTOs/Dashboard/DashboardResponse.cs` (from T01) — DTO structure to match TypeScript interfaces
- `GurkanApi/DTOs/Notifications/NotificationResponse.cs` (from T01) — notification DTO to match
- `GurkanApi/DTOs/Reports/ReportResponse.cs` (from T02) — report DTO to match

## Expected Output

- `gurkan-ui/src/types/index.ts` — modified with ~80 lines of new interfaces and const enum objects
- `gurkan-ui/src/api/client.ts` — modified with 5 new API functions (~50 lines)
- `gurkan-ui/src/components/Layout.tsx` — modified with 2 new sidebar NavLinks
- `gurkan-ui/src/App.tsx` — modified with 2 new routes and updated default redirect
- `gurkan-ui/src/pages/Dashboard/Dashboard.tsx` — new, ~200 lines
- `gurkan-ui/src/pages/Dashboard/Dashboard.css` — new, ~150 lines
- `gurkan-ui/src/pages/Notifications/NotificationList.tsx` — new, ~120 lines
- `gurkan-ui/src/pages/Notifications/Notifications.css` — new, ~80 lines

## Observability Impact

- **Frontend network requests:** Browser DevTools Network tab shows requests to `/api/dashboard`, `/api/notifications`, `/api/reports/export/excel`, `/api/reports/export/pdf` — inspect HTTP status codes, payloads, and timing
- **Inspection surfaces:** Dashboard page renders live aggregated data from backend APIs, so all backend structured logs from T01/T02 apply (Dashboard/Notifications/Reports controller logging)
- **Failure visibility:** API errors surface as error banner in UI ("Dashboard verileri yüklenirken bir hata oluştu"), export failures show browser alert dialog with format name
- **Export state:** Export buttons show spinner during download, disabled state prevents double-clicks — inspect `exporting` state in React DevTools
- **Navigation:** Default authenticated route changed from `/properties` to `/dashboard` — visible in URL bar after login
