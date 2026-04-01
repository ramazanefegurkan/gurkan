import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBankAccounts, getBankAccountBalance } from '../../api/client';
import type {
  BankAccountResponse,
  BankAccountBalanceResponse,
  Currency,
} from '../../types';
import '../../styles/shared.css';
import './Payments.css';

function formatCurrency(amount: number, currency: Currency): string {
  const symbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€';
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BankAccountList() {
  const [accounts, setAccounts] = useState<BankAccountResponse[]>([]);
  const [balances, setBalances] = useState<Record<string, BankAccountBalanceResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const accountsData = await getBankAccounts();
        if (cancelled) return;
        setAccounts(accountsData);

        const balanceResults: Record<string, BankAccountBalanceResponse> = {};
        await Promise.all(
          accountsData.map(async (a) => {
            try {
              balanceResults[a.id] = await getBankAccountBalance(a.id);
            } catch { /* skip */ }
          }),
        );
        if (!cancelled) setBalances(balanceResults);
      } catch {
        if (!cancelled) setError('Banka hesapları yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  const balanceByCurrency: Record<string, number> = {};
  accounts.forEach((a) => {
    const bal = balances[a.id];
    if (bal) {
      balanceByCurrency[a.currency] = (balanceByCurrency[a.currency] || 0) + bal.balance;
    }
  });

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Banka Hesapları</h2>
          <p className="section-subtitle">{accounts.length} hesap kaydı</p>
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

      {Object.keys(balanceByCurrency).length > 0 && (
        <div className="payment-summary">
          {Object.entries(balanceByCurrency).map(([cur, amount]) => (
            <div key={cur} className="payment-summary-item">
              <span className="payment-summary-label">Toplam Bakiye ({cur})</span>
              <span className={`payment-summary-value ${amount >= 0 ? '' : 'balance-amount--negative'}`} style={{ color: amount >= 0 ? '#2e7d32' : undefined }}>
                {formatCurrency(amount, cur as Currency)}
              </span>
            </div>
          ))}
          <div className="payment-summary-item">
            <span className="payment-summary-label">Hesap Sayısı</span>
            <span className="payment-summary-value">{accounts.length}</span>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 21h18" />
            <path d="M3 10h18" />
            <path d="M5 6l7-3 7 3" />
            <path d="M4 10v11" />
            <path d="M20 10v11" />
            <path d="M8 14v4" />
            <path d="M12 14v4" />
            <path d="M16 14v4" />
          </svg>
          <p className="empty-state-title">Henüz banka hesabı kaydı yok</p>
          <p className="empty-state-text">Banka hesaplarınızı takip etmek için kayıt ekleyin.</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hesap Sahibi</th>
                <th>Banka</th>
                <th>IBAN</th>
                <th>Para Birimi</th>
                <th>Bakiye</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const bal = balances[a.id];
                const amount = bal?.balance ?? 0;
                return (
                  <tr key={a.id}>
                    <td>{a.holderName}</td>
                    <td>{a.bankName}</td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{a.iban ?? '—'}</td>
                    <td>{a.currency}</td>
                    <td className="amount">
                      <span style={{ color: amount >= 0 ? '#2e7d32' : 'var(--danger)' }}>
                        {formatCurrency(amount, a.currency)}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/payments/bank-accounts/${a.id}`}
                        className="btn btn-ghost btn-sm"
                        title="Detay"
                      >
                        <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
