import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllSubscriptions } from '../../api/client';
import {
  SubscriptionTypeLabels,
  SubscriptionHolderType,
  type GlobalSubscriptionListItem,
} from '../../types';
import '../../styles/shared.css';

export default function SubscriptionList() {
  const [subscriptions, setSubscriptions] = useState<GlobalSubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getAllSubscriptions()
      .then((data) => { if (!cancelled) setSubscriptions(data); })
      .catch(() => { if (!cancelled) setError('Abonelikler yüklenirken hata oluştu.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Abonelikler</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : subscriptions.length === 0 ? (
        <div className="empty-state">Henüz abonelik kaydı yok.</div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mülk</th>
                <th>Abonelik Tipi</th>
                <th>Abone Sahibi</th>
                <th>Abone No</th>
                <th>Otomatik Ödeme</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/properties/${s.propertyId}`} className="table-link">
                      {s.propertyName}
                    </Link>
                  </td>
                  <td>{SubscriptionTypeLabels[s.type]}</td>
                  <td>
                    {s.holderType === SubscriptionHolderType.Tenant
                      ? 'Kiracı'
                      : s.holderUserName ?? '—'}
                  </td>
                  <td>{s.subscriptionNo ?? '—'}</td>
                  <td>
                    {s.hasAutoPayment ? (
                      <span className="badge badge-status--active">
                        {s.autoPaymentBankName ?? 'Evet'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
