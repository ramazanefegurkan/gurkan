import { useState, useEffect } from 'react';
import { getTelegramStatus, linkTelegram, unlinkTelegram } from '../../api/client';
import type { TelegramLinkResponse } from '../../types';
import './TelegramLink.css';
import '../../styles/shared.css';

export default function TelegramLink() {
  const [status, setStatus] = useState<TelegramLinkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const data = await getTelegramStatus();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setError('Durum bilgisi yüklenirken hata oluştu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStatus();
    return () => { cancelled = true; };
  }, []);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!linkCode.trim()) {
      setError('Bağlantı kodu zorunludur.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await linkTelegram(linkCode.trim());
      setStatus(data);
      setLinkCode('');
    } catch {
      setError('Bağlantı kurulamadı. Kod geçersiz veya süresi dolmuş olabilir.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlink() {
    if (!window.confirm('Telegram bağlantısını kaldırmak istediğinizden emin misiniz?')) return;
    setError('');
    setSubmitting(true);
    try {
      await unlinkTelegram();
      setStatus({ isLinked: false, telegramUserId: null, telegramUsername: null, linkedAt: null });
    } catch {
      setError('Bağlantı kaldırılırken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="telegram-link-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Telegram Bağlantısı</h1>
          <p className="page-subtitle">Hesabınızı Telegram botuna bağlayın</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div className="telegram-card">
        {status?.isLinked ? (
          <div className="telegram-linked">
            <div className="telegram-status-icon telegram-status-icon--linked">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.95 12a19.79 19.79 0 01-3.07-8.67A2 2 0 012.86 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 8.65a16 16 0 006.29 6.29l1.02-1.02a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </div>
            <div className="telegram-linked-info">
              <div className="telegram-linked-label">Bağlı Hesap</div>
              {status.telegramUsername && (
                <div className="telegram-linked-username">@{status.telegramUsername}</div>
              )}
              {status.linkedAt && (
                <div className="telegram-linked-date">{formatDate(status.linkedAt)} tarihinde bağlandı</div>
              )}
            </div>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleUnlink}
              disabled={submitting}
            >
              Bağlantıyı Kaldır
            </button>
          </div>
        ) : (
          <div className="telegram-unlinked">
            <div className="telegram-status-icon telegram-status-icon--unlinked">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <p className="telegram-unlinked-desc">
              Telegram botundan <strong>/link</strong> komutunu göndererek aldığınız 6 haneli kodu girin.
            </p>
            <form className="telegram-link-form" onSubmit={handleLink}>
              <div className="form-field">
                <label className="form-label" htmlFor="linkCode">Bağlantı Kodu</label>
                <input
                  id="linkCode"
                  className="form-input"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !linkCode.trim()}
              >
                {submitting ? 'Bağlanıyor…' : 'Bağla'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
