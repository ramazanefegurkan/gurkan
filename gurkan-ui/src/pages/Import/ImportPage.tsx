import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  getProperties,
  importAirbnbCsv,
  importRentPayments,
} from '../../api/client';
import type {
  PropertyListResponse,
  ImportPreviewResponse,
  AirbnbImportRow,
  RentPaymentImportRow,
  ImportSummary,
} from '../../types';
import '../../styles/shared.css';
import './Import.css';

type TabType = 'airbnb' | 'rent';

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
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

function formatAmount(val: number | undefined | null): string {
  if (val == null) return '—';
  return val.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Success':
      return 'import-status import-status--success';
    case 'Error':
      return 'import-status import-status--error';
    case 'Warning':
      return 'import-status import-status--warning';
    case 'Duplicate':
      return 'import-status import-status--duplicate';
    default:
      return 'import-status';
  }
}

function rowClass(status: string): string {
  switch (status) {
    case 'Error':
      return 'import-row--error';
    case 'Warning':
      return 'import-row--warning';
    default:
      return 'import-row--success';
  }
}

function SummaryCard({ summary }: { summary: ImportSummary }) {
  return (
    <div className="import-summary">
      <div className="import-summary-stat">
        <span className="stat-value">{summary.totalRows}</span>
        <span className="stat-label">Toplam Satır</span>
      </div>
      <div className="import-summary-divider" />
      <div className="import-summary-stat import-summary-stat--success">
        <span className="stat-value">{summary.importedCount}</span>
        <span className="stat-label">Başarılı</span>
      </div>
      <div className="import-summary-divider" />
      <div className="import-summary-stat import-summary-stat--errors">
        <span className="stat-value">{summary.errorCount}</span>
        <span className="stat-label">Hata</span>
      </div>
      <div className="import-summary-divider" />
      <div className="import-summary-stat import-summary-stat--warnings">
        <span className="stat-value">{summary.warningCount}</span>
        <span className="stat-label">Uyarı</span>
      </div>
      <div className="import-summary-divider" />
      <div className="import-summary-stat">
        <span className="stat-value">{summary.duplicateCount}</span>
        <span className="stat-label">Tekrar</span>
      </div>
    </div>
  );
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<TabType>('airbnb');
  const [properties, setProperties] = useState<PropertyListResponse[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  // Airbnb state
  const airbnbFileRef = useRef<HTMLInputElement>(null);
  const [airbnbPreview, setAirbnbPreview] = useState<ImportPreviewResponse<AirbnbImportRow> | null>(null);
  const [airbnbResult, setAirbnbResult] = useState<ImportPreviewResponse<AirbnbImportRow> | null>(null);
  const [airbnbLoading, setAirbnbLoading] = useState(false);
  const [airbnbError, setAirbnbError] = useState('');

  // Rent state
  const rentFileRef = useRef<HTMLInputElement>(null);
  const [rentPreview, setRentPreview] = useState<ImportPreviewResponse<RentPaymentImportRow> | null>(null);
  const [rentResult, setRentResult] = useState<ImportPreviewResponse<RentPaymentImportRow> | null>(null);
  const [rentLoading, setRentLoading] = useState(false);
  const [rentError, setRentError] = useState('');

  // Load properties on mount for Airbnb selector
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getProperties();
        if (!cancelled) {
          setProperties(data);
          if (data.length > 0 && !selectedPropertyId) {
            setSelectedPropertyId(data[0].id);
          }
        }
      } catch {
        // Properties load failure is non-blocking
        console.warn('[import] Failed to load properties');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Airbnb handlers ──────────────────────────────────

  async function handleAirbnbPreview() {
    const file = airbnbFileRef.current?.files?.[0];
    if (!file) {
      setAirbnbError('Lütfen bir CSV dosyası seçin.');
      return;
    }
    if (!selectedPropertyId) {
      setAirbnbError('Lütfen bir mülk seçin.');
      return;
    }

    setAirbnbLoading(true);
    setAirbnbError('');
    setAirbnbPreview(null);
    setAirbnbResult(null);

    try {
      const data = await importAirbnbCsv(selectedPropertyId, file, true);
      setAirbnbPreview(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAirbnbError(msg || 'CSV önizleme başarısız oldu.');
      console.warn('[import] Airbnb preview failed:', err);
    } finally {
      setAirbnbLoading(false);
    }
  }

  async function handleAirbnbImport() {
    const file = airbnbFileRef.current?.files?.[0];
    if (!file || !selectedPropertyId) return;

    setAirbnbLoading(true);
    setAirbnbError('');

    try {
      const data = await importAirbnbCsv(selectedPropertyId, file, false);
      setAirbnbResult(data);
      setAirbnbPreview(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAirbnbError(msg || 'İçe aktarma başarısız oldu.');
      console.warn('[import] Airbnb import failed:', err);
    } finally {
      setAirbnbLoading(false);
    }
  }

  function resetAirbnb() {
    setAirbnbPreview(null);
    setAirbnbResult(null);
    setAirbnbError('');
    if (airbnbFileRef.current) airbnbFileRef.current.value = '';
  }

  // ── Rent handlers ────────────────────────────────────

  async function handleRentPreview() {
    const file = rentFileRef.current?.files?.[0];
    if (!file) {
      setRentError('Lütfen bir CSV dosyası seçin.');
      return;
    }

    setRentLoading(true);
    setRentError('');
    setRentPreview(null);
    setRentResult(null);

    try {
      const data = await importRentPayments(file, true);
      setRentPreview(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setRentError(msg || 'CSV önizleme başarısız oldu.');
      console.warn('[import] Rent preview failed:', err);
    } finally {
      setRentLoading(false);
    }
  }

  async function handleRentImport() {
    const file = rentFileRef.current?.files?.[0];
    if (!file) return;

    setRentLoading(true);
    setRentError('');

    try {
      const data = await importRentPayments(file, false);
      setRentResult(data);
      setRentPreview(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setRentError(msg || 'İçe aktarma başarısız oldu.');
      console.warn('[import] Rent import failed:', err);
    } finally {
      setRentLoading(false);
    }
  }

  function resetRent() {
    setRentPreview(null);
    setRentResult(null);
    setRentError('');
    if (rentFileRef.current) rentFileRef.current.value = '';
  }

  // ── Render ───────────────────────────────────────────

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">İçe Aktar</h1>
          <p className="page-subtitle">CSV dosyalarından toplu veri aktarımı</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="import-tabs">
        <button
          className={`import-tab ${activeTab === 'airbnb' ? 'import-tab--active' : ''}`}
          onClick={() => setActiveTab('airbnb')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Airbnb CSV
        </button>
        <button
          className={`import-tab ${activeTab === 'rent' ? 'import-tab--active' : ''}`}
          onClick={() => setActiveTab('rent')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          Kira Ödemeleri
        </button>
      </div>

      {/* ── Airbnb Tab ── */}
      {activeTab === 'airbnb' && (
        <div>
          <div className="import-upload-card">
            <div className="import-upload-row">
              <div className="form-field">
                <label className="form-label">
                  Mülk <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  disabled={airbnbLoading}
                >
                  {properties.length === 0 && (
                    <option value="">Mülk yükleniyor...</option>
                  )}
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">
                  CSV Dosyası <span className="required">*</span>
                </label>
                <input
                  ref={airbnbFileRef}
                  type="file"
                  accept=".csv"
                  className="import-file-input"
                  disabled={airbnbLoading}
                />
              </div>
              <div className="import-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleAirbnbPreview}
                  disabled={airbnbLoading}
                >
                  {airbnbLoading && !airbnbPreview ? (
                    <>
                      <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Yükleniyor...
                    </>
                  ) : (
                    'Önizleme'
                  )}
                </button>
                {airbnbPreview && (
                  <button
                    className="btn btn-primary"
                    onClick={handleAirbnbImport}
                    disabled={airbnbLoading || airbnbPreview.summary.errorCount === airbnbPreview.summary.totalRows}
                  >
                    {airbnbLoading ? (
                      <>
                        <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        İçe aktarılıyor...
                      </>
                    ) : (
                      'İçe Aktar'
                    )}
                  </button>
                )}
                {(airbnbPreview || airbnbResult) && (
                  <button className="btn btn-ghost btn-sm" onClick={resetAirbnb}>
                    Sıfırla
                  </button>
                )}
              </div>
            </div>
          </div>

          {airbnbError && (
            <div className="error-banner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {airbnbError}
            </div>
          )}

          {/* Airbnb import result */}
          {airbnbResult && (
            <div className="import-result">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="import-result-text">
                <strong>{airbnbResult.summary.importedCount}</strong> kayıt başarıyla içe aktarıldı
                {airbnbResult.summary.errorCount > 0 && `, ${airbnbResult.summary.errorCount} hata`}
                {airbnbResult.summary.warningCount > 0 && `, ${airbnbResult.summary.warningCount} uyarı`}
                {airbnbResult.summary.duplicateCount > 0 && ` (${airbnbResult.summary.duplicateCount} tekrar)`}
              </span>
              <Link
                to={`/properties/${selectedPropertyId}/short-term-rentals`}
                className="import-result-link"
              >
                Kayıtları Görüntüle →
              </Link>
            </div>
          )}

          {/* Airbnb preview */}
          {airbnbPreview && (
            <>
              <SummaryCard summary={airbnbPreview.summary} />
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Misafir</th>
                      <th>Giriş</th>
                      <th>Çıkış</th>
                      <th>Gece</th>
                      <th>Toplam</th>
                      <th>Platform Ücreti</th>
                      <th>Net</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {airbnbPreview.rows.map((row) => (
                      <tr key={row.rowNumber} className={rowClass(row.status)}>
                        <td>{row.rowNumber}</td>
                        <td>{row.guestName || '—'}</td>
                        <td className="date">{formatDate(row.checkIn)}</td>
                        <td className="date">{formatDate(row.checkOut)}</td>
                        <td>{row.nightCount ?? '—'}</td>
                        <td className="import-amount">{formatAmount(row.totalAmount)}</td>
                        <td className="import-amount">{formatAmount(row.platformFee)}</td>
                        <td className="import-amount">{formatAmount(row.netAmount)}</td>
                        <td>
                          <span className={statusBadgeClass(row.status)}>
                            {row.status === 'Success' ? 'Başarılı' : row.status === 'Error' ? 'Hata' : row.status === 'Warning' ? 'Uyarı' : row.status}
                          </span>
                          {row.errorMessage && (
                            <div className="import-row-message import-row-message--error">{row.errorMessage}</div>
                          )}
                          {row.warningMessage && (
                            <div className="import-row-message import-row-message--warning">{row.warningMessage}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!airbnbPreview && !airbnbResult && !airbnbLoading && (
            <div className="empty-state">
              <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="empty-state-title">Airbnb CSV dosyası yükleyin</p>
              <p className="empty-state-text">
                Mülk seçip CSV dosyasını yükledikten sonra önizleme yapabilir ve içe aktarabilirsiniz.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Rent Payments Tab ── */}
      {activeTab === 'rent' && (
        <div>
          <div className="import-upload-card">
            <div className="import-upload-row">
              <div className="form-field">
                <label className="form-label">
                  CSV Dosyası <span className="required">*</span>
                </label>
                <input
                  ref={rentFileRef}
                  type="file"
                  accept=".csv"
                  className="import-file-input"
                  disabled={rentLoading}
                />
              </div>
              <div className="import-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleRentPreview}
                  disabled={rentLoading}
                >
                  {rentLoading && !rentPreview ? (
                    <>
                      <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Yükleniyor...
                    </>
                  ) : (
                    'Önizleme'
                  )}
                </button>
                {rentPreview && (
                  <button
                    className="btn btn-primary"
                    onClick={handleRentImport}
                    disabled={rentLoading || rentPreview.summary.errorCount === rentPreview.summary.totalRows}
                  >
                    {rentLoading ? (
                      <>
                        <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        İçe aktarılıyor...
                      </>
                    ) : (
                      'İçe Aktar'
                    )}
                  </button>
                )}
                {(rentPreview || rentResult) && (
                  <button className="btn btn-ghost btn-sm" onClick={resetRent}>
                    Sıfırla
                  </button>
                )}
              </div>
            </div>
          </div>

          {rentError && (
            <div className="error-banner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {rentError}
            </div>
          )}

          {/* Rent import result */}
          {rentResult && (
            <div className="import-result">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="import-result-text">
                <strong>{rentResult.summary.importedCount}</strong> kira ödemesi başarıyla içe aktarıldı
                {rentResult.summary.errorCount > 0 && `, ${rentResult.summary.errorCount} hata`}
                {rentResult.summary.warningCount > 0 && `, ${rentResult.summary.warningCount} uyarı`}
                {rentResult.summary.duplicateCount > 0 && ` (${rentResult.summary.duplicateCount} tekrar)`}
              </span>
              <Link
                to="/properties"
                className="import-result-link"
              >
                Mülkleri Görüntüle →
              </Link>
            </div>
          )}

          {/* Rent preview */}
          {rentPreview && (
            <>
              <SummaryCard summary={rentPreview.summary} />
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Mülk</th>
                      <th>Kiracı</th>
                      <th>Tutar</th>
                      <th>Para Birimi</th>
                      <th>Vade Tarihi</th>
                      <th>Ödeme Durumu</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentPreview.rows.map((row) => (
                      <tr key={row.rowNumber} className={rowClass(row.status)}>
                        <td>{row.rowNumber}</td>
                        <td>{row.propertyName || '—'}</td>
                        <td>{row.tenantName || '—'}</td>
                        <td className="import-amount">{formatAmount(row.amount)}</td>
                        <td>{row.currency || '—'}</td>
                        <td className="date">{formatDate(row.dueDate)}</td>
                        <td>{row.paymentStatus || '—'}</td>
                        <td>
                          <span className={statusBadgeClass(row.status)}>
                            {row.status === 'Success' ? 'Başarılı' : row.status === 'Error' ? 'Hata' : row.status === 'Warning' ? 'Uyarı' : row.status}
                          </span>
                          {row.errorMessage && (
                            <div className="import-row-message import-row-message--error">{row.errorMessage}</div>
                          )}
                          {row.warningMessage && (
                            <div className="import-row-message import-row-message--warning">{row.warningMessage}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!rentPreview && !rentResult && !rentLoading && (
            <div className="empty-state">
              <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="empty-state-title">Kira ödemeleri CSV dosyası yükleyin</p>
              <p className="empty-state-text">
                CSV dosyasını yükledikten sonra önizleme yapabilir ve toplu içe aktarabilirsiniz.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
