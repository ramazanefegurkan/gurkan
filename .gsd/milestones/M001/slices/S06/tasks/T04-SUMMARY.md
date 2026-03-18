---
id: T04
parent: S06
milestone: M001
provides:
  - Dashboard page with multi-currency summary cards and per-property breakdown table
  - NotificationList page with severity-colored cards and property links
  - API client functions for dashboard, notifications, profit-loss reports, and blob export (Excel/PDF)
  - Sidebar navigation with Dashboard and Bildirimler links; default route changed to /dashboard
key_files:
  - gurkan-ui/src/pages/Dashboard/Dashboard.tsx
  - gurkan-ui/src/pages/Dashboard/Dashboard.css
  - gurkan-ui/src/pages/Notifications/NotificationList.tsx
  - gurkan-ui/src/pages/Notifications/Notifications.css
  - gurkan-ui/src/types/index.ts
  - gurkan-ui/src/api/client.ts
  - gurkan-ui/src/components/Layout.tsx
  - gurkan-ui/src/App.tsx
key_decisions:
  - Export buttons use inline blob download pattern (matching existing downloadDocument) rather than opening a new window
  - Notifications sorted by severity on the frontend (Critical → Warning → Info) for consistent priority ordering
  - Dashboard and NotificationList fetch data in parallel on mount with Promise.all for faster initial load
patterns_established:
  - Dashboard summary cards pattern: one card per currency from CurrencySummary[], profit color-coded green/red
  - Blob export button pattern: exporting state ('excel'|'pdf'|null) to show spinner and disable during download
  - Notification card pattern: left border color + severity badge + type label + message + property link
observability_surfaces:
  - Browser DevTools Network tab shows requests to /api/dashboard, /api/notifications, /api/reports/export/excel, /api/reports/export/pdf
  - Error banner in UI when API calls fail; alert dialog on export failure
  - Export buttons show spinner during download; disabled state prevents double-clicks
duration: ~20min
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T04: Build frontend Dashboard page, Notification list, and export wiring

**Added Dashboard and Notifications frontend pages with summary cards, per-property table, severity-colored notification cards, and Excel/PDF export buttons — all wired to S06 backend APIs**

## What Happened

Added TypeScript interfaces for DashboardResponse, NotificationItem, ProfitLossReport, and PropertyReport to `types/index.ts`, matching the backend DTOs exactly. Used `as const` pattern for NotificationType and NotificationSeverity enum-like objects (K009 compliance).

Added 5 API client functions to `client.ts`: getDashboard(), getNotifications(), getProfitLossReport(), exportExcel(), exportPdf(). The export functions use responseType:'blob' and the same blob download pattern as the existing downloadDocument() function.

Updated Layout.tsx sidebar with "Dashboard" (grid icon) and "Bildirimler" (bell icon) NavLinks before and after the existing "Mülkler" link respectively. Updated App.tsx: added /dashboard and /notifications routes, changed default authenticated route from /properties to /dashboard, and updated catch-all redirect to /dashboard.

Built Dashboard page with: notification banner (links to /notifications, shows critical/warning counts), summary cards grid (one per currency with profit/income/expense and unpaid rent/upcoming bill counts), per-property breakdown table with columns for name, type, income, expense, profit, unpaid rent, upcoming bills. Export buttons (Excel/PDF) with loading spinner and disabled state during download.

Built NotificationList page with severity-sorted notification cards, each showing a severity badge (Kritik/Uyarı/Bilgi), type label from NotificationTypeLabels, message text, property link, and Turkish-formatted date. Cards have colored left borders matching severity.

All CSS follows the existing design system (DM Sans + Playfair Display typography, terracotta accent, custom properties for colors/radius/surfaces).

## Verification

- `cd gurkan-ui && npm run build` — zero TypeScript errors, successful production bundle (38KB CSS, 378KB JS)
- `dotnet test GurkanApi.Tests/ --filter "Category=S06"` — all 16 S06 tests pass
- `dotnet test GurkanApi.Tests/` — full regression 77/77 pass

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 3.6s |
| 2 | `dotnet test GurkanApi.Tests/ --filter "Category=S06"` | 0 | ✅ pass | 9.8s |
| 3 | `dotnet test GurkanApi.Tests/` | 0 | ✅ pass | 24.7s |

## Diagnostics

- **Browser DevTools Network tab:** Filter on `/api/dashboard` or `/api/notifications` or `/api/reports/` to see API calls with status codes and payloads
- **Error UI:** Dashboard shows error banner "Dashboard verileri yüklenirken bir hata oluştu" if API calls fail; export failure shows browser alert
- **React DevTools:** Inspect `dashboard`, `notifications`, `exporting` state variables on Dashboard component
- **URL routing:** After login, browser navigates to `/dashboard` by default; catch-all also redirects to `/dashboard`

## Deviations

None.

## Known Issues

- Browser-based verification (login → dashboard → notifications → export) was not performed because the backend server is not running in this session. All verification was build-level (TypeScript compilation) and test-level (integration tests). The browser flow should be exercised during manual QA.

## Files Created/Modified

- `gurkan-ui/src/types/index.ts` — added ~90 lines: Dashboard, Notification, Report interfaces and const enum objects
- `gurkan-ui/src/api/client.ts` — added 5 API functions: getDashboard, getNotifications, getProfitLossReport, exportExcel, exportPdf
- `gurkan-ui/src/components/Layout.tsx` — added Dashboard and Bildirimler NavLinks with SVG icons
- `gurkan-ui/src/App.tsx` — added Dashboard/NotificationList imports, /dashboard and /notifications routes, default route → /dashboard
- `gurkan-ui/src/pages/Dashboard/Dashboard.tsx` — new: 230-line Dashboard page with summary cards, property table, notification banner, export buttons
- `gurkan-ui/src/pages/Dashboard/Dashboard.css` — new: 310-line CSS with summary cards grid, notification banner, property table, export buttons, responsive breakpoints
- `gurkan-ui/src/pages/Notifications/NotificationList.tsx` — new: 140-line notification list with severity sorting and Turkish locale formatting
- `gurkan-ui/src/pages/Notifications/Notifications.css` — new: 120-line CSS with severity-colored cards and badges
- `.gsd/milestones/M001/slices/S06/tasks/T04-PLAN.md` — added Observability Impact section (pre-flight fix)
