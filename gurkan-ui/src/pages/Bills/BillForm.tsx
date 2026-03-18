import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getBill,
  createBill,
  updateBill,
} from '../../api/client';
import {
  BillType,
  BillTypeLabels,
  Currency,
  CurrencyLabels,
} from '../../types';
import '../Properties/Properties.css';
import '../Tenants/Tenants.css';
import './Bills.css';

/** Convert date-only "YYYY-MM-DD" to UTC ISO string for backend compatibility */
function toUtcIso(date: string): string {
  return date ? `${date}T00:00:00Z` : date;
}

export default function BillForm() {
  const { id: propertyId, billId } = useParams<{ id: string; billId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(billId);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [type, setType] = useState<string>(BillType.Electric);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<string>(Currency.TRY);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Load existing bill for edit mode
  useEffect(() => {
    if (!isEdit || !propertyId || !billId) return;
    let cancelled = false;

    async function load() {
      try {
        const b = await getBill(propertyId!, billId!);
        if (!cancelled) {
          setType(b.type);
          setAmount(String(b.amount));
          setCurrency(b.currency);
          setDueDate(b.dueDate.split('T')[0]);
          setNotes(b.notes ?? '');
        }
      } catch {
        if (!cancelled) setError('Fatura bilgileri yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isEdit, propertyId, billId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!propertyId) return;

    setSubmitting(true);
    setError('');

    const payload = {
      type: type as typeof BillType.Electric,
      amount: Number(amount),
      currency: currency as typeof Currency.TRY,
      dueDate: toUtcIso(dueDate),
      notes: notes || null,
    };

    try {
      if (isEdit && billId) {
        await updateBill(propertyId, billId, payload);
      } else {
        await createBill(propertyId, payload);
      }
      navigate(`/properties/${propertyId}/bills`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'İşlem başarısız.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="property-form-container">
      <Link to={`/properties/${propertyId}/bills`} className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Faturalara Dön
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEdit ? 'Faturayı Düzenle' : 'Yeni Fatura'}
          </h1>
          <p className="page-subtitle">
            {isEdit ? 'Fatura bilgilerini güncelleyin' : 'Mülk fatura kaydı ekleyin'}
          </p>
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

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <div className="form-section">
            <div className="form-section-title">Fatura Bilgileri</div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  Fatura Türü <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  {Object.entries(BillTypeLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">
                  Son Ödeme Tarihi <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  Tutar <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="form-field">
                <label className="form-label">
                  Para Birimi <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  required
                >
                  {Object.entries(CurrencyLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-field">
              <label className="form-label">Notlar</label>
              <textarea
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                placeholder="Opsiyonel not..."
                rows={3}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting
                ? 'Kaydediliyor...'
                : isEdit
                  ? 'Güncelle'
                  : 'Fatura Ekle'}
            </button>
            <Link
              to={`/properties/${propertyId}/bills`}
              className="btn btn-secondary"
            >
              İptal
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
