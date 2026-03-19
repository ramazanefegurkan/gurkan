import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  getProperty,
  createProperty,
  updateProperty,
  getGroups,
} from '../../api/client';
import {
  PropertyType,
  PropertyTypeLabels,
  Currency,
  CurrencyLabels,
  type GroupResponse,
} from '../../types';
import '../../styles/shared.css';
import './Properties.css';

export default function PropertyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // ── Form state ──
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>(PropertyType.Apartment);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [area, setArea] = useState('');
  const [roomCount, setRoomCount] = useState('');
  const [floor, setFloor] = useState('');
  const [buildYear, setBuildYear] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.TRY);
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState('');

  // ── UI state ──
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [groupsData, propertyData] = await Promise.all([
          getGroups(),
          isEdit && id ? getProperty(id) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setGroups(groupsData);

        if (propertyData) {
          setName(propertyData.name);
          setType(propertyData.type);
          setAddress(propertyData.address ?? '');
          setCity(propertyData.city ?? '');
          setDistrict(propertyData.district ?? '');
          setArea(propertyData.area != null ? String(propertyData.area) : '');
          setRoomCount(propertyData.roomCount != null ? String(propertyData.roomCount) : '');
          setFloor(propertyData.floor != null ? String(propertyData.floor) : '');
          setBuildYear(propertyData.buildYear != null ? String(propertyData.buildYear) : '');
          setCurrency(propertyData.currency);
          setDescription(propertyData.description ?? '');
          setGroupId(propertyData.groupId ?? '');
        }
      } catch {
        if (!cancelled) setError('Veriler yüklenirken hata oluştu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Mülk adı zorunludur.';
    if (!isEdit && !groupId) errors.groupId = 'Grup seçimi zorunludur.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function parseOptionalInt(val: string): number | null {
    if (!val.trim()) return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError('');

    try {
      if (isEdit && id) {
        const result = await updateProperty(id, {
          name: name.trim(),
          type,
          address: address.trim(),
          city: city.trim(),
          district: district.trim(),
          area: parseOptionalInt(area),
          roomCount: parseOptionalInt(roomCount),
          floor: parseOptionalInt(floor),
          buildYear: parseOptionalInt(buildYear),
          currency,
          description: description.trim() || null,
        });
        navigate(`/properties/${result.id}`);
      } else {
        const result = await createProperty({
          name: name.trim(),
          type,
          address: address.trim(),
          city: city.trim(),
          district: district.trim(),
          area: parseOptionalInt(area),
          roomCount: parseOptionalInt(roomCount),
          floor: parseOptionalInt(floor),
          buildYear: parseOptionalInt(buildYear),
          currency,
          description: description.trim() || null,
          groupId,
        });
        navigate(`/properties/${result.id}`);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Bir hata oluştu.')
          : 'Sunucuya bağlanılamadı.';
      setError(message);
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
      <Link to={isEdit && id ? `/properties/${id}` : '/properties'} className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {isEdit ? 'Detaya Dön' : 'Mülklere Dön'}
      </Link>

      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Mülkü Düzenle' : 'Yeni Mülk'}</h1>
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

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate>
          {/* ── Basic Info ── */}
          <div className="form-section">
            <div className="form-section-title">Temel Bilgiler</div>

            <div className="form-field">
              <label className="form-label" htmlFor="name">
                Mülk Adı <span className="required">*</span>
              </label>
              <input
                id="name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Kadıköy Dairesi"
                disabled={submitting}
              />
              {fieldErrors.name && <span className="form-error">{fieldErrors.name}</span>}
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label" htmlFor="type">Tür</label>
                <select
                  id="type"
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value as PropertyType)}
                  disabled={submitting}
                >
                  {Object.entries(PropertyTypeLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="currency">Para Birimi</label>
                <select
                  id="currency"
                  className="form-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  disabled={submitting}
                >
                  {Object.entries(CurrencyLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {!isEdit && (
              <div className="form-field">
                <label className="form-label" htmlFor="groupId">
                  Grup <span className="required">*</span>
                </label>
                <select
                  id="groupId"
                  className="form-select"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Grup seçin...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                {fieldErrors.groupId && <span className="form-error">{fieldErrors.groupId}</span>}
              </div>
            )}
          </div>

          {/* ── Location ── */}
          <div className="form-section">
            <div className="form-section-title">Konum</div>

            <div className="form-field">
              <label className="form-label" htmlFor="address">Adres</label>
              <input
                id="address"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Sokak, mahalle, numara"
                disabled={submitting}
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label" htmlFor="city">Şehir</label>
                <input
                  id="city"
                  className="form-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="İstanbul"
                  disabled={submitting}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="district">İlçe</label>
                <input
                  id="district"
                  className="form-input"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Kadıköy"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* ── Details ── */}
          <div className="form-section">
            <div className="form-section-title">Detaylar</div>

            <div className="form-row-3">
              <div className="form-field">
                <label className="form-label" htmlFor="area">Alan (m²)</label>
                <input
                  id="area"
                  className="form-input"
                  type="number"
                  min="0"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="120"
                  disabled={submitting}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="roomCount">Oda Sayısı</label>
                <input
                  id="roomCount"
                  className="form-input"
                  type="number"
                  min="0"
                  value={roomCount}
                  onChange={(e) => setRoomCount(e.target.value)}
                  placeholder="3"
                  disabled={submitting}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="buildYear">Yapım Yılı</label>
                <input
                  id="buildYear"
                  className="form-input"
                  type="number"
                  min="1900"
                  max="2100"
                  value={buildYear}
                  onChange={(e) => setBuildYear(e.target.value)}
                  placeholder="2020"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label" htmlFor="floor">Kat</label>
                <input
                  id="floor"
                  className="form-input"
                  type="number"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="3"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          <div className="form-section">
            <div className="form-section-title">Açıklama</div>
            <div className="form-field">
              <textarea
                id="description"
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mülk hakkında ek bilgiler..."
                disabled={submitting}
                rows={3}
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <span className="loading-spinner" style={{ width: 18, height: 18 }} />
              ) : isEdit ? (
                'Kaydet'
              ) : (
                'Mülk Oluştur'
              )}
            </button>
            <Link
              to={isEdit && id ? `/properties/${id}` : '/properties'}
              className="btn btn-secondary"
            >
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
