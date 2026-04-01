import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCreditCards, deleteCreditCard } from '../../api/client';
import type { CreditCardListResponse, Currency } from '../../types';
import '../../styles/shared.css';
import './Payments.css';

function formatCurrency(amount: number, currency: Currency): string {
  const symbol = currency === 'TRY' ? '\u20BA' : currency === 'USD' ? '$' : '\u20AC';
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CreditCardList() {
  const [cards, setCards] = useState<CreditCardListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getCreditCards();
        if (!cancelled) setCards(data);
      } catch {
        if (!cancelled) setError('Kredi kartlar\u0131 y\u00FCklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm('Bu kredi kart\u0131n\u0131 silmek istedi\u011Finize emin misiniz?')) return;

    setDeletingId(id);
    try {
      await deleteCreditCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Kredi kart\u0131 silinemedi.');
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

  const debtByCurrency: Record<string, number> = {};
  cards.forEach((c) => {
    debtByCurrency[c.currency] = (debtByCurrency[c.currency] || 0) + c.currentDebt;
  });

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Kredi Kartlar\u0131</h2>
          <p className="section-subtitle">{cards.length} kart kayd\u0131</p>
        </div>
        <Link to="/payments/credit-cards/new" className="btn btn-primary btn-sm">
          <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Yeni Kart
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

      {cards.length > 0 && (
        <div className="payment-summary">
          {Object.entries(debtByCurrency).map(([cur, amount]) => (
            <div key={cur} className="payment-summary-item">
              <span className="payment-summary-label">Toplam Bor\u00E7 ({cur})</span>
              <span className="payment-summary-value" style={{ color: 'var(--danger)' }}>
                {formatCurrency(amount, cur as Currency)}
              </span>
            </div>
          ))}
          <div className="payment-summary-item">
            <span className="payment-summary-label">Kart Say\u0131s\u0131</span>
            <span className="payment-summary-value">{cards.length}</span>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <p className="empty-state-title">Hen\u00FCz kredi kart\u0131 kayd\u0131 yok</p>
          <p className="empty-state-text">Kredi kartlar\u0131n\u0131z\u0131 takip etmek i\u00E7in kay\u0131t ekleyin.</p>
          <Link to="/payments/credit-cards/new" className="btn btn-primary">
            Yeni Kart
          </Link>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Banka</th>
                <th>Para Birimi</th>
                <th>G\u00FCncel Bor\u00E7</th>
                <th>Durum</th>
                <th>\u0130\u015Flemler</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.bankName}</td>
                  <td>{c.currency}</td>
                  <td className="amount" style={{ color: 'var(--danger)' }}>
                    {formatCurrency(c.currentDebt, c.currency)}
                  </td>
                  <td>
                    <span className={`transaction-type-badge ${c.isActive ? 'card-status-badge--active' : 'card-status-badge--inactive'}`}>
                      {c.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Link
                        to={`/payments/credit-cards/${c.id}`}
                        className="btn btn-ghost btn-sm"
                        title="Detay"
                      >
                        <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Link>
                      <Link
                        to={`/payments/credit-cards/${c.id}/edit`}
                        className="btn btn-ghost btn-sm"
                        title="D\u00FCzenle"
                      >
                        <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </Link>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
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
