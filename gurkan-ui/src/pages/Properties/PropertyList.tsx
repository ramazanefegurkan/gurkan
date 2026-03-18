import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProperties } from '../../api/client';
import {
  PropertyTypeLabels,
  CurrencyLabels,
  Currency,
  type PropertyListResponse,
} from '../../types';
import './Properties.css';

export default function PropertyList() {
  const [properties, setProperties] = useState<PropertyListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchProperties() {
      try {
        const data = await getProperties();
        if (!cancelled) {
          setProperties(data);
          setError('');
        }
      } catch {
        if (!cancelled) {
          setError('Mülkler yüklenirken bir hata oluştu.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProperties();
    return () => { cancelled = true; };
  }, []);

  function currencyBadgeClass(currency: Currency): string {
    if (currency === Currency.USD) return 'badge badge-currency badge-currency--usd';
    if (currency === Currency.EUR) return 'badge badge-currency badge-currency--eur';
    return 'badge badge-currency';
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mülkler</h1>
          <p className="page-subtitle">
            {properties.length > 0
              ? `${properties.length} mülk listeleniyor`
              : 'Henüz mülk bulunmuyor'}
          </p>
        </div>
        <Link to="/properties/new" className="btn btn-primary">
          <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Yeni Mülk
        </Link>
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

      {/* ── Empty state ── */}
      {!error && properties.length === 0 && (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <h2 className="empty-state-title">Henüz mülk yok</h2>
          <p className="empty-state-text">İlk mülkünüzü ekleyerek başlayın.</p>
          <Link to="/properties/new" className="btn btn-primary">
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            İlk Mülkü Ekle
          </Link>
        </div>
      )}

      {/* ── Card grid ── */}
      {properties.length > 0 && (
        <div className="property-grid">
          {properties.map((p) => (
            <Link key={p.id} to={`/properties/${p.id}`} className="property-card">
              <div className="property-card-header">
                <span className="property-card-name">{p.name}</span>
                <span className="badge badge-type">
                  {PropertyTypeLabels[p.type] ?? 'Diğer'}
                </span>
              </div>
              <div className="property-card-meta">
                {p.city && (
                  <span className="property-card-city">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {p.city}
                  </span>
                )}
                <span className={currencyBadgeClass(p.currency)}>
                  {CurrencyLabels[p.currency] ?? 'TRY'}
                </span>
                {p.groupName && (
                  <span className="property-card-group">{p.groupName}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
