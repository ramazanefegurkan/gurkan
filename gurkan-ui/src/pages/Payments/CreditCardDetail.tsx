import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getCreditCard,
  getCreditCardStatements,
  getCreditCardSpendings,
  payStatement,
  deleteCreditCardSpending,
} from '../../api/client';
import type {
  CreditCardResponse,
  CreditCardStatementResponse,
  CreditCardSpendingResponse,
  Currency,
} from '../../types';
import '../../styles/shared.css';
import './Payments.css';

function formatCurrency(amount: number, currency: Currency): string {
  const symbol = currency === 'TRY' ? '\u20BA' : currency === 'USD' ? '$' : '\u20AC';
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

function formatStatementPeriod(statementDate: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(statementDate));
  } catch {
    return statementDate;
  }
}

export default function CreditCardDetail() {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<CreditCardResponse | null>(null);
  const [statements, setStatements] = useState<CreditCardStatementResponse[]>([]);
  const [spendings, setSpendings] = useState<CreditCardSpendingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [deletingSpendingId, setDeletingSpendingId] = useState<string | null>(null);
  const [expandedStatements, setExpandedStatements] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const [cardData, statementsData, spendingsData] = await Promise.all([
          getCreditCard(id!),
          getCreditCardStatements(id!),
          getCreditCardSpendings(id!),
        ]);
        if (!cancelled) {
          setCard(cardData);
          setStatements(statementsData);
          setSpendings(spendingsData);
        }
      } catch {
        if (!cancelled) setError('Veriler y\u00FCklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  async function handlePayStatement(statementId: string) {
    if (!id) return;
    setPayingId(statementId);
    try {
      const updated = await payStatement(id, statementId, {});
      setStatements((prev) => prev.map((s) => (s.id === statementId ? updated : s)));
      const cardData = await getCreditCard(id);
      setCard(cardData);
    } catch {
      setError('Ekstre \u00F6dendi olarak i\u015Faretlenemedi.');
    } finally {
      setPayingId(null);
    }
  }

  async function handleDeleteSpending(spendingId: string) {
    if (!id) return;
    if (!window.confirm('Bu harcamay\u0131 silmek istedi\u011Finize emin misiniz?')) return;

    setDeletingSpendingId(spendingId);
    try {
      await deleteCreditCardSpending(id, spendingId);
      setSpendings((prev) => prev.filter((s) => s.id !== spendingId));
    } catch {
      setError('Harcama silinemedi.');
    } finally {
      setDeletingSpendingId(null);
    }
  }

  function toggleStatement(statementId: string) {
    setExpandedStatements((prev) => {
      const next = new Set(prev);
      if (next.has(statementId)) {
        next.delete(statementId);
      } else {
        next.add(statementId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Kart bulunamad\u0131</p>
        <Link to="/payments/credit-cards" className="btn btn-primary">
          Kartlara D\u00F6n
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/payments/credit-cards" className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Kartlara D\u00F6n
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{card.name}</h1>
          <p className="page-subtitle">
            {card.bankName} &middot; Hesap Kesim: {card.billingDay}. g\u00FCn &middot; Son \u00D6deme: {card.dueDay}. g\u00FCn &middot; {card.currency}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={`transaction-type-badge ${card.isActive ? 'card-status-badge--active' : 'card-status-badge--inactive'}`}>
            {card.isActive ? 'Aktif' : 'Pasif'}
          </span>
        </div>
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

      <div className="payment-summary">
        <div className="payment-summary-item">
          <span className="payment-summary-label">G\u00FCncel Bor\u00E7</span>
          <span className="debt-amount">
            {formatCurrency(card.currentDebt, card.currency)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <Link to={`/payments/credit-cards/${id}/statements/new`} className="btn btn-primary btn-sm">
          Ekstre Gir
        </Link>
        <Link to={`/payments/credit-cards/${id}/spendings/new`} className="btn btn-secondary btn-sm">
          Harcama Ekle
        </Link>
        <Link to={`/payments/credit-cards/${id}/edit`} className="btn btn-ghost btn-sm">
          D\u00FCzenle
        </Link>
      </div>

      <div className="section-header">
        <div>
          <h2 className="section-title">Ekstreler</h2>
          <p className="section-subtitle">{statements.length} ekstre</p>
        </div>
      </div>

      {statements.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: 32 }}>
          <p className="empty-state-title">Hen\u00FCz ekstre girilmemi\u015F</p>
          <Link to={`/payments/credit-cards/${id}/statements/new`} className="btn btn-primary">
            Ekstre Gir
          </Link>
        </div>
      ) : (
        <div style={{ marginBottom: 32 }}>
          {statements.map((s) => (
            <div key={s.id} className="statement-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{formatStatementPeriod(s.statementDate)}</strong>
                  <span style={{ marginLeft: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
                    {formatCurrency(s.totalAmount, card.currency)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`status-badge ${s.isPaid ? 'status-badge--paid' : 'status-badge--pending'}`}>
                    {s.isPaid ? '\u00D6dendi' : 'Bekliyor'}
                  </span>
                  {!s.isPaid && (
                    <button
                      className="btn-pay"
                      onClick={() => handlePayStatement(s.id)}
                      disabled={payingId === s.id}
                    >
                      \u00D6dendi \u0130\u015Faretle
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleStatement(s.id)}
                    title={expandedStatements.has(s.id) ? 'Daralt' : 'Geni\u015Flet'}
                  >
                    <svg style={{ width: 14, height: 14, transform: expandedStatements.has(s.id) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              </div>

              {expandedStatements.has(s.id) && (
                <div className="statement-breakdown">
                  {s.itemizedSpendings.map((sp) => (
                    <div key={sp.id} className="statement-breakdown-item">
                      <span>{sp.description} ({formatDate(sp.date)})</span>
                      <span>{formatCurrency(sp.amount, card.currency)}</span>
                    </div>
                  ))}
                  {s.generalAmount > 0 && (
                    <div className="statement-breakdown-general">
                      <span>Genel Harcama</span>
                      <span>{formatCurrency(s.generalAmount, card.currency)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="section-header">
        <div>
          <h2 className="section-title">Son Harcamalar</h2>
          <p className="section-subtitle">{spendings.length} harcama</p>
        </div>
      </div>

      {spendings.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Hen\u00FCz harcama kayd\u0131 yok</p>
          <Link to={`/payments/credit-cards/${id}/spendings/new`} className="btn btn-primary">
            Harcama Ekle
          </Link>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>A\u00E7\u0131klama</th>
                <th>Tutar</th>
                <th>\u0130\u015Flemler</th>
              </tr>
            </thead>
            <tbody>
              {spendings.map((sp) => (
                <tr key={sp.id}>
                  <td className="date">{formatDate(sp.date)}</td>
                  <td>{sp.description}</td>
                  <td className="amount">{formatCurrency(sp.amount, card.currency)}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => handleDeleteSpending(sp.id)}
                      disabled={deletingSpendingId === sp.id}
                      title="Sil"
                    >
                      <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
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
