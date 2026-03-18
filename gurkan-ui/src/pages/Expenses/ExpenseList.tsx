import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getExpenses, deleteExpense } from '../../api/client';
import {
  ExpenseCategoryLabels,
  type ExpenseResponse,
  type Currency,
  type ExpenseCategory,
} from '../../types';
import '../../styles/shared.css';
import './Expenses.css';

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

function formatCurrency(amount: number, currency: Currency): string {
  const symbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€';
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function categoryBadgeClass(category: ExpenseCategory): string {
  switch (category) {
    case 'Maintenance': return 'category-badge category-badge--maintenance';
    case 'Repair': return 'category-badge category-badge--repair';
    case 'Tax': return 'category-badge category-badge--tax';
    case 'Insurance': return 'category-badge category-badge--insurance';
    case 'Management': return 'category-badge category-badge--management';
    default: return 'category-badge category-badge--other';
  }
}

export default function ExpenseList() {
  const { id: propertyId } = useParams<{ id: string }>();
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getExpenses(propertyId!);
        if (!cancelled) setExpenses(data);
      } catch {
        if (!cancelled) setError('Giderler yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [propertyId]);

  async function handleDelete(expenseId: string) {
    if (!propertyId) return;
    if (!window.confirm('Bu gideri silmek istediğinize emin misiniz?')) return;

    setDeletingId(expenseId);
    try {
      await deleteExpense(propertyId, expenseId);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    } catch {
      setError('Gider silinemedi.');
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

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Giderler</h2>
          <p className="section-subtitle">{expenses.length} gider kaydı</p>
        </div>
        <Link
          to={`/properties/${propertyId}/expenses/new`}
          className="btn btn-primary btn-sm"
        >
          <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Yeni Gider
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

      {expenses.length > 0 && (
        <div className="expense-summary">
          <div className="expense-summary-item">
            <span className="expense-summary-label">Toplam Gider</span>
            <span className="expense-summary-value" style={{ color: 'var(--danger)' }}>
              {formatCurrency(totalExpense, expenses[0]?.currency ?? 'TRY')}
            </span>
          </div>
          <div className="expense-summary-item">
            <span className="expense-summary-label">Kayıt</span>
            <span className="expense-summary-value">{expenses.length}</span>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
          <p className="empty-state-title">Henüz gider kaydı yok</p>
          <p className="empty-state-text">Mülk giderlerini takip etmek için kayıt ekleyin.</p>
          <Link
            to={`/properties/${propertyId}/expenses/new`}
            className="btn btn-primary"
          >
            Yeni Gider
          </Link>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Kategori</th>
                <th>Açıklama</th>
                <th>Tutar</th>
                <th>Tekrarlayan</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="date">{formatDate(e.date)}</td>
                  <td>
                    <span className={categoryBadgeClass(e.category)}>
                      {ExpenseCategoryLabels[e.category]}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{e.description}</td>
                  <td className="amount">{formatCurrency(e.amount, e.currency)}</td>
                  <td>
                    {e.isRecurring ? (
                      <span className="recurring-yes">Evet{e.recurrenceInterval ? ` (${e.recurrenceInterval})` : ''}</span>
                    ) : (
                      <span className="recurring-no">Hayır</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Link
                        to={`/properties/${propertyId}/expenses/${e.id}/edit`}
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
                        onClick={() => handleDelete(e.id)}
                        disabled={deletingId === e.id}
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
