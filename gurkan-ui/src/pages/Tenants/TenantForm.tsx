import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getTenant,
  getTenants,
  createTenant,
  updateTenant,
} from '../../api/client';
import { Currency, CurrencyLabels } from '../../types';
import '../../styles/shared.css';
import './Tenants.css';

/** Convert date-only "YYYY-MM-DD" to UTC ISO string for backend compatibility */
function toUtcIso(date: string): string {
  return date ? `${date}T00:00:00Z` : date;
}

export default function TenantForm() {
  const { id: propertyId, tenantId } = useParams<{ id: string; tenantId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(tenantId);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [currency, setCurrency] = useState<string>(Currency.TRY);

  // Load existing tenant for edit
  useEffect(() => {
    if (!isEdit || !propertyId || !tenantId) return;
    let cancelled = false;

    async function load() {
      try {
        const t = await getTenant(propertyId!, tenantId!);
        if (!cancelled) {
          setFullName(t.fullName);
          setPhone(t.phone ?? '');
          setEmail(t.email ?? '');
          setIdentityNumber(t.identityNumber ?? '');
          setLeaseStart(t.leaseStart.split('T')[0]);
          setLeaseEnd(t.leaseEnd.split('T')[0]);
          setMonthlyRent(String(t.monthlyRent));
          setDeposit(String(t.deposit));
          setCurrency(t.currency);
        }
      } catch {
        if (!cancelled) setError('Kiracı bilgileri yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isEdit, propertyId, tenantId]);

  // Check if active tenant exists (for create mode warning)
  useEffect(() => {
    if (isEdit || !propertyId) return;
    let cancelled = false;

    async function check() {
      try {
        const active = await getTenants(propertyId!, true);
        if (!cancelled && active.length > 0) {
          setWarning(
            `Bu mülkte zaten aktif bir kiracı var (${active[0].fullName}). Yeni kiracı ekleyemezsiniz, önce mevcut sözleşmeyi sonlandırın.`,
          );
        }
      } catch {
        // ignore
      }
    }

    check();
    return () => { cancelled = true; };
  }, [isEdit, propertyId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!propertyId) return;

    setSubmitting(true);
    setError('');

    try {
      if (isEdit && tenantId) {
        await updateTenant(propertyId, tenantId, {
          fullName,
          phone: phone || null,
          email: email || null,
          identityNumber: identityNumber || null,
          leaseStart: leaseStart ? toUtcIso(leaseStart) : undefined,
          leaseEnd: leaseEnd ? toUtcIso(leaseEnd) : undefined,
          monthlyRent: monthlyRent ? Number(monthlyRent) : undefined,
          deposit: deposit ? Number(deposit) : undefined,
          currency: currency as typeof Currency.TRY,
        });
        navigate(`/properties/${propertyId}/tenants/${tenantId}`);
      } else {
        const created = await createTenant(propertyId, {
          fullName,
          phone: phone || null,
          email: email || null,
          identityNumber: identityNumber || null,
          leaseStart: toUtcIso(leaseStart),
          leaseEnd: toUtcIso(leaseEnd),
          monthlyRent: Number(monthlyRent),
          deposit: Number(deposit) || 0,
          currency: currency as typeof Currency.TRY,
        });
        navigate(`/properties/${propertyId}/tenants/${created.id}`);
      }
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
      <Link to={`/properties/${propertyId}/tenants`} className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Kiracılara Dön
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEdit ? 'Kiracıyı Düzenle' : 'Yeni Kiracı'}
          </h1>
          <p className="page-subtitle">
            {isEdit ? 'Kiracı bilgilerini güncelleyin' : 'Mülke yeni bir kiracı ekleyin'}
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

      {warning && !isEdit && (
        <div className="error-banner" style={{ background: '#fef9e7', borderColor: '#f5e6a3', color: '#8a6d00' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {warning}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <div className="form-section">
            <div className="form-section-title">Kişisel Bilgiler</div>

            <div className="form-field">
              <label className="form-label">
                Ad Soyad <span className="required">*</span>
              </label>
              <input
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={200}
                placeholder="Kiracının adı soyadı"
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Telefon</label>
                <input
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                  placeholder="0555 123 4567"
                />
              </div>
              <div className="form-field">
                <label className="form-label">E-posta</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={256}
                  placeholder="ornek@mail.com"
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">TC Kimlik No</label>
              <input
                className="form-input"
                value={identityNumber}
                onChange={(e) => setIdentityNumber(e.target.value)}
                maxLength={20}
                placeholder="TC kimlik numarası"
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Kira Detayları</div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  Kira Başlangıcı <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={leaseStart}
                  onChange={(e) => setLeaseStart(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">
                  Kira Bitişi <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={leaseEnd}
                  onChange={(e) => setLeaseEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-field">
                <label className="form-label">
                  Aylık Kira <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Depozito</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
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
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || (!!warning && !isEdit)}
            >
              {submitting
                ? 'Kaydediliyor...'
                : isEdit
                  ? 'Güncelle'
                  : 'Kiracı Ekle'}
            </button>
            <Link
              to={`/properties/${propertyId}/tenants`}
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
