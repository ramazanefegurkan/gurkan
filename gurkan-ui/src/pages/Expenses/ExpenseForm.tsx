import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getExpense,
  createExpense,
  updateExpense,
} from '../../api/client';
import {
  ExpenseCategory,
  ExpenseCategoryLabels,
  Currency,
  CurrencyLabels,
} from '../../types';
import '../../styles/shared.css';
import './Expenses.css';

const RecurrenceIntervals = ['Monthly', 'Quarterly', 'Yearly'] as const;
const RecurrenceIntervalLabels: Record<string, string> = {
  Monthly: 'Aylık',
  Quarterly: '3 Aylık',
  Yearly: 'Yıllık',
};

/** Convert date-only "YYYY-MM-DD" to UTC ISO string for backend compatibility */
function toUtcIso(date: string): string {
  return date ? `${date}T00:00:00Z` : date;
}

export default function ExpenseForm() {
  const { id: propertyId, expenseId } = useParams<{ id: string; expenseId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(expenseId);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [category, setCategory] = useState<string>(ExpenseCategory.Maintenance);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<string>(Currency.TRY);
  const [date, setDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<string>('Monthly');
  const [notes, setNotes] = useState('');

  // Load existing expense for edit mode
  useEffect(() => {
    if (!isEdit || !propertyId || !expenseId) return;
    let cancelled = false;

    async function load() {
      try {
        const e = await getExpense(propertyId!, expenseId!);
        if (!cancelled) {
          setCategory(e.category);
          setDescription(e.description);
          setAmount(String(e.amount));
          setCurrency(e.currency);
          setDate(e.date.split('T')[0]);
          setIsRecurring(e.isRecurring);
          setRecurrenceInterval(e.recurrenceInterval ?? 'Monthly');
          setNotes(e.notes ?? '');
        }
      } catch {
        if (!cancelled) setError('Gider bilgileri yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isEdit, propertyId, expenseId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!propertyId) return;

    setSubmitting(true);
    setError('');

    const payload = {
      category: category as typeof ExpenseCategory.Maintenance,
      description,
      amount: Number(amount),
      currency: currency as typeof Currency.TRY,
      date: toUtcIso(date),
      isRecurring,
      recurrenceInterval: isRecurring ? recurrenceInterval : null,
      notes: notes || null,
    };

    try {
      if (isEdit && expenseId) {
        await updateExpense(propertyId, expenseId, payload);
      } else {
        await createExpense(propertyId, payload);
      }
      navigate(`/properties/${propertyId}/expenses`);
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
      <Link to={`/properties/${propertyId}/expenses`} className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Giderlere Dön
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEdit ? 'Gideri Düzenle' : 'Yeni Gider'}
          </h1>
          <p className="page-subtitle">
            {isEdit ? 'Gider bilgilerini güncelleyin' : 'Mülk gider kaydı ekleyin'}
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
            <div className="form-section-title">Gider Bilgileri</div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  Kategori <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {Object.entries(ExpenseCategoryLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">
                  Tarih <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">
                Açıklama <span className="required">*</span>
              </label>
              <input
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={500}
                placeholder="Gider açıklaması"
              />
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
            <div className="form-section-title">Tekrarlama</div>

            <div className="form-checkbox-row">
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              <label htmlFor="isRecurring">Tekrarlayan gider</label>
            </div>

            {isRecurring && (
              <div className="form-field" style={{ marginTop: 12 }}>
                <label className="form-label">Tekrarlama Aralığı</label>
                <select
                  className="form-select"
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(e.target.value)}
                >
                  {RecurrenceIntervals.map((val) => (
                    <option key={val} value={val}>{RecurrenceIntervalLabels[val]}</option>
                  ))}
                </select>
              </div>
            )}
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
                  : 'Gider Ekle'}
            </button>
            <Link
              to={`/properties/${propertyId}/expenses`}
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
