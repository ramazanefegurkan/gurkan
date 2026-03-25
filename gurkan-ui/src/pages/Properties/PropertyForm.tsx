import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  getProperty,
  createProperty,
  updateProperty,
  getGroups,
  getBankAccounts,
  createBankAccount,
  getBanks,
  createBank,
  updatePropertySubscriptions,
  getGroup,
} from '../../api/client';
import {
  PropertyType,
  PropertyTypeLabels,
  Currency,
  CurrencyLabels,
  SubscriptionType,
  SubscriptionTypeLabels,
  SubscriptionHolderType,
  type BankResponse as BankListItem,
  type GroupResponse,
  type BankAccountResponse,
} from '../../types';
import '../../styles/shared.css';
import './Properties.css';

interface SubscriptionFormData {
  type: SubscriptionType;
  subscriptionNo: string;
  holderType: SubscriptionHolderType;
  holderUserId: string;
  hasAutoPayment: boolean;
  autoPaymentBankId: string;
}

function defaultSubscriptions(): SubscriptionFormData[] {
  return Object.values(SubscriptionType).map((t) => ({
    type: t as SubscriptionType,
    subscriptionNo: '',
    holderType: SubscriptionHolderType.User,
    holderUserId: '',
    hasAutoPayment: false,
    autoPaymentBankId: '',
  }));
}

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

  // ── Ownership & subscription ──
  const [titleDeedOwner, setTitleDeedOwner] = useState('');
  const [defaultBankAccountId, setDefaultBankAccountId] = useState('');
  const [subscriptions, setSubscriptions] = useState<SubscriptionFormData[]>(defaultSubscriptions());
  const [banks, setBanks] = useState<BankListItem[]>([]);
  const [groupMembers, setGroupMembers] = useState<{ id: string; fullName: string }[]>([]);
  const [showNewBank, setShowNewBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  // ── UI state ──
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountResponse[]>([]);
  const [showNewBankAccount, setShowNewBankAccount] = useState(false);
  const [newBaHolder, setNewBaHolder] = useState('');
  const [newBaBank, setNewBaBank] = useState('');
  const [newBaIban, setNewBaIban] = useState('');
  const [savingBa, setSavingBa] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [groupsData, bankAccountsData, banksData, propertyData] = await Promise.all([
          getGroups(),
          getBankAccounts(),
          getBanks(),
          isEdit && id ? getProperty(id) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setGroups(groupsData);
        setBankAccounts(bankAccountsData);
        setBanks(banksData);

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
          setTitleDeedOwner(propertyData.titleDeedOwner ?? '');
          setDefaultBankAccountId(propertyData.defaultBankAccountId ?? '');

          if (propertyData.groupId) {
            const groupDetail = await getGroup(propertyData.groupId);
            setGroupMembers(groupDetail.members.map((m) => ({ id: m.userId, fullName: m.fullName })));
          }

          if (propertyData.subscriptions?.length) {
            setSubscriptions(
              defaultSubscriptions().map((ds) => {
                const existing = propertyData.subscriptions.find((s) => s.type === ds.type);
                if (!existing) return ds;
                return {
                  type: existing.type,
                  subscriptionNo: existing.subscriptionNo ?? '',
                  holderType: existing.holderType,
                  holderUserId: existing.holderUserId ?? '',
                  hasAutoPayment: existing.hasAutoPayment,
                  autoPaymentBankId: existing.autoPaymentBankId ?? '',
                };
              }),
            );
          }
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

  useEffect(() => {
    if (!groupId) {
      setGroupMembers([]);
      return;
    }
    let cancelled = false;
    getGroup(groupId).then((g) => {
      if (!cancelled) setGroupMembers(g.members.map((m) => ({ id: m.userId, fullName: m.fullName })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [groupId]);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Mülk adı zorunludur.';
    if (!isEdit && !groupId) errors.groupId = 'Grup seçimi zorunludur.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveSubscriptions(propertyId: string) {
    const activeSubscriptions = subscriptions.filter(
      (s) => s.subscriptionNo || s.holderUserId || s.holderType === SubscriptionHolderType.Tenant || s.hasAutoPayment,
    );

    if (activeSubscriptions.length > 0) {
      await updatePropertySubscriptions(
        propertyId,
        activeSubscriptions.map((s) => ({
          type: s.type,
          subscriptionNo: s.subscriptionNo.trim() || null,
          holderType: s.holderType,
          holderUserId: s.holderType === SubscriptionHolderType.User && s.holderUserId ? s.holderUserId : null,
          hasAutoPayment: s.hasAutoPayment,
          autoPaymentBankId: s.hasAutoPayment && s.autoPaymentBankId ? s.autoPaymentBankId : null,
        })),
      );
    }
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
          titleDeedOwner: titleDeedOwner.trim() || null,
          defaultBankAccountId: defaultBankAccountId || null,
        });
        await saveSubscriptions(result.id);
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
          titleDeedOwner: titleDeedOwner.trim() || null,
          defaultBankAccountId: defaultBankAccountId || null,
          groupId,
        });
        await saveSubscriptions(result.id);
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

          {/* ── Ownership & Subscription ── */}
          <div className="form-section">
            <div className="form-section-title">Sahiplik & Abonelik</div>

            <div className="form-field">
              <label className="form-label" htmlFor="titleDeedOwner">Tapu Sahibi</label>
              <input
                id="titleDeedOwner"
                className="form-input"
                value={titleDeedOwner}
                onChange={(e) => setTitleDeedOwner(e.target.value)}
                placeholder="Örn: Ahmet Gürkan"
                maxLength={200}
                disabled={submitting}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="defaultBankAccount">Kira Geliri Hesabı</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
                <select
                  id="defaultBankAccount"
                  className="form-select"
                  value={defaultBankAccountId}
                  onChange={(e) => setDefaultBankAccountId(e.target.value)}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  <option value="">Seçilmemiş</option>
                  {bankAccounts
                    .filter((ba) => !groupId || ba.groupId === groupId)
                    .map((ba) => (
                      <option key={ba.id} value={ba.id}>
                        {ba.holderName} - {ba.bankName}{ba.iban ? ` (${ba.iban})` : ''}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  onClick={() => setShowNewBankAccount(true)}
                  disabled={!groupId || submitting}
                >
                  + Yeni Hesap
                </button>
              </div>
              <span className="form-hint">Kira ödemelerinde bu hesap otomatik seçilir</span>

              {showNewBankAccount && (
                <div style={{
                  marginTop: '12px',
                  padding: '16px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Yeni Banka Hesabı</div>
                  <div className="form-row">
                    <div className="form-field">
                      <label className="form-label">Hesap Sahibi *</label>
                      <input
                        className="form-input"
                        value={newBaHolder}
                        onChange={(e) => setNewBaHolder(e.target.value)}
                        placeholder="Örn: Efe Gürkan"
                        maxLength={200}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Banka *</label>
                      <input
                        className="form-input"
                        value={newBaBank}
                        onChange={(e) => setNewBaBank(e.target.value)}
                        placeholder="Örn: İş Bankası"
                        maxLength={200}
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">IBAN</label>
                    <input
                      className="form-input"
                      value={newBaIban}
                      onChange={(e) => setNewBaIban(e.target.value)}
                      placeholder="TR..."
                      maxLength={34}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!newBaHolder.trim() || !newBaBank.trim() || savingBa}
                      onClick={async () => {
                        if (!groupId || !newBaHolder.trim() || !newBaBank.trim()) return;
                        setSavingBa(true);
                        try {
                          const created = await createBankAccount({
                            groupId,
                            holderName: newBaHolder.trim(),
                            bankName: newBaBank.trim(),
                            iban: newBaIban.trim() || null,
                          });
                          setBankAccounts((prev) => [...prev, created]);
                          setDefaultBankAccountId(created.id);
                          setShowNewBankAccount(false);
                          setNewBaHolder('');
                          setNewBaBank('');
                          setNewBaIban('');
                        } catch { /* ignore */ }
                        finally { setSavingBa(false); }
                      }}
                    >
                      {savingBa ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setShowNewBankAccount(false); setNewBaHolder(''); setNewBaBank(''); setNewBaIban(''); }}
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}
            </div>

            {subscriptions.map((sub, idx) => (
              <div key={sub.type} style={{
                padding: '16px',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '12px',
                background: 'var(--bg-card)',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
                  {SubscriptionTypeLabels[sub.type]}
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Abone Sahibi</label>
                    <select
                      className="form-select"
                      value={sub.holderType === SubscriptionHolderType.Tenant ? '__tenant__' : sub.holderUserId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSubscriptions((prev) => prev.map((s, i) => i !== idx ? s : {
                          ...s,
                          holderType: val === '__tenant__' ? SubscriptionHolderType.Tenant : SubscriptionHolderType.User,
                          holderUserId: val === '__tenant__' ? '' : val,
                        }));
                      }}
                      disabled={submitting}
                    >
                      <option value="">Seçilmemiş</option>
                      {groupMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.fullName}</option>
                      ))}
                      <option value="__tenant__">Kiracı</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Abone No</label>
                    <input
                      className="form-input"
                      value={sub.subscriptionNo}
                      onChange={(e) => {
                        setSubscriptions((prev) => prev.map((s, i) => i !== idx ? s : { ...s, subscriptionNo: e.target.value }));
                      }}
                      maxLength={50}
                      disabled={submitting}
                      placeholder={sub.holderType === SubscriptionHolderType.Tenant ? 'Opsiyonel' : ''}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ alignItems: 'center' }}>
                  <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id={`auto-${sub.type}`}
                      checked={sub.hasAutoPayment}
                      onChange={(e) => {
                        setSubscriptions((prev) => prev.map((s, i) => i !== idx ? s : {
                          ...s,
                          hasAutoPayment: e.target.checked,
                          autoPaymentBankId: e.target.checked ? s.autoPaymentBankId : '',
                        }));
                      }}
                      disabled={submitting}
                    />
                    <label className="form-label" htmlFor={`auto-${sub.type}`} style={{ marginBottom: 0 }}>
                      Otomatik Ödeme
                    </label>
                  </div>

                  {sub.hasAutoPayment && (
                    <div className="form-field">
                      <label className="form-label">Banka</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          className="form-select"
                          value={sub.autoPaymentBankId}
                          onChange={(e) => {
                            setSubscriptions((prev) => prev.map((s, i) => i !== idx ? s : { ...s, autoPaymentBankId: e.target.value }));
                          }}
                          disabled={submitting}
                          style={{ flex: 1 }}
                        >
                          <option value="">Banka seçin...</option>
                          {banks.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                          onClick={() => setShowNewBank(true)}
                          disabled={submitting}
                        >
                          + Yeni
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {showNewBank && (
              <div style={{
                padding: '16px',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                marginBottom: '12px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Yeni Banka</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="form-input"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="Banka adı"
                    maxLength={200}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!newBankName.trim() || savingBank}
                    onClick={async () => {
                      setSavingBank(true);
                      try {
                        const created = await createBank({ name: newBankName.trim() });
                        setBanks((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
                        setShowNewBank(false);
                        setNewBankName('');
                      } catch {
                        setError('Banka eklenemedi. Bu isimde bir banka zaten olabilir.');
                      }
                      finally { setSavingBank(false); }
                    }}
                  >
                    {savingBank ? '...' : 'Kaydet'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowNewBank(false); setNewBankName(''); }}
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
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
