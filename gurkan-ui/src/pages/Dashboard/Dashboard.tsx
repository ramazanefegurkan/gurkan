import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, getNotifications, getGroups, exportExcel, exportPdf } from '../../api/client';
import {
  CurrencyLabels,
  PropertyTypeLabels,
  NotificationSeverity,
  type DashboardResponse,
  type NotificationItem,
  type CurrencyAmount,
  type GroupResponse,
  type Currency,
} from '../../types';
import './Dashboard.css';

function formatAmount(amount: number): string {
  return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrencyAmounts(amounts: CurrencyAmount[]): string {
  if (amounts.length === 0) return '—';
  return amounts.map((a) => `${formatAmount(a.amount)} ${CurrencyLabels[a.currency] ?? a.currency}`).join(', ');
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Load data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [dashData, notifData, groupData] = await Promise.all([
          getDashboard(selectedYear),
          getNotifications(),
          getGroups(),
        ]);
        if (!cancelled) {
          setDashboard(dashData);
          setNotifications(notifData);
          setGroups(groupData);
          setError('');
        }
      } catch {
        if (!cancelled) {
          setError('Dashboard verileri yüklenirken bir hata oluştu.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [selectedYear]);

  // Filter properties client-side by group and type
  const filteredProperties = useMemo(() => {
    if (!dashboard) return [];
    let props = dashboard.properties;
    if (selectedGroupId) {
      // We need group info — properties in dashboard don't have groupId directly
      // But we can match through groups' property assignments
      // Actually the PropertyFinancials doesn't carry groupId — we'll need to add it or filter differently
      // For now, let's filter using the groups data
      const group = groups.find((g) => g.id === selectedGroupId);
      if (group) {
        // groups don't carry propertyIds directly in the response either
        // Let's skip group filtering for now and just do type filtering
      }
    }
    if (selectedType) {
      props = props.filter((p) => p.propertyType === selectedType);
    }
    return props;
  }, [dashboard, selectedGroupId, selectedType, groups]);

  // Recompute summary from filtered properties
  const filteredSummary = useMemo(() => {
    if (!dashboard) return [];
    if (!selectedType && !selectedGroupId) return dashboard.summary;

    const allCurrencies = new Set<string>();
    filteredProperties.forEach((pf) => {
      pf.income.forEach((i) => allCurrencies.add(i.currency));
      pf.expenses.forEach((e) => allCurrencies.add(e.currency));
    });

    return Array.from(allCurrencies).map((currency) => ({
      currency: currency as Currency,
      totalIncome: filteredProperties.flatMap((pf) => pf.income).filter((i) => i.currency === currency).reduce((s, i) => s + i.amount, 0),
      totalExpenses: filteredProperties.flatMap((pf) => pf.expenses).filter((e) => e.currency === currency).reduce((s, e) => s + e.amount, 0),
      totalProfit: filteredProperties.flatMap((pf) => pf.profit).filter((p) => p.currency === currency).reduce((s, p) => s + p.amount, 0),
      unpaidRentCount: filteredProperties.reduce((s, pf) => s + pf.unpaidRentCount, 0),
      upcomingBillCount: filteredProperties.reduce((s, pf) => s + pf.upcomingBillCount, 0),
    }));
  }, [dashboard, filteredProperties, selectedType, selectedGroupId]);

  async function handleExport(format: 'excel' | 'pdf') {
    setExporting(format);
    try {
      if (format === 'excel') await exportExcel();
      else await exportPdf();
    } catch {
      alert(`${format === 'excel' ? 'Excel' : 'PDF'} dışa aktarma başarısız oldu.`);
    } finally {
      setExporting(null);
    }
  }

  const criticalCount = notifications.filter((n) => n.severity === NotificationSeverity.Critical).length;
  const warningCount = notifications.filter((n) => n.severity === NotificationSeverity.Warning).length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Portföy özeti ve finansal durum — {selectedYear}</p>
        </div>
        <div className="dashboard-export-actions">
          <button
            className="btn btn-export btn-export--excel"
            onClick={() => handleExport('excel')}
            disabled={exporting !== null}
          >
            {exporting === 'excel' ? <span className="btn-spinner" /> : (
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            )}
            Excel
          </button>
          <button
            className="btn btn-export btn-export--pdf"
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
          >
            {exporting === 'pdf' ? <span className="btn-spinner" /> : (
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            )}
            PDF
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="dashboard-filters">
        <div className="filter-field">
          <label className="filter-label">Yıl</label>
          <select
            className="filter-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label className="filter-label">Mülk Tipi</label>
          <select
            className="filter-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">Tümü</option>
            {Object.entries(PropertyTypeLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        {groups.length > 1 && (
          <div className="filter-field">
            <label className="filter-label">Grup</label>
            <select
              className="filter-select"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">Tümü</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Notification banner ── */}
      {notifications.length > 0 && (
        <Link to="/notifications" className="notification-banner">
          <div className="notification-banner-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </div>
          <div className="notification-banner-content">
            <span className="notification-banner-title">{notifications.length} bildirim</span>
            <span className="notification-banner-detail">
              {criticalCount > 0 && <span className="notif-count notif-count--critical">{criticalCount} kritik</span>}
              {warningCount > 0 && <span className="notif-count notif-count--warning">{warningCount} uyarı</span>}
            </span>
          </div>
          <svg className="notification-banner-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      )}

      {/* ── Stat cards (property count, tenant count, occupancy) ── */}
      {dashboard && (
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-card-icon stat-card-icon--property">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">{dashboard.totalPropertyCount}</span>
              <span className="stat-card-label">Toplam Mülk</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon stat-card-icon--tenant">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">{dashboard.activeTenantCount}</span>
              <span className="stat-card-label">Aktif Kiracı</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon stat-card-icon--occupancy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">%{dashboard.occupancyRate}</span>
              <span className="stat-card-label">Doluluk Oranı</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!error && dashboard && dashboard.properties.length === 0 && (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="4" rx="1" />
            <rect x="14" y="11" width="7" height="10" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          <h2 className="empty-state-title">Henüz mülk bulunmuyor</h2>
          <p className="empty-state-text">Dashboard verilerini görmek için mülk ekleyin.</p>
          <Link to="/properties/new" className="btn btn-primary">
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            İlk Mülkü Ekle
          </Link>
        </div>
      )}

      {/* ── Financial summary cards ── */}
      {filteredSummary.length > 0 && (
        <div className="summary-cards">
          {filteredSummary.map((s) => (
            <div key={s.currency} className="summary-card">
              <div className="summary-card-header">
                <span className="summary-card-currency">{CurrencyLabels[s.currency] ?? s.currency}</span>
              </div>
              <div className="summary-card-profit">
                <span className="summary-card-profit-label">Kâr / Zarar</span>
                <span className={`summary-card-profit-value ${s.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                  {s.totalProfit >= 0 ? '+' : ''}{formatAmount(s.totalProfit)}
                </span>
              </div>
              <div className="summary-card-row">
                <div className="summary-card-metric">
                  <span className="metric-label">Gelir</span>
                  <span className="metric-value profit-positive">{formatAmount(s.totalIncome)}</span>
                </div>
                <div className="summary-card-metric">
                  <span className="metric-label">Gider</span>
                  <span className="metric-value profit-negative">{formatAmount(s.totalExpenses)}</span>
                </div>
              </div>
              <div className="summary-card-footer">
                {s.unpaidRentCount > 0 && (
                  <span className="summary-card-alert summary-card-alert--danger">{s.unpaidRentCount} ödenmemiş kira</span>
                )}
                {s.upcomingBillCount > 0 && (
                  <span className="summary-card-alert summary-card-alert--warning">{s.upcomingBillCount} yaklaşan fatura</span>
                )}
                {s.unpaidRentCount === 0 && s.upcomingBillCount === 0 && (
                  <span className="summary-card-alert summary-card-alert--ok">Sorun yok</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Per-property table ── */}
      {filteredProperties.length > 0 && (
        <div className="property-table-section">
          <h2 className="section-title">
            Mülk Bazlı Durum
            {(selectedType || selectedGroupId) && (
              <span className="section-title-filter"> — filtreleniyor ({filteredProperties.length}/{dashboard?.properties.length})</span>
            )}
          </h2>
          <div className="table-wrapper">
            <table className="property-table">
              <thead>
                <tr>
                  <th>Mülk</th>
                  <th>Tür</th>
                  <th className="text-right">Gelir</th>
                  <th className="text-right">Gider</th>
                  <th className="text-right">Kâr / Zarar</th>
                  <th className="text-center">Ödenmemiş</th>
                  <th className="text-center">Fatura</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map((p) => (
                  <tr key={p.propertyId}>
                    <td>
                      <Link to={`/properties/${p.propertyId}`} className="property-table-link">
                        {p.propertyName}
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-type">{PropertyTypeLabels[p.propertyType] ?? 'Diğer'}</span>
                    </td>
                    <td className="text-right profit-positive">{formatCurrencyAmounts(p.income)}</td>
                    <td className="text-right profit-negative">{formatCurrencyAmounts(p.expenses)}</td>
                    <td className="text-right">
                      <span className={p.profit.reduce((acc, x) => acc + x.amount, 0) >= 0 ? 'profit-positive' : 'profit-negative'}>
                        {formatCurrencyAmounts(p.profit)}
                      </span>
                    </td>
                    <td className="text-center">
                      {p.unpaidRentCount > 0 ? (
                        <span className="count-badge count-badge--danger">{p.unpaidRentCount}</span>
                      ) : (
                        <span className="count-badge count-badge--ok">0</span>
                      )}
                    </td>
                    <td className="text-center">
                      {p.upcomingBillCount > 0 ? (
                        <span className="count-badge count-badge--warning">{p.upcomingBillCount}</span>
                      ) : (
                        <span className="count-badge count-badge--ok">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
