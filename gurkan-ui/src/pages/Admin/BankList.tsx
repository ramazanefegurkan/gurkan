import { useState, useEffect } from 'react';
import { getBanks, createBank, deleteBank } from '../../api/client';
import type { BankResponse } from '../../types';
import './Admin.css';
import '../../styles/shared.css';

export default function BankList() {
  const [banks, setBanks] = useState<BankResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const data = await getBanks();
        if (!cancelled) setBanks(data);
      } catch {
        if (!cancelled) setError('Bankalar yüklenirken hata oluştu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  async function handleCreate() {
    setCreateError('');
    if (!newName.trim()) {
      setCreateError('Banka adı zorunludur.');
      return;
    }
    setCreating(true);
    try {
      const created = await createBank({ name: newName.trim() });
      setBanks((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setShowCreateModal(false);
      setNewName('');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Banka oluşturulamadı.')
          : 'Sunucuya bağlanılamadı.';
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(bank: BankResponse) {
    if (!window.confirm(`"${bank.name}" bankasını silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteBank(bank.id);
      setBanks((prev) => prev.filter((b) => b.id !== bank.id));
    } catch {
      setError('Banka silinemedi.');
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
    <div>
      <div className="admin-header">
        <h1 className="admin-title">Bankalar</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Yeni Banka
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {banks.length === 0 ? (
        <div className="empty-state">Henüz banka eklenmemiş.</div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Banka Adı</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {banks.map((bank) => (
                <tr key={bank.id}>
                  <td>{bank.name}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(bank)}
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Yeni Banka</div>
            {createError && <div className="error-banner" style={{ marginBottom: 16 }}>{createError}</div>}
            <div className="form-field">
              <label className="form-label">Banka Adı</label>
              <input
                className="form-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Örn: Ziraat Bankası"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
