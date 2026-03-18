import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getShortTermRentals,
  deleteShortTermRental,
} from '../../api/client';
import {
  RentalPlatformLabels,
  type ShortTermRentalResponse,
  type Currency,
  type RentalPlatform,
} from '../../types';
import '../Properties/Properties.css';
import '../Tenants/Tenants.css';
import './ShortTermRentals.css';

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

function platformBadgeClass(platform: RentalPlatform): string {
  switch (platform) {
    case 'Airbnb': return 'platform-badge platform-badge--airbnb';
    case 'Booking': return 'platform-badge platform-badge--booking';
    default: return 'platform-badge platform-badge--direct';
  }
}

export default function ShortTermRentalList() {
  const { id: propertyId } = useParams<{ id: string }>();
  const [rentals, setRentals] = useState<ShortTermRentalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getShortTermRentals(propertyId!);
        if (!cancelled) setRentals(data);
      } catch {
        if (!cancelled) setError('Rezervasyonlar yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [propertyId]);

  async function handleDelete(rentalId: string) {
    if (!propertyId) return;
    if (!window.confirm('Bu rezervasyonu silmek istediğinize emin misiniz?')) return;

    setDeletingId(rentalId);
    try {
      await deleteShortTermRental(propertyId, rentalId);
      setRentals((prev) => prev.filter((r) => r.id !== rentalId));
    } catch {
      setError('Rezervasyon silinemedi.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Summary stats
  const totalRevenue = rentals.reduce((sum, r) => sum + r.netAmount, 0);
  const totalNights = rentals.reduce((sum, r) => sum + r.nightCount, 0);

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Kısa Dönem Kiralama</h2>
          <p className="section-subtitle">{rentals.length} rezervasyon</p>
        </div>
        <Link
          to={`/properties/${propertyId}/short-term-rentals/new`}
          className="btn btn-primary btn-sm"
        >
          <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Yeni Rezervasyon
        </Link>
      </div>

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

      {rentals.length > 0 && (
        <div className="str-summary">
          <div className="str-summary-item">
            <span className="str-summary-label">Toplam Gece</span>
            <span className="str-summary-value">{totalNights}</span>
          </div>
          <div className="str-summary-item">
            <span className="str-summary-label">Net Gelir</span>
            <span className="str-summary-value" style={{ color: '#2e7d32' }}>
              {formatMoney(totalRevenue, rentals[0]?.currency ?? 'TRY')}
            </span>
          </div>
          <div className="str-summary-item">
            <span className="str-summary-label">Rezervasyon</span>
            <span className="str-summary-value">{rentals.length}</span>
          </div>
        </div>
      )}

      {rentals.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="empty-state-title">Henüz rezervasyon yok</p>
          <p className="empty-state-text">Kısa dönem kiralama kaydı ekleyerek gelir takibi yapın.</p>
          <Link
            to={`/properties/${propertyId}/short-term-rentals/new`}
            className="btn btn-primary"
          >
            Yeni Rezervasyon
          </Link>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Misafir</th>
                <th>Giriş</th>
                <th>Çıkış</th>
                <th>Gece</th>
                <th>Toplam</th>
                <th>Komisyon</th>
                <th>Net</th>
                <th>Platform</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.guestName || '—'}</td>
                  <td className="date">{formatDate(r.checkIn)}</td>
                  <td className="date">{formatDate(r.checkOut)}</td>
                  <td style={{ textAlign: 'center' }}>{r.nightCount}</td>
                  <td className="amount">{formatMoney(r.totalAmount, r.currency)}</td>
                  <td className="amount" style={{ color: 'var(--danger)' }}>
                    {r.platformFee > 0 ? `-${formatMoney(r.platformFee, r.currency)}` : '—'}
                  </td>
                  <td className="amount" style={{ color: '#2e7d32' }}>
                    {formatMoney(r.netAmount, r.currency)}
                  </td>
                  <td>
                    <span className={platformBadgeClass(r.platform)}>
                      {RentalPlatformLabels[r.platform]}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Link
                        to={`/properties/${propertyId}/short-term-rentals/${r.id}/edit`}
                        className="btn btn-ghost btn-sm"
                        title="Düzenle"
                      >
                        <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </Link>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        title="Sil"
                      >
                        <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
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
