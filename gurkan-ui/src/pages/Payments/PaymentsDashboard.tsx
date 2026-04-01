import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCreditCards,
  getBankAccounts,
  getBankAccountBalance,
} from '../../api/client';
import type {
  CreditCardListResponse,
  BankAccountResponse,
  BankAccountBalanceResponse,
  Currency,
} from '../../types';
import '../../styles/shared.css';
import './Payments.css';

function formatCurrency(amount: number, currency: Currency): string {
  const symbol = currency === 'TRY' ? '\u20BA' : currency === 'USD' ? '$' : '\u20AC';
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaymentsDashboard() {
  const [cards, setCards] = useState<CreditCardListResponse[]>([]);
  const [accounts, setAccounts] = useState<BankAccountResponse[]>([]);
  const [balances, setBalances] = useState<Record<string, BankAccountBalanceResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cardsData, accountsData] = await Promise.all([
          getCreditCards(),
          getBankAccounts(),
        ]);
        if (cancelled) return;
        setCards(cardsData);
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
        if (!cancelled) setError('Veriler y\u00FCklenemedi.');
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

  const debtByCurrency: Record<string, number> = {};
  cards.forEach((c) => {
    debtByCurrency[c.currency] = (debtByCurrency[c.currency] || 0) + c.currentDebt;
  });

  const balanceByCurrency: Record<string, number> = {};
  accounts.forEach((a) => {
    const bal = balances[a.id];
    if (bal) {
      balanceByCurrency[a.currency] = (balanceByCurrency[a.currency] || 0) + bal.balance;
    }
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">\u00D6demeler</h1>
          <p className="page-subtitle">Kredi kartlar\u0131 ve banka hesaplar\u0131 \u00F6zeti</p>
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

      <div className="section-header">
        <div>
          <h2 className="section-title">Kredi Kartlar\u0131</h2>
          <p className="section-subtitle">{cards.length} kart</p>
        </div>
        <Link to="/payments/credit-cards" className="btn btn-ghost btn-sm">
          T\u00FCm Kartlar
        </Link>
      </div>

      {Object.keys(debtByCurrency).length > 0 && (
        <div className="payment-summary">
          {Object.entries(debtByCurrency).map(([cur, amount]) => (
            <div key={cur} className="payment-summary-item">
              <span className="payment-summary-label">Toplam Bor\u00E7 ({cur})</span>
              <span className="payment-summary-value" style={{ color: 'var(--danger)' }}>
                {formatCurrency(amount, cur as Currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Hen\u00FCz kredi kart\u0131 eklenmemi\u015F</p>
          <Link to="/payments/credit-cards/new" className="btn btn-primary">
            Yeni Kart
          </Link>
        </div>
      ) : (
        <div className="data-table-wrap" style={{ marginBottom: 32 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Banka</th>
                <th>G\u00FCncel Bor\u00E7</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/payments/credit-cards/${c.id}`}>{c.name}</Link>
                  </td>
                  <td>{c.bankName}</td>
                  <td className="amount" style={{ color: 'var(--danger)' }}>
                    {formatCurrency(c.currentDebt, c.currency)}
                  </td>
                  <td>
                    <span className={`transaction-type-badge ${c.isActive ? 'card-status-badge--active' : 'card-status-badge--inactive'}`}>
                      {c.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section-header">
        <div>
          <h2 className="section-title">Banka Hesaplar\u0131</h2>
          <p className="section-subtitle">{accounts.length} hesap</p>
        </div>
        <Link to="/payments/bank-accounts" className="btn btn-ghost btn-sm">
          T\u00FCm Hesaplar
        </Link>
      </div>

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
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Hen\u00FCz banka hesab\u0131 eklenmemi\u015F</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hesap Sahibi</th>
                <th>Banka</th>
                <th>Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const bal = balances[a.id];
                const amount = bal?.balance ?? 0;
                return (
                  <tr key={a.id}>
                    <td>
                      <Link to={`/payments/bank-accounts/${a.id}`}>{a.holderName}</Link>
                    </td>
                    <td>{a.bankName}</td>
                    <td className="amount">
                      <span className={amount >= 0 ? 'balance-amount' : 'balance-amount balance-amount--negative'} style={{ fontSize: 'inherit' }}>
                        {formatCurrency(amount, a.currency)}
                      </span>
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
