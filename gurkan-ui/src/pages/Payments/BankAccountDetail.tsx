import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getBankAccount,
  getBankAccountBalance,
  getBankTransactions,
  deleteBankTransaction,
} from '../../api/client';
import {
  BankTransactionType,
  BankTransactionTypeLabels,
} from '../../types';
import type {
  BankAccountResponse,
  BankAccountBalanceResponse,
  BankTransactionResponse,
  Currency,
} from '../../types';
import '../../styles/shared.css';
import './Payments.css';

function formatCurrency(amount: number, currency: Currency): string {
  const symbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€';
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

function transactionTypeBadgeClass(type: string): string {
  switch (type) {
    case BankTransactionType.Income:
      return 'transaction-type-badge transaction-type-badge--income';
    case BankTransactionType.Expense:
      return 'transaction-type-badge transaction-type-badge--expense';
    case BankTransactionType.CreditCardPayment:
      return 'transaction-type-badge transaction-type-badge--card-payment';
    default:
      return 'transaction-type-badge';
  }
}

export default function BankAccountDetail() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<BankAccountResponse | null>(null);
  const [balance, setBalance] = useState<BankAccountBalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<BankTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const [accountData, balanceData, transactionsData] = await Promise.all([
          getBankAccount(id!),
          getBankAccountBalance(id!),
          getBankTransactions(id!),
        ]);
        if (!cancelled) {
          setAccount(accountData);
          setBalance(balanceData);
          setTransactions(transactionsData);
        }
      } catch {
        if (!cancelled) setError('Veriler yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  async function handleDelete(transactionId: string) {
    if (!id) return;
    if (!window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;

    setDeletingId(transactionId);
    try {
      await deleteBankTransaction(id, transactionId);
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
      const balanceData = await getBankAccountBalance(id);
      setBalance(balanceData);
    } catch {
      setError('İşlem silinemedi.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Hesap bulunamadı</p>
        <Link to="/payments/bank-accounts" className="btn btn-primary">
          Hesaplara Dön
        </Link>
      </div>
    );
  }

  const balanceAmount = balance?.balance ?? 0;

  return (
    <div>
      <Link to="/payments/bank-accounts" className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Hesaplara Dön
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{account.holderName}</h1>
          <p className="page-subtitle">
            {account.bankName}
            {account.iban ? ` · ${account.iban}` : ''}
            {` · ${account.currency}`}
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

      <div className="payment-summary">
        <div className="payment-summary-item">
          <span className="payment-summary-label">Bakiye</span>
          <span className={balanceAmount >= 0 ? 'balance-amount' : 'balance-amount balance-amount--negative'}>
            {formatCurrency(balanceAmount, account.currency)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <Link to={`/payments/bank-accounts/${id}/transactions/new`} className="btn btn-primary btn-sm">
          İşlem Ekle
        </Link>
      </div>

      <div className="section-header">
        <div>
          <h2 className="section-title">İşlemler</h2>
          <p className="section-subtitle">{transactions.length} işlem</p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Henüz işlem kaydı yok</p>
          <Link to={`/payments/bank-accounts/${id}/transactions/new`} className="btn btn-primary">
            İşlem Ekle
          </Link>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tür</th>
                <th>Açıklama</th>
                <th>Tutar</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const isCreditCardPayment = t.type === BankTransactionType.CreditCardPayment;
                return (
                  <tr key={t.id}>
                    <td className="date">{formatDate(t.date)}</td>
                    <td>
                      <span className={transactionTypeBadgeClass(t.type)}>
                        {BankTransactionTypeLabels[t.type as keyof typeof BankTransactionTypeLabels] ?? t.type}
                      </span>
                    </td>
                    <td>{t.description}</td>
                    <td className="amount">{formatCurrency(t.amount, account.currency)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {!isCreditCardPayment && (
                          <>
                            <Link
                              to={`/payments/bank-accounts/${id}/transactions/${t.id}/edit`}
                              className="btn btn-ghost btn-sm"
                              title="Düzenle"
                            >
                              <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                            </Link>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDelete(t.id)}
                              disabled={deletingId === t.id}
                              title="Sil"
                            >
                              <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
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
