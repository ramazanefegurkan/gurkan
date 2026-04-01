import { useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createCreditCardSpending } from '../../api/client';
import '../../styles/shared.css';
import './Payments.css';

export default function SpendingForm() {
  const { id: cardId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cardId) return;

    setSubmitting(true);
    setError('');

    try {
      await createCreditCardSpending(cardId, {
        description,
        amount: Number(amount),
        date: `${date}T00:00:00Z`,
      });
      navigate(`/payments/credit-cards/${cardId}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'İşlem başarısız.';
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
        Kart Detayına Dön
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">Yeni Harcama</h1>
          <p className="page-subtitle">Kredi kartı harcama kaydı ekleyin</p>
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
            <div className="form-section-title">Harcama Bilgileri</div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  Açıklama <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Harcama açıklaması"
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
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Kaydediliyor...' : 'Harcama Ekle'}
            </button>
            <Link
              to={`/payments/credit-cards/${cardId}`}
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
