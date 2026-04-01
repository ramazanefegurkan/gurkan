import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  createBankTransaction,
  updateBankTransaction,
  getBankTransactions,
} from '../../api/client';
import {
  BankTransactionType,
  BankTransactionTypeLabels,
} from '../../types';
import '../../styles/shared.css';
import './Payments.css';

export default function BankTransactionForm() {
  const { id: accountId, transactionId } = useParams<{ id: string; transactionId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(transactionId);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [type, setType] = useState<string>(BankTransactionType.Income);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!isEdit || !accountId || !transactionId) return;
    let cancelled = false;

    async function load() {
      try {
        const transactions = await getBankTransactions(accountId!);
        const t = transactions.find((tx) => tx.id === transactionId);
        if (!cancelled && t) {
          setType(t.type);
          setDescription(t.description);
          setAmount(String(t.amount));
          setDate(t.date.split('T')[0]);
        }
      } catch {
        if (!cancelled) setError('\u0130\u015Flem bilgileri y\u00FCklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isEdit, accountId, transactionId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accountId) return;

    setSubmitting(true);
    setError('');

    try {
      if (isEdit && transactionId) {
        await updateBankTransaction(accountId, transactionId, {
          type: type as typeof BankTransactionType.Income,
          description,
          amount: Number(amount),
          date: `${date}T00:00:00Z`,
        });
      } else {
        await createBankTransaction(accountId, {
          type: type as typeof BankTransactionType.Income,
          description,
          amount: Number(amount),
          date: `${date}T00:00:00Z`,
        });
      }
      navigate(`/payments/bank-accounts/${accountId}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? '\u0130\u015Flem ba\u015Far\u0131s\u0131z.';
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
      <Link to={`/payments/bank-accounts/${accountId}`} className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Hesap Detay\u0131na D\u00F6n
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEdit ? '\u0130\u015Flemi D\u00FCzenle' : 'Yeni \u0130\u015Flem'}
          </h1>
          <p className="page-subtitle">
            {isEdit ? '\u0130\u015Flem bilgilerini g\u00FCncelleyin' : 'Banka hesab\u0131na i\u015Flem ekleyin'}
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
            <div className="form-section-title">\u0130\u015Flem Bilgileri</div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  T\u00FCr <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  <option value={BankTransactionType.Income}>
                    {BankTransactionTypeLabels[BankTransactionType.Income]}
                  </option>
                  <option value={BankTransactionType.Expense}>
                    {BankTransactionTypeLabels[BankTransactionType.Expense]}
                  </option>
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

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  A\u00E7\u0131klama <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="\u0130\u015Flem a\u00E7\u0131klamas\u0131"
                />
              </div>
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
                  ? 'G\u00FCncelle'
                  : '\u0130\u015Flem Ekle'}
            </button>
            <Link
              to={`/payments/bank-accounts/${accountId}`}
              className="btn btn-secondary"
            >
              \u0130ptal
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
