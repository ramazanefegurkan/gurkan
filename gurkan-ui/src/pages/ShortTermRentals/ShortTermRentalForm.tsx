import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getShortTermRental,
  createShortTermRental,
  updateShortTermRental,
} from '../../api/client';
import {
  Currency,
  CurrencyLabels,
  RentalPlatform,
  RentalPlatformLabels,
} from '../../types';
import '../../styles/shared.css';
import './ShortTermRentals.css';

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/** Convert date-only "YYYY-MM-DD" to UTC ISO string for backend compatibility */
function toUtcIso(date: string): string {
  return date ? `${date}T00:00:00Z` : date;
}

export default function ShortTermRentalForm() {
  const { id: propertyId, rentalId } = useParams<{ id: string; rentalId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(rentalId);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [guestName, setGuestName] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [nightlyRate, setNightlyRate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [platformFee, setPlatformFee] = useState('0');
  const [netAmount, setNetAmount] = useState('');
  const [platform, setPlatform] = useState<string>(RentalPlatform.Direct);
  const [currency, setCurrency] = useState<string>(Currency.TRY);
  const [notes, setNotes] = useState('');

  const nightCount = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;

  // Auto-compute totalAmount from nightlyRate * nightCount
  useEffect(() => {
    if (nightlyRate && nightCount > 0) {
      const total = Number(nightlyRate) * nightCount;
      setTotalAmount(total.toFixed(2));
    }
  }, [nightlyRate, nightCount]);

  // Auto-compute netAmount from totalAmount - platformFee
  useEffect(() => {
    if (totalAmount) {
      const net = Number(totalAmount) - Number(platformFee || 0);
      setNetAmount(net.toFixed(2));
    }
  }, [totalAmount, platformFee]);

  // Load existing for edit
  useEffect(() => {
    if (!isEdit || !propertyId || !rentalId) return;
    let cancelled = false;

    async function load() {
      try {
        const r = await getShortTermRental(propertyId!, rentalId!);
        if (!cancelled) {
          setGuestName(r.guestName ?? '');
          setCheckIn(r.checkIn.split('T')[0]);
          setCheckOut(r.checkOut.split('T')[0]);
          setNightlyRate(String(r.nightlyRate));
          setTotalAmount(String(r.totalAmount));
          setPlatformFee(String(r.platformFee));
          setNetAmount(String(r.netAmount));
          setPlatform(r.platform);
          setCurrency(r.currency);
          setNotes(r.notes ?? '');
        }
      } catch {
        if (!cancelled) setError('Rezervasyon bilgileri yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isEdit, propertyId, rentalId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!propertyId) return;

    setSubmitting(true);
    setError('');

    try {
      if (isEdit && rentalId) {
        await updateShortTermRental(propertyId, rentalId, {
          guestName: guestName || null,
          checkIn: checkIn ? toUtcIso(checkIn) : undefined,
          checkOut: checkOut ? toUtcIso(checkOut) : undefined,
          nightlyRate: nightlyRate ? Number(nightlyRate) : undefined,
          totalAmount: totalAmount ? Number(totalAmount) : undefined,
          platformFee: platformFee ? Number(platformFee) : undefined,
          netAmount: netAmount ? Number(netAmount) : undefined,
          platform: (platform as typeof RentalPlatform.Direct) || undefined,
          currency: (currency as typeof Currency.TRY) || undefined,
          notes: notes || null,
        });
      } else {
        await createShortTermRental(propertyId, {
          guestName: guestName || null,
          checkIn: toUtcIso(checkIn),
          checkOut: toUtcIso(checkOut),
          nightlyRate: Number(nightlyRate),
          totalAmount: Number(totalAmount),
          platformFee: Number(platformFee) || 0,
          netAmount: Number(netAmount),
          platform: platform as typeof RentalPlatform.Direct,
          currency: currency as typeof Currency.TRY,
          notes: notes || null,
        });
      }
      navigate(`/properties/${propertyId}/short-term-rentals`);
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
      <Link to={`/properties/${propertyId}/short-term-rentals`} className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Rezervasyonlara Dön
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEdit ? 'Rezervasyonu Düzenle' : 'Yeni Rezervasyon'}
          </h1>
          <p className="page-subtitle">
            {isEdit ? 'Rezervasyon bilgilerini güncelleyin' : 'Kısa dönem kiralama kaydı ekleyin'}
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
            <div className="form-section-title">Rezervasyon Bilgileri</div>

            <div className="form-field">
              <label className="form-label">Misafir Adı</label>
              <input
                className="form-input"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={200}
                placeholder="Misafirin adı soyadı"
              />
            </div>

            <div className="form-row-3">
              <div className="form-field">
                <label className="form-label">
                  Giriş Tarihi <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">
                  Çıkış Tarihi <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">Gece Sayısı</label>
                <input
                  className="form-input"
                  type="number"
                  value={nightCount}
                  disabled
                />
                <span className="form-hint">Otomatik hesaplanır</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  Platform <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  required
                >
                  {Object.entries(RentalPlatformLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
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
            <div className="form-section-title">Finansal Bilgiler</div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">
                  Gecelik Ücret <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={nightlyRate}
                  onChange={(e) => setNightlyRate(e.target.value)}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="form-field">
                <label className="form-label">
                  Toplam Tutar <span className="required">*</span>
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
                <span className="form-hint">Gecelik × Gece sayısı</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Platform Komisyonu</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="form-field">
                <label className="form-label">
                  Net Tutar <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={netAmount}
                  onChange={(e) => setNetAmount(e.target.value)}
                  required
                  placeholder="0.00"
                />
                <span className="form-hint">Toplam − Komisyon</span>
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
                  : 'Rezervasyon Ekle'}
            </button>
            <Link
              to={`/properties/${propertyId}/short-term-rentals`}
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
