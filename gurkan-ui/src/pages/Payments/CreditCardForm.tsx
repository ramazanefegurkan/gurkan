import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getCreditCard,
  createCreditCard,
  updateCreditCard,
  getGroups,
} from '../../api/client';
import { Currency, CurrencyLabels } from '../../types';
import type { GroupResponse } from '../../types';
import '../../styles/shared.css';
import './Payments.css';

export default function CreditCardForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [billingDay, setBillingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [currency, setCurrency] = useState<string>(Currency.TRY);
  const [isActive, setIsActive] = useState(true);
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState<GroupResponse[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [groupsData, cardData] = await Promise.all([
          isEdit ? Promise.resolve([]) : getGroups(),
          isEdit && id ? getCreditCard(id) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (!isEdit) setGroups(groupsData);

        if (cardData) {
          setName(cardData.name);
          setBankName(cardData.bankName);
          setBillingDay(String(cardData.billingDay));
          setDueDay(String(cardData.dueDay));
          setCurrency(cardData.currency);
          setIsActive(cardData.isActive);
        }
      } catch {
        if (!cancelled) setError('Veriler yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isEdit, id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (isEdit && id) {
        await updateCreditCard(id, {
          name,
          bankName,
          billingDay: Number(billingDay),
          dueDay: Number(dueDay),
          currency: currency as Currency,
          isActive,
        });
      } else {
        await createCreditCard({
          groupId,
          name,
          bankName,
          billingDay: Number(billingDay),
          dueDay: Number(dueDay),
          currency: currency as Currency,
        });
      }
      navigate('/payments/credit-cards');
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
      <Link to="/payments/credit-cards" className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Kartlara Dön
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEdit ? 'Kartı Düzenle' : 'Yeni Kredi Kartı'}
          </h1>
          <p className="page-subtitle">
            {isEdit ? 'Kart bilgilerini güncelleyin' : 'Yeni kredi kartı kaydı ekleyin'}
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
            <div className="form-section-title">Kart Bilgileri</div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  Ad <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Kart adı"
                />
              </div>
              <div className="form-field">
                <label className="form-label">
                  Banka Adı <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  placeholder="Banka adı"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  Hesap Kesim Günü <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max="31"
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
                  required
                  placeholder="1-31"
                />
              </div>
              <div className="form-field">
                <label className="form-label">
                  Son Ödeme Günü <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  required
                  placeholder="1-31"
                />
              </div>
            </div>

            <div className="form-row">
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
              {!isEdit && (
                <div className="form-field">
                  <label className="form-label">
                    Grup <span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    required
                  >
                    <option value="">Grup seçin</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {isEdit && (
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    Aktif
                  </label>
                </div>
              </div>
            )}
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
                  : 'Kart Ekle'}
            </button>
            <Link to="/payments/credit-cards" className="btn btn-secondary">
              İptal
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
