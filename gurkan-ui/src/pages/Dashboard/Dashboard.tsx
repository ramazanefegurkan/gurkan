import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, getNotifications, exportExcel, exportPdf } from '../../api/client';
import {
  CurrencyLabels,
  PropertyTypeLabels,
  NotificationSeverity,
  type DashboardResponse,
  type NotificationItem,
  type CurrencyAmount,
} from '../../types';
import './Dashboard.css';

function formatAmount(amount: number): string {
  return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrencyAmounts(amounts: CurrencyAmount[]): string {
  if (amounts.length === 0) return '—';
  return amounts.map((a) => `${formatAmount(a.amount)} ${CurrencyLabels[a.currency] ?? a.currency}`).join(', ');
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [dashData, notifData] = await Promise.all([getDashboard(), getNotifications()]);
        if (!cancelled) {
          setDashboard(dashData);
          setNotifications(notifData);
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
  }, []);

  async function handleExport(format: 'excel' | 'pdf') {
    setExporting(format);
    try {
      if (format === 'excel') {
        await exportExcel();
      } else {
        await exportPdf();
      }
    } catch {
      alert(`${format === 'excel' ? 'Excel' : 'PDF'} dışa aktarma başarısız oldu.`);
    } finally {
      setExporting(null);
    }
  }

  const criticalCount = notifications.filter((n) => n.severity === NotificationSeverity.Critical).length;
  const warningCount = notifications.filter((n) => n.severity === NotificationSeverity.Warning).length;

  // ── Loading ──
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
          <p className="page-subtitle">Portföy özeti ve finansal durum</p>
        </div>
        <div className="dashboard-export-actions">
          <button
            className="btn btn-export btn-export--excel"
            onClick={() => handleExport('excel')}
            disabled={exporting !== null}
          >
            {exporting === 'excel' ? (
              <span className="btn-spinner" />
            ) : (
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
            {exporting === 'pdf' ? (
              <span className="btn-spinner" />
            ) : (
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
            <span className="notification-banner-title">
              {notifications.length} bildirim
            </span>
            <span className="notification-banner-detail">
              {criticalCount > 0 && (
                <span className="notif-count notif-count--critical">{criticalCount} kritik</span>
              )}
              {warningCount > 0 && (
                <span className="notif-count notif-count--warning">{warningCount} uyarı</span>
              )}
            </span>
          </div>
          <svg className="notification-banner-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
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
          <p className="empty-state-text">
            Dashboard verilerini görmek için mülk ekleyin.
          </p>
          <Link to="/properties/new" className="btn btn-primary">
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            İlk Mülkü Ekle
          </Link>
        </div>
      )}

      {/* ── Summary cards ── */}
      {dashboard && dashboard.summary.length > 0 && (
        <div className="summary-cards">
          {dashboard.summary.map((s) => (
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
                  <span className="summary-card-alert summary-card-alert--danger">
                    {s.unpaidRentCount} ödenmemiş kira
                  </span>
                )}
                {s.upcomingBillCount > 0 && (
                  <span className="summary-card-alert summary-card-alert--warning">
                    {s.upcomingBillCount} yaklaşan fatura
                  </span>
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
      {dashboard && dashboard.properties.length > 0 && (
        <div className="property-table-section">
          <h2 className="section-title">Mülk Bazlı Durum</h2>
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
                {dashboard.properties.map((p) => (
                  <tr key={p.propertyId}>
                    <td>
                      <Link to={`/properties/${p.propertyId}`} className="property-table-link">
                        {p.propertyName}
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-type">
                        {PropertyTypeLabels[p.propertyType] ?? 'Diğer'}
                      </span>
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
