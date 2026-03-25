import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllTenants } from '../../api/client';
import { CurrencyLabels, type GlobalTenantListItem } from '../../types';
import '../../styles/shared.css';

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatMoney(amount: number, currency: string): string {
  const symbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€';
  return `${symbol}${amount.toLocaleString('tr-TR')}`;
}

export default function AllTenantList() {
  const [tenants, setTenants] = useState<GlobalTenantListItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const active = filter === 'all' ? undefined : filter === 'active';
    getAllTenants(active)
      .then((data) => { if (!cancelled) setTenants(data); })
      .catch(() => { if (!cancelled) setError('Kiracılar yüklenirken hata oluştu.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Kiracılar</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['active', 'past', 'all'] as const).map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'active' ? 'Aktif' : f === 'past' ? 'Geçmiş' : 'Tümü'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : tenants.length === 0 ? (
        <div className="empty-state">Kiracı bulunamadı.</div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kiracı</th>
                <th>Mülk</th>
                <th>Telefon</th>
                <th>Kira Başlangıç</th>
                <th>Kira Bitiş</th>
                <th>Aylık Kira</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/properties/${t.propertyId}/tenants/${t.id}`} className="table-link">
                      {t.fullName}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/properties/${t.propertyId}`} className="table-link">
                      {t.propertyName}
                    </Link>
                  </td>
                  <td>{t.phone ?? '—'}</td>
                  <td>{formatDate(t.leaseStart)}</td>
                  <td>{formatDate(t.leaseEnd)}</td>
                  <td>{formatMoney(t.monthlyRent, t.currency)} <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{CurrencyLabels[t.currency]}</span></td>
                  <td>
                    <span className={`badge ${t.isActive ? 'badge-status--active' : 'badge-status--inactive'}`}>
                      {t.isActive ? 'Aktif' : 'Sonlanmış'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
