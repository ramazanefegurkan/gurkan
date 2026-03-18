import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBills, deleteBill, markBillPaid } from '../../api/client';
import {
  BillTypeLabels,
  BillPaymentStatusLabels,
  type BillResponse,
  type Currency,
  type BillType,
  type BillPaymentStatus,
} from '../../types';
import '../Properties/Properties.css';
import '../Tenants/Tenants.css';
import './Bills.css';

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

function billTypeBadgeClass(type: BillType): string {
  switch (type) {
    case 'Water': return 'bill-type-badge bill-type-badge--water';
    case 'Electric': return 'bill-type-badge bill-type-badge--electric';
    case 'Gas': return 'bill-type-badge bill-type-badge--gas';
    case 'Internet': return 'bill-type-badge bill-type-badge--internet';
    case 'Dues': return 'bill-type-badge bill-type-badge--dues';
    default: return 'bill-type-badge';
  }
}

function statusBadgeClass(status: BillPaymentStatus): string {
  switch (status) {
    case 'Paid': return 'status-badge status-badge--paid';
    case 'Overdue': return 'status-badge status-badge--overdue';
    default: return 'status-badge status-badge--pending';
  }
}

export default function BillList() {
  const { id: propertyId } = useParams<{ id: string }>();
  const [bills, setBills] = useState<BillResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getBills(propertyId!);
        if (!cancelled) setBills(data);
      } catch {
        if (!cancelled) setError('Faturalar yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [propertyId]);

  async function handleDelete(billId: string) {
    if (!propertyId) return;
    if (!window.confirm('Bu faturayı silmek istediğinize emin misiniz?')) return;

    setDeletingId(billId);
    try {
      await deleteBill(propertyId, billId);
      setBills((prev) => prev.filter((b) => b.id !== billId));
    } catch {
      setError('Fatura silinemedi.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handlePay(billId: string) {
    if (!propertyId) return;

    setPayingId(billId);
    try {
      const updated = await markBillPaid(propertyId, billId);
      setBills((prev) => prev.map((b) => (b.id === billId ? updated : b)));
    } catch {
      setError('Fatura ödendi olarak işaretlenemedi.');
    } finally {
      setPayingId(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  const totalBills = bills.reduce((sum, b) => sum + b.amount, 0);
  const pendingCount = bills.filter((b) => b.status === 'Pending' || b.status === 'Overdue').length;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Faturalar</h2>
          <p className="section-subtitle">{bills.length} fatura kaydı</p>
        </div>
        <Link
          to={`/properties/${propertyId}/bills/new`}
          className="btn btn-primary btn-sm"
        >
          <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Yeni Fatura
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

      {bills.length > 0 && (
        <div className="bill-summary">
          <div className="bill-summary-item">
            <span className="bill-summary-label">Toplam Fatura</span>
            <span className="bill-summary-value" style={{ color: 'var(--danger)' }}>
              {formatCurrency(totalBills, bills[0]?.currency ?? 'TRY')}
            </span>
          </div>
          <div className="bill-summary-item">
            <span className="bill-summary-label">Bekleyen</span>
            <span className="bill-summary-value">{pendingCount}</span>
          </div>
          <div className="bill-summary-item">
            <span className="bill-summary-label">Kayıt</span>
            <span className="bill-summary-value">{bills.length}</span>
          </div>
        </div>
      )}

      {bills.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p className="empty-state-title">Henüz fatura kaydı yok</p>
          <p className="empty-state-text">Mülk faturalarını takip etmek için kayıt ekleyin.</p>
          <Link
            to={`/properties/${propertyId}/bills/new`}
            className="btn btn-primary"
          >
            Yeni Fatura
          </Link>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tür</th>
                <th>Tutar</th>
                <th>Son Ödeme</th>
                <th>Ödeme Tarihi</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td>
                    <span className={billTypeBadgeClass(b.type)}>
                      {BillTypeLabels[b.type]}
                    </span>
                  </td>
                  <td className="amount">{formatCurrency(b.amount, b.currency)}</td>
                  <td className="date">{formatDate(b.dueDate)}</td>
                  <td className="date">{b.paidDate ? formatDate(b.paidDate) : '—'}</td>
                  <td>
                    <span className={statusBadgeClass(b.status)}>
                      {BillPaymentStatusLabels[b.status]}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(b.status === 'Pending' || b.status === 'Overdue') && (
                        <button
                          className="btn-pay"
                          onClick={() => handlePay(b.id)}
                          disabled={payingId === b.id}
                          title="Ödendi olarak işaretle"
                        >
                          Ödendi
                        </button>
                      )}
                      <Link
                        to={`/properties/${propertyId}/bills/${b.id}/edit`}
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
                        onClick={() => handleDelete(b.id)}
                        disabled={deletingId === b.id}
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
