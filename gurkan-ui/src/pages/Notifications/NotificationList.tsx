import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications } from '../../api/client';
import {
  NotificationSeverity,
  NotificationTypeLabels,
  type NotificationItem,
} from '../../types';
import './Notifications.css';

const SeverityOrder: Record<string, number> = {
  [NotificationSeverity.Critical]: 0,
  [NotificationSeverity.Warning]: 1,
  [NotificationSeverity.Info]: 2,
};

const SeverityLabels: Record<string, string> = {
  [NotificationSeverity.Critical]: 'Kritik',
  [NotificationSeverity.Warning]: 'Uyarı',
  [NotificationSeverity.Info]: 'Bilgi',
};

export default function NotificationList() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchNotifications() {
      try {
        const data = await getNotifications();
        if (!cancelled) {
          // Sort: Critical first, then Warning, then Info
          const sorted = [...data].sort(
            (a, b) => (SeverityOrder[a.severity] ?? 3) - (SeverityOrder[b.severity] ?? 3),
          );
          setNotifications(sorted);
          setError('');
        }
      } catch {
        if (!cancelled) {
          setError('Bildirimler yüklenirken bir hata oluştu.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNotifications();
    return () => { cancelled = true; };
  }, []);

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="notifications-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bildirimler</h1>
          <p className="page-subtitle">
            {notifications.length > 0
              ? `${notifications.length} aktif bildirim`
              : 'Bildirim bulunmuyor'}
          </p>
        </div>
      </div>

      {/* ── Error ── */}
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

      {/* ── Empty state ── */}
      {!error && notifications.length === 0 && (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h2 className="empty-state-title">Bildirim bulunmuyor</h2>
          <p className="empty-state-text">
            Tüm mülkleriniz sorunsuz görünüyor.
          </p>
        </div>
      )}

      {/* ── Notification cards ── */}
      {notifications.length > 0 && (
        <div className="notification-list">
          {notifications.map((n, i) => (
            <div key={`${n.type}-${n.propertyId}-${n.date}-${i}`} className={`notification-card notification-card--${n.severity.toLowerCase()}`}>
              <div className="notification-card-top">
                <span className={`severity-badge severity-badge--${n.severity}`}>
                  {SeverityLabels[n.severity] ?? n.severity}
                </span>
                <span className="notification-type">
                  {NotificationTypeLabels[n.type] ?? n.type}
                </span>
              </div>
              <p className="notification-message">{n.message}</p>
              <div className="notification-meta">
                <Link to={`/properties/${n.propertyId}`} className="notification-property-link">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  {n.propertyName}
                </Link>
                <span className="notification-date">{formatDate(n.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
