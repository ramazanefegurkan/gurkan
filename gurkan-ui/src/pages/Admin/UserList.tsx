import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getUsers,
  registerUser,
  updateUserRole,
} from '../../api/client';
import type { UserResponse } from '../../types';
import { UserRole, UserRoleLabels } from '../../types';
import './Admin.css';
import '../../styles/shared.css';

export default function UserList() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', password: '', role: UserRole.User as string });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [roleChangeUser, setRoleChangeUser] = useState<UserResponse | null>(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const data = await getUsers();
        if (!cancelled) setUsers(data);
      } catch {
        if (!cancelled) setError('Kullanıcılar yüklenirken hata oluştu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  async function handleCreate() {
    setCreateError('');
    if (!createForm.fullName || !createForm.email || !createForm.password) {
      setCreateError('Tüm alanlar zorunludur.');
      return;
    }
    setCreating(true);
    try {
      await registerUser({
        fullName: createForm.fullName,
        email: createForm.email,
        password: createForm.password,
      });
      if (createForm.role !== 'User') {
        const refreshedUsers = await getUsers();
        const newUser = refreshedUsers.find((u) => u.email === createForm.email);
        if (newUser) {
          await updateUserRole(newUser.id, { role: createForm.role });
        }
      }
      const data = await getUsers();
      setUsers(data);
      setShowCreateModal(false);
      setCreateForm({ fullName: '', email: '', password: '', role: UserRole.User });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Kullanıcı oluşturulamadı.')
          : 'Sunucuya bağlanılamadı.';
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange() {
    if (!roleChangeUser || !newRole) return;
    try {
      await updateUserRole(roleChangeUser.id, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === roleChangeUser.id ? { ...u, role: newRole } : u)),
      );
      setRoleChangeUser(null);
    } catch {
      setError('Rol güncellenirken hata oluştu.');
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
        <h1 className="admin-title">Kullanıcılar</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Yeni Kullanıcı
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Grup</th>
              <th>Kayıt Tarihi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                <td>
                  <span className={`role-badge role-badge--${u.role.toLowerCase()}`}>
                    {UserRoleLabels[u.role as UserRole] ?? u.role}
                  </span>
                </td>
                <td>{u.groupCount}</td>
                <td className="date">
                  {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                </td>
                <td>
                  {u.id !== currentUser?.id && (
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setRoleChangeUser(u);
                          setNewRole(u.role);
                        }}
                      >
                        Rol Değiştir
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Yeni Kullanıcı</div>
            {createError && <div className="error-banner" style={{ marginBottom: 16 }}>{createError}</div>}
            <div className="form-field">
              <label className="form-label">Ad Soyad</label>
              <input
                className="form-input"
                value={createForm.fullName}
                onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Şifre</label>
              <input
                className="form-input"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Rol</label>
              <select
                className="form-select"
                value={createForm.role}
                onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
              >
                {Object.entries(UserRoleLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
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

      {roleChangeUser && (
        <div className="modal-overlay" onClick={() => setRoleChangeUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Rol Değiştir — {roleChangeUser.fullName}</div>
            <div className="form-field">
              <label className="form-label">Rol</label>
              <select
                className="form-select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {Object.entries(UserRoleLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setRoleChangeUser(null)}>İptal</button>
              <button className="btn btn-primary" onClick={handleRoleChange}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
