import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getTenant,
  getRentPayments,
  getRentIncreases,
  markPaymentPaid,
  terminateTenant,
  renewTenantLease,
  getProperty,
  getBankAccounts,
} from '../../api/client';
import {
  CurrencyLabels,
  PaymentMethod,
  PaymentMethodLabels,
  RentPaymentStatusLabels,
  type TenantResponse,
  type RentPaymentResponse,
  type RentIncreaseResponse,
  type Currency,
  type BankAccountResponse,
} from '../../types';
import '../../styles/shared.css';
import './Tenants.css';

// ── Helpers ──

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

function formatDateLong(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatMoney(amount: number, currency: Currency): string {
  const symbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€';
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Paid': return 'status-badge status-badge--paid';
    case 'Late': return 'status-badge status-badge--late';
    case 'Cancelled': return 'status-badge status-badge--cancelled';
    default: return 'status-badge status-badge--pending';
  }
}

function statusLabel(status: string): string {
  return RentPaymentStatusLabels[status as keyof typeof RentPaymentStatusLabels] ?? status;
}

// ── Component ──

export default function TenantDetail() {
  const { id: propertyId, tenantId } = useParams<{ id: string; tenantId: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<TenantResponse | null>(null);
  const [payments, setPayments] = useState<RentPaymentResponse[]>([]);
  const [increases, setIncreases] = useState<RentIncreaseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mark paid modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingPayment, setPayingPayment] = useState<RentPaymentResponse | null>(null);
  const [payDate, setPayDate] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payBankAccountId, setPayBankAccountId] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountResponse[]>([]);

  // Terminate confirmation
  const [showTerminate, setShowTerminate] = useState(false);
  const [terminating, setTerminating] = useState(false);

  const [showRenew, setShowRenew] = useState(false);
  const [renewLeaseEnd, setRenewLeaseEnd] = useState('');
  const [renewRent, setRenewRent] = useState('');
  const [renewRate, setRenewRate] = useState('');
  const [renewNotes, setRenewNotes] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState('');

  useEffect(() => {
    if (!propertyId || !tenantId) return;
    let cancelled = false;

    async function load() {
      try {
        const [t, p, r] = await Promise.all([
          getTenant(propertyId!, tenantId!),
          getRentPayments(propertyId!, tenantId!),
          getRentIncreases(propertyId!, tenantId!),
        ]);
        if (!cancelled) {
          setTenant(t);
          setPayments(p);
          setIncreases(r);

          // Load bank accounts for the property's group (for pay modal)
          try {
            const prop = await getProperty(propertyId!);
            if (prop.groupId && !cancelled) {
              const accounts = await getBankAccounts(prop.groupId);
              setBankAccounts(accounts);
              // Store default for pay modal
              if (prop.defaultBankAccountId) {
                setPayBankAccountId(prop.defaultBankAccountId);
              }
            }
          } catch { /* bank accounts optional */ }
        }
      } catch {
        if (!cancelled) setError('Kiracı bilgileri yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [propertyId, tenantId]);

  function openPayModal(payment: RentPaymentResponse) {
    setPayingPayment(payment);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod(PaymentMethod.BankTransfer);
    // Default bank account from property, or from previous payment if set
    if (!payBankAccountId && bankAccounts.length > 0) {
      setPayBankAccountId(bankAccounts[0].id);
    }
    setPayNotes('');
    setPayModalOpen(true);
  }

  async function handleMarkPaid(e: FormEvent) {
    e.preventDefault();
    if (!propertyId || !tenantId || !payingPayment) return;

    setPaying(true);
    try {
      const updated = await markPaymentPaid(
        propertyId,
        tenantId,
        payingPayment.id,
        {
          paidDate: payDate ? `${payDate}T00:00:00Z` : null,
          paymentMethod: (payMethod as typeof PaymentMethod.Cash) || null,
          bankAccountId: payBankAccountId || null,
          notes: payNotes || null,
        },
      );
      setPayments((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      setPayModalOpen(false);
      setPayingPayment(null);
    } catch {
      setError('Ödeme güncellenemedi.');
    } finally {
      setPaying(false);
    }
  }

  async function handleTerminate() {
    if (!propertyId || !tenantId) return;
    setTerminating(true);
    try {
      await terminateTenant(propertyId, tenantId);
      navigate(`/properties/${propertyId}/tenants`);
    } catch {
      setError('Sözleşme sonlandırılamadı.');
      setShowTerminate(false);
    } finally {
      setTerminating(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div>
        <Link to={`/properties/${propertyId}/tenants`} className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Kiracılara Dön
        </Link>
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div style={{ maxWidth: 900 }}>
      <Link to={`/properties/${propertyId}/tenants`} className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Kiracılara Dön
      </Link>

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

      {/* ── Tenant Info Card ── */}
      <div className="tenant-info-section">
        <div className="tenant-info-card">
          <div className="tenant-info-topbar" />
          <div className="tenant-info-header">
            <div>
              <h1 className="detail-title">{tenant.fullName}</h1>
              <div className="detail-badges" style={{ marginTop: 8 }}>
                <span className={tenant.isActive ? 'status-badge status-badge--active' : 'status-badge status-badge--inactive'}>
                  {tenant.isActive ? 'Aktif' : 'Sonlanmış'}
                </span>
                <span className="badge badge-currency">
                  {CurrencyLabels[tenant.currency] ?? 'TRY'}
                </span>
              </div>
            </div>
            <div className="detail-actions">
              {tenant.isActive && (
                <>
                  <Link
                    to={`/properties/${propertyId}/tenants/${tenantId}/edit`}
                    className="btn btn-secondary btn-sm"
                  >
                    Düzenle
                  </Link>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setRenewRent(String(tenant.monthlyRent));
                      setRenewRate('');
                      setRenewLeaseEnd('');
                      setRenewNotes('');
                      setRenewError('');
                      setShowRenew(true);
                    }}
                  >
                    Sözleşmeyi Yenile
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setShowTerminate(true)}
                  >
                    Sözleşmeyi Sonlandır
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="tenant-info-body">
            <div className="tenant-info-grid">
              <div>
                <div className="detail-field-label">Telefon</div>
                <div className="detail-field-value">{tenant.phone || '—'}</div>
              </div>
              <div>
                <div className="detail-field-label">E-posta</div>
                <div className="detail-field-value">{tenant.email || '—'}</div>
              </div>
              <div>
                <div className="detail-field-label">TC Kimlik No</div>
                <div className="detail-field-value">{tenant.identityNumber || '—'}</div>
              </div>
              <div>
                <div className="detail-field-label">Kira Başlangıcı</div>
                <div className="detail-field-value">{formatDateLong(tenant.leaseStart)}</div>
              </div>
              <div>
                <div className="detail-field-label">Kira Bitişi</div>
                <div className="detail-field-value">{formatDateLong(tenant.leaseEnd)}</div>
              </div>
              <div>
                <div className="detail-field-label">Aylık Kira</div>
                <div className="detail-field-value" style={{ fontWeight: 600 }}>
                  {formatMoney(tenant.monthlyRent, tenant.currency)}
                </div>
              </div>
              <div>
                <div className="detail-field-label">Depozito</div>
                <div className="detail-field-value">
                  {formatMoney(tenant.deposit, tenant.currency)}
                </div>
              </div>
              <div>
                <div className="detail-field-label">Oluşturulma</div>
                <div className="detail-field-value">{formatDateLong(tenant.createdAt)}</div>
              </div>
              {tenant.updatedAt && (
                <div>
                  <div className="detail-field-label">Son Güncelleme</div>
                  <div className="detail-field-value">{formatDateLong(tenant.updatedAt)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Rent Payments ── */}
      <div className="payments-card">
        <div className="payments-header">
          <span className="payments-title">
            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Kira Ödemeleri
            {payments.length > 0 && (
              <span className="notes-count">{payments.length}</span>
            )}
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="notes-empty">Henüz ödeme kaydı yok.</div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vade Tarihi</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th>Ödeme Yöntemi</th>
                  <th>Ödeme Tarihi</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="date">{formatDate(p.dueDate)}</td>
                    <td className="amount">{formatMoney(p.amount, p.currency as Currency)}</td>
                    <td>
                      <span className={statusBadgeClass(p.status)}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td>
                      {p.paymentMethod
                        ? PaymentMethodLabels[p.paymentMethod as keyof typeof PaymentMethodLabels] ?? p.paymentMethod
                        : '—'}
                      {p.bankAccountName && (
                        <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          {p.bankAccountName}
                        </span>
                      )}
                    </td>
                    <td className="date">
                      {p.paidDate ? formatDate(p.paidDate) : '—'}
                    </td>
                    <td>
                      {(p.status === 'Pending' || p.status === 'Late') && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openPayModal(p)}
                        >
                          Ödendi İşaretle
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Rent Increases ── */}
      {increases.length > 0 && (
        <div className="payments-card">
          <div className="payments-header">
            <span className="payments-title">
              <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              Kira Artışları
            </span>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Geçerlilik Tarihi</th>
                  <th>Önceki Tutar</th>
                  <th>Yeni Tutar</th>
                  <th>Artış Oranı</th>
                  <th>Not</th>
                </tr>
              </thead>
              <tbody>
                {increases.map((inc) => (
                  <tr key={inc.id}>
                    <td className="date">{formatDate(inc.effectiveDate)}</td>
                    <td className="amount">{formatMoney(inc.previousAmount, tenant.currency)}</td>
                    <td className="amount">{formatMoney(inc.newAmount, tenant.currency)}</td>
                    <td>
                      <span className="increase-rate">
                        %{inc.increaseRate.toFixed(1)}
                      </span>
                    </td>
                    <td>{inc.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Mark Paid Modal ── */}
      {payModalOpen && payingPayment && (
        <div className="modal-overlay" onClick={() => !paying && setPayModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Ödendi İşaretle</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              {formatDate(payingPayment.dueDate)} vadeli{' '}
              <strong>{formatMoney(payingPayment.amount, payingPayment.currency as Currency)}</strong>{' '}
              tutarındaki ödemeyi işaretleyin.
            </p>
            <form onSubmit={handleMarkPaid}>
              <div className="form-field">
                <label className="form-label">Ödeme Tarihi</label>
                <input
                  className="form-input"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Ödeme Yöntemi</label>
                <select
                  className="form-select"
                  value={payMethod}
                  onChange={(e) => {
                    setPayMethod(e.target.value);
                    if (e.target.value === PaymentMethod.Cash) setPayBankAccountId('');
                  }}
                >
                  {Object.entries(PaymentMethodLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              {bankAccounts.length > 0 && payMethod !== PaymentMethod.Cash && (
                <div className="form-field">
                  <label className="form-label">Banka Hesabı</label>
                  <select
                    className="form-select"
                    value={payBankAccountId}
                    onChange={(e) => setPayBankAccountId(e.target.value)}
                  >
                    <option value="">Seçilmemiş</option>
                    {bankAccounts.map((ba) => (
                      <option key={ba.id} value={ba.id}>
                        {ba.holderName} - {ba.bankName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-field">
                <label className="form-label">Not</label>
                <textarea
                  className="form-textarea"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Opsiyonel not..."
                  rows={2}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPayModalOpen(false)}
                  disabled={paying}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={paying}
                >
                  {paying ? 'Kaydediliyor...' : 'Ödendi Olarak İşaretle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Terminate Confirmation ── */}
      {showTerminate && (
        <div className="confirm-overlay" onClick={() => !terminating && setShowTerminate(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="confirm-title">Sözleşmeyi Sonlandır</h2>
            <p className="confirm-text">
              <strong>{tenant.fullName}</strong> kiracısının sözleşmesini sonlandırmak istediğinize emin misiniz?
              Bekleyen tüm ödemeler iptal edilecektir. Bu işlem geri alınamaz.
            </p>
            <div className="confirm-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowTerminate(false)}
                disabled={terminating}
              >
                Vazgeç
              </button>
              <button
                className="btn btn-danger"
                onClick={handleTerminate}
                disabled={terminating}
              >
                {terminating ? 'Sonlandırılıyor...' : 'Evet, Sonlandır'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Renew Lease Modal ── */}
      {showRenew && (
        <div className="confirm-overlay" onClick={() => !renewing && setShowRenew(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h2 className="confirm-title">Sözleşmeyi Yenile</h2>
            <p className="confirm-text" style={{ marginBottom: 16 }}>
              Mevcut bitiş: <strong>{formatDateLong(tenant.leaseEnd)}</strong> · Mevcut kira: <strong>{formatMoney(tenant.monthlyRent, tenant.currency)}</strong>
            </p>
            {renewError && <div className="error-banner" style={{ marginBottom: 12 }}>{renewError}</div>}
            <div className="form-field" style={{ marginBottom: 12 }}>
              <label className="form-label">Yeni Bitiş Tarihi</label>
              <input
                type="date"
                className="form-input"
                value={renewLeaseEnd}
                onChange={(e) => setRenewLeaseEnd(e.target.value)}
                disabled={renewing}
              />
            </div>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-field">
                <label className="form-label">Artış Oranı (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={renewRate}
                  onChange={(e) => {
                    const rate = e.target.value;
                    setRenewRate(rate);
                    const r = parseFloat(rate);
                    if (!isNaN(r)) {
                      const newAmount = tenant.monthlyRent * (1 + r / 100);
                      setRenewRent(newAmount.toFixed(2));
                    }
                  }}
                  step="0.1"
                  placeholder="Örn: 25"
                  disabled={renewing}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Yeni Aylık Kira</label>
                <input
                  type="number"
                  className="form-input"
                  value={renewRent}
                  onChange={(e) => {
                    const rent = e.target.value;
                    setRenewRent(rent);
                    const r = parseFloat(rent);
                    if (!isNaN(r) && tenant.monthlyRent > 0) {
                      const rate = ((r - tenant.monthlyRent) / tenant.monthlyRent) * 100;
                      setRenewRate(rate.toFixed(1));
                    }
                  }}
                  min="0"
                  step="0.01"
                  disabled={renewing}
                />
              </div>
            </div>
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label className="form-label">Not</label>
              <textarea
                className="form-input"
                value={renewNotes}
                onChange={(e) => setRenewNotes(e.target.value)}
                rows={2}
                placeholder="Opsiyonel"
                disabled={renewing}
              />
            </div>
            <div className="confirm-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRenew(false)}
                disabled={renewing}
              >
                Vazgeç
              </button>
              <button
                className="btn btn-primary"
                disabled={renewing || !renewLeaseEnd || !renewRent}
                onClick={async () => {
                  if (!propertyId || !tenantId) return;
                  setRenewing(true);
                  setRenewError('');
                  try {
                    const updated = await renewTenantLease(propertyId, tenantId, {
                      newLeaseEnd: `${renewLeaseEnd}T00:00:00Z`,
                      newMonthlyRent: parseFloat(renewRent),
                      notes: renewNotes.trim() || null,
                    });
                    setTenant(updated);
                    setShowRenew(false);
                    const [newPayments, newIncreases] = await Promise.all([
                      getRentPayments(propertyId, tenantId),
                      getRentIncreases(propertyId, tenantId),
                    ]);
                    setPayments(newPayments);
                    setIncreases(newIncreases);
                  } catch (err: unknown) {
                    const message =
                      err && typeof err === 'object' && 'response' in err
                        ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Yenileme başarısız.')
                        : 'Sunucuya bağlanılamadı.';
                    setRenewError(message);
                  } finally {
                    setRenewing(false);
                  }
                }}
              >
                {renewing ? 'Yenileniyor...' : 'Yenile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
