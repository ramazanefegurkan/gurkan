import { useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createCreditCardStatement } from '../../api/client';
import '../../styles/shared.css';
import './Payments.css';

const MONTHS = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: '\u015Eubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'May\u0131s' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'A\u011Fustos' },
  { value: 9, label: 'Eyl\u00FCl' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kas\u0131m' },
  { value: 12, label: 'Aral\u0131k' },
];

export default function StatementForm() {
  const { id: cardId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const now = new Date();
  const [totalAmount, setTotalAmount] = useState('');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cardId) return;

    setSubmitting(true);
    setError('');

    try {
      await createCreditCardStatement(cardId, {
        totalAmount: Number(totalAmount),
        month: Number(month),
        year: Number(year),
      });
      navigate(`/payments/credit-cards/${cardId}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? '\u0130\u015Flem ba\u015Far\u0131s\u0131z.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="property-form-container">
      <Link to={`/payments/credit-cards/${cardId}`} className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Kart Detay\u0131na D\u00F6n
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">Yeni Ekstre</h1>
          <p className="page-subtitle">Kredi kart\u0131 ekstre bilgilerini girin</p>
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
            <div className="form-section-title">Ekstre Bilgileri</div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  Toplam Bor\u00E7 <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  required
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Ay</label>
                <select
                  className="form-select"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Y\u0131l</label>
                <input
                  className="form-input"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min="2020"
                  max="2030"
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
              {submitting ? 'Kaydediliyor...' : 'Ekstre Ekle'}
            </button>
            <Link
              to={`/payments/credit-cards/${cardId}`}
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
