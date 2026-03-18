import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTenants } from '../../api/client';
import { type TenantListItem, type Currency } from '../../types';
import '../../styles/shared.css';
import './Tenants.css';

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatMoney(amount: number, currency: Currency): string {
  const symbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€';
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TenantList() {
  const { id: propertyId } = useParams<{ id: string }>();
  const [activeTenants, setActiveTenants] = useState<TenantListItem[]>([]);
  const [pastTenants, setPastTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;

    async function load() {
      try {
        const all = await getTenants(propertyId!);
        if (!cancelled) {
          setActiveTenants(all.filter((t) => t.isActive));
          setPastTenants(all.filter((t) => !t.isActive));
          setError('');
        }
      } catch {
        if (!cancelled) setError('Kiracı listesi yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [propertyId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Active Tenant */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Aktif Kiracı</h2>
          <p className="section-subtitle">Bu mülkte şu an oturan kiracı</p>
        </div>
        {activeTenants.length === 0 && (
          <Link
            to={`/properties/${propertyId}/tenants/new`}
            className="btn btn-primary btn-sm"
          >
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Kiracı Ekle
          </Link>
        )}
      </div>

      {activeTenants.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <p className="empty-state-title">Aktif kiracı yok</p>
          <p className="empty-state-text">Bu mülke bir kiracı ekleyerek kira takibine başlayın.</p>
        </div>
      ) : (
        activeTenants.map((tenant) => (
          <div key={tenant.id} className="tenant-card" style={{ marginBottom: 24 }}>
            <div className="tenant-card-header">
              <div>
                <div className="tenant-card-name">{tenant.fullName}</div>
                {(tenant.phone || tenant.email) && (
                  <div className="tenant-card-contact">
                    {tenant.phone && <span>{tenant.phone}</span>}
                    {tenant.phone && tenant.email && <span> · </span>}
                    {tenant.email && <span>{tenant.email}</span>}
                  </div>
                )}
              </div>
              <span className="status-badge status-badge--active">Aktif</span>
            </div>
            <div className="tenant-card-grid">
              <div>
                <div className="tenant-card-field-label">Kira Başlangıcı</div>
                <div className="tenant-card-field-value">{formatDate(tenant.leaseStart)}</div>
              </div>
              <div>
                <div className="tenant-card-field-label">Kira Bitişi</div>
                <div className="tenant-card-field-value">{formatDate(tenant.leaseEnd)}</div>
              </div>
              <div>
                <div className="tenant-card-field-label">Aylık Kira</div>
                <div className="tenant-card-field-value">
                  {formatMoney(tenant.monthlyRent, tenant.currency)}
                </div>
              </div>
            </div>
            <div className="tenant-card-actions">
              <Link
                to={`/properties/${propertyId}/tenants/${tenant.id}`}
                className="btn btn-primary btn-sm"
              >
                Detaylar
              </Link>
              <Link
                to={`/properties/${propertyId}/tenants/${tenant.id}/edit`}
                className="btn btn-secondary btn-sm"
              >
                Düzenle
              </Link>
            </div>
          </div>
        ))
      )}

      {/* Past Tenants */}
      {pastTenants.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 32 }}>
            <div>
              <h2 className="section-title">Geçmiş Kiracılar</h2>
              <p className="section-subtitle">{pastTenants.length} önceki kiracı</p>
            </div>
          </div>
          <div className="past-tenant-list">
            {pastTenants.map((tenant) => (
              <Link
                key={tenant.id}
                to={`/properties/${propertyId}/tenants/${tenant.id}`}
                className="past-tenant-item"
              >
                <div className="past-tenant-info">
                  <span className="past-tenant-name">{tenant.fullName}</span>
                  <span className="past-tenant-dates">
                    {formatDate(tenant.leaseStart)} — {formatDate(tenant.leaseEnd)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {formatMoney(tenant.monthlyRent, tenant.currency)}
                  </span>
                  <span className="status-badge status-badge--inactive">Sonlanmış</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
