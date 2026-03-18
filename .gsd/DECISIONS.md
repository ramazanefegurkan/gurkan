# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001 | arch | Backend framework | ASP.NET Core Web API (controller-based) | Kullanıcı tercihi. Type safety, EF Core + PostgreSQL, iyi performans. | No |
| D002 | M001 | arch | Frontend framework | React + Vite + TypeScript | Kullanıcı tercihi. Component tabanlı, büyük ekosistem, iyi DX. | No |
| D003 | M001 | arch | Database | PostgreSQL | İlerde SaaS dönüşümü için uygun, JSON desteği, multi-currency raporlama. | No |
| D004 | M001 | arch | API authentication | JWT with refresh tokens | Ayrı frontend+backend mimarisi için standart. Email+şifre login. | Yes — social login eklenirse |
| D005 | M001 | arch | Erişim modeli | Grup bazlı (Superadmin → Grup Admin → Üye) | Mülkler gruplara, kullanıcılar gruplara atanır. Aile içi kullanım için esnek. | No |
| D006 | M001 | arch | Dosya storage | Lokal filesystem | Basitlik. Production'da Docker volume mount. İlerde object storage'a geçilebilir. | Yes — S3/MinIO gerekirse |
| D007 | M001 | convention | Multi-currency | TL + USD + EUR, kur dönüşümü yok | Raporlarda her para birimi ayrı gösterilir. Kur dönüşümü karmaşıklık ekler, gerek yok. | Yes — kur dönüşümü istenirse |
| D008 | M001 | arch | Frontend-backend ayrımı | Ayrı projeler, REST API | İlerde mobil app ve SaaS dönüşümü için uygun. Backend bağımsız API surface. | No |
| D009 | M001 | arch | Deploy stratejisi | Docker Compose (API + frontend + PostgreSQL) | Self-hosted VPS. Basit orchestration. | Yes — Kubernetes gerekirse |
| D010 | M001 | scope | Airbnb API | Kullanılmayacak (scope dışı) | Partner-only erişim, public API yok. Kısa dönem veriler manuel girilecek. | Yes — erişim sağlanırsa |
| D011 | M001/S06/T02 | library | Excel export library | ClosedXML 0.105.0 | Free, no native dependencies, good API for generating .xlsx workbooks. Used for per-property income/expense/profit/ROI report export. | Yes |
| D012 | M001/S06/T02 | library | PDF export library | QuestPDF 2026.2.3 (Community license) | Fluent C# API for PDF generation. Community license is free. Requires native Skia DLL — wrapped license init in try-catch for test hosts where native lib can't load. | Yes |
| D013 | M001/S06/T01 | architecture | Notification generation approach | Query-time computation, no persisted notification entities | Notifications are computed fresh on each GET /api/notifications request — no DB table, no migration. Triggers: late rent (DueDate+5 < now), upcoming/overdue bills (7-day window), lease expiry (30/60/90 day tiers), rent increase approaching. Simpler than background jobs or persisted state for the current in-app-only scope. | Yes — if email/push notifications (R019) are added, persistent notification state will be needed |
