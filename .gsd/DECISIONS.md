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
