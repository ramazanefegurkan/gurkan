import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups, createGroup } from '../../api/client';
import type { GroupResponse } from '../../types';
import './Admin.css';
import '../../styles/shared.css';

export default function GroupList() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const data = await getGroups();
        if (!cancelled) setGroups(data);
      } catch {
        if (!cancelled) setError('Gruplar yüklenirken hata oluştu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  async function handleCreate() {
    setCreateError('');
    if (!createForm.name.trim()) {
      setCreateError('Grup adı zorunludur.');
      return;
    }
    setCreating(true);
    try {
      await createGroup({
        name: createForm.name,
        description: createForm.description || null,
      });
      const data = await getGroups();
      setGroups(data);
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '' });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Grup oluşturulamadı.')
          : 'Sunucuya bağlanılamadı.';
      setCreateError(message);
    } finally {
      setCreating(false);
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
        <h1 className="admin-title">Gruplar</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Yeni Grup
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {groups.length === 0 ? (
        <div className="empty-state">Henüz grup oluşturulmamış.</div>
      ) : (
        <div className="group-grid">
          {groups.map((g) => (
            <div
              key={g.id}
              className="group-card"
              onClick={() => navigate(`/admin/groups/${g.id}`)}
            >
              <div className="group-card-name">{g.name}</div>
              <div className="group-card-desc">{g.description || '—'}</div>
              <div className="group-card-stats">
                <span>{g.members.length} üye</span>
                <span>{g.propertyCount} mülk</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Yeni Grup</div>
            {createError && <div className="error-banner" style={{ marginBottom: 16 }}>{createError}</div>}
            <div className="form-field">
              <label className="form-label">Grup Adı</label>
              <input
                className="form-input"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Açıklama</label>
              <textarea
                className="form-input"
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
