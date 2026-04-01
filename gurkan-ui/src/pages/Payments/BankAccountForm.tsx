import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { createBankAccount, getGroups } from '../../api/client';
import { Currency, CurrencyLabels, type GroupResponse } from '../../types';
import '../../styles/shared.css';
import './Payments.css';

export default function BankAccountForm() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [groupId, setGroupId] = useState('');
  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [currency, setCurrency] = useState<string>(Currency.TRY);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const g = await getGroups();
        if (!cancelled) {
          setGroups(g);
          if (g.length === 1) setGroupId(g[0].id);
        }
      } catch {
        if (!cancelled) setError('Gruplar yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!groupId) return;

    setSubmitting(true);
    setError('');

    try {
      await createBankAccount({
        groupId,
        holderName: holderName.trim(),
        bankName: bankName.trim(),
        iban: iban.trim() || null,
        currency: currency as Currency,
        description: description.trim() || null,
      });
      navigate('/payments/bank-accounts');
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
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Yeni Banka Hesabı</h2>
          <p className="section-subtitle">Yeni banka hesabı kaydı ekleyin</p>
        </div>
        <Link to="/payments/bank-accounts" className="btn btn-secondary btn-sm">
          Hesaplara Dön
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <div className="form-section">
            <div className="form-section-title">Hesap Bilgileri</div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  Hesap Sahibi <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="Ad Soyad"
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
                  maxLength={200}
                  placeholder="Banka adı"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">IBAN</label>
                <input
                  className="form-input"
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  maxLength={34}
                  placeholder="TR..."
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

            <div className="form-row">
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
              <div className="form-field">
                <label className="form-label">Açıklama</label>
                <input
                  className="form-input"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  placeholder="Opsiyonel açıklama"
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
              {submitting ? 'Kaydediliyor...' : 'Hesap Ekle'}
            </button>
            <Link to="/payments/bank-accounts" className="btn btn-secondary">
              İptal
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
