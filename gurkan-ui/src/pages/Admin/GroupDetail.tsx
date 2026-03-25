import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getGroup,
  getUsers,
  getProperties,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  assignPropertyToGroup,
  unassignPropertyFromGroup,
} from '../../api/client';
import type { GroupResponse, UserResponse, PropertyListResponse } from '../../types';
import { GroupMemberRole, GroupMemberRoleLabels, PropertyTypeLabels } from '../../types';
import type { PropertyType } from '../../types';
import './Admin.css';
import '../../styles/shared.css';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [groupProperties, setGroupProperties] = useState<PropertyListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [memberForm, setMemberForm] = useState({ userId: '', role: GroupMemberRole.Member as string });

  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [allProperties, setAllProperties] = useState<PropertyListResponse[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  const fetchGroup = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getGroup(id);
      setGroup(data);
      setEditForm({ name: data.name, description: data.description || '' });
    } catch {
      setError('Grup yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchGroupProperties = useCallback(async () => {
    if (!id) return;
    try {
      const props = await getProperties();
      setGroupProperties(props.filter((p) => p.groupId === id));
    } catch { /* non-critical */ }
  }, [id]);

  useEffect(() => {
    fetchGroup();
    fetchGroupProperties();
  }, [fetchGroup, fetchGroupProperties]);

  async function handleEdit() {
    if (!id || !editForm.name.trim()) return;
    try {
      await updateGroup(id, {
        name: editForm.name,
        description: editForm.description || null,
      });
      await fetchGroup();
      setShowEditModal(false);
    } catch {
      setError('Grup güncellenirken hata oluştu.');
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteGroup(id);
      navigate('/admin/groups');
    } catch {
      setError('Grup silinirken hata oluştu.');
      setShowDeleteConfirm(false);
    }
  }

  async function openMemberModal() {
    try {
      const users = await getUsers();
      setAllUsers(users);
      setMemberForm({ userId: '', role: GroupMemberRole.Member });
      setShowMemberModal(true);
    } catch {
      setError('Kullanıcılar yüklenirken hata oluştu.');
    }
  }

  async function handleAddMember() {
    if (!id || !memberForm.userId) return;
    try {
      await addGroupMember(id, {
        userId: memberForm.userId,
        role: memberForm.role as GroupMemberRole,
      });
      await fetchGroup();
      setShowMemberModal(false);
    } catch {
      setError('Üye eklenirken hata oluştu.');
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!id) return;
    try {
      await removeGroupMember(id, userId);
      await fetchGroup();
    } catch {
      setError('Üye çıkarılırken hata oluştu.');
    }
  }

  async function openPropertyModal() {
    try {
      const props = await getProperties();
      setAllProperties(props);
      setSelectedPropertyId('');
      setShowPropertyModal(true);
    } catch {
      setError('Mülkler yüklenirken hata oluştu.');
    }
  }

  async function handleAssignProperty() {
    if (!id || !selectedPropertyId) return;
    try {
      await assignPropertyToGroup(id, { propertyId: selectedPropertyId });
      await fetchGroup();
      await fetchGroupProperties();
      setShowPropertyModal(false);
    } catch {
      setError('Mülk atanırken hata oluştu.');
    }
  }

  async function handleUnassignProperty(propertyId: string) {
    if (!id) return;
    try {
      await unassignPropertyFromGroup(id, propertyId);
      await fetchGroup();
      await fetchGroupProperties();
    } catch {
      setError('Mülk ataması kaldırılırken hata oluştu.');
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!group) {
    return <div className="error-banner">Grup bulunamadı.</div>;
  }

  const memberUserIds = new Set(group.members.map((m) => m.userId));
  const availableUsers = allUsers.filter((u) => !memberUserIds.has(u.id));
  const unassignedProperties = allProperties.filter((p) => p.groupId !== id);

  return (
    <div>
      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="group-detail-header">
        <div className="group-detail-info">
          <h1 className="admin-title">{group.name}</h1>
          {group.description && (
            <div className="group-detail-desc">{group.description}</div>
          )}
        </div>
        <div className="group-detail-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(true)}>
            Düzenle
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>
            Sil
          </button>
        </div>
      </div>

      <div className="group-sections">
        <div className="group-section">
          <div className="group-section-header">
            <span className="group-section-title">Üyeler ({group.members.length})</span>
            <button className="btn btn-primary btn-sm" onClick={openMemberModal}>
              + Üye Ekle
            </button>
          </div>
          {group.members.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}>Henüz üye yok.</div>
          ) : (
            group.members.map((m) => (
              <div key={m.userId} className="member-row">
                <div className="member-info">
                  <span className="member-name">{m.fullName}</span>
                  <span className="member-email">{m.email} · {new Date(m.joinedAt).toLocaleDateString('tr-TR')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`member-role-badge member-role-badge--${m.role.toLowerCase()}`}>
                    {GroupMemberRoleLabels[m.role as GroupMemberRole] ?? m.role}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleRemoveMember(m.userId)}
                  >
                    Çıkar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="group-section">
          <div className="group-section-header">
            <span className="group-section-title">Mülkler ({groupProperties.length})</span>
            <button className="btn btn-primary btn-sm" onClick={openPropertyModal}>
              + Mülk Ata
            </button>
          </div>
          {groupProperties.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}>Henüz mülk atanmamış.</div>
          ) : (
            groupProperties.map((p) => (
              <div key={p.id} className="property-row">
                <span>{p.name} <span className="badge badge-type">{PropertyTypeLabels[p.type as PropertyType] ?? p.type}</span></span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleUnassignProperty(p.id)}
                >
                  Kaldır
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Grubu Düzenle</div>
            <div className="form-field">
              <label className="form-label">Grup Adı</label>
              <input
                className="form-input"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Açıklama</label>
              <textarea
                className="form-input"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleEdit}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">Grubu Sil</div>
            <div className="confirm-text">
              "{group.name}" grubunu silmek istediğinize emin misiniz?
            </div>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>İptal</button>
              <button className="btn btn-danger" onClick={handleDelete}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Üye Ekle</div>
            {availableUsers.length === 0 ? (
              <div className="empty-state" style={{ padding: '16px 0' }}>Eklenebilecek kullanıcı kalmadı.</div>
            ) : (
              <>
                <div className="form-field">
                  <label className="form-label">Kullanıcı</label>
                  <select
                    className="form-select"
                    value={memberForm.userId}
                    onChange={(e) => setMemberForm((f) => ({ ...f, userId: e.target.value }))}
                  >
                    <option value="">Seçiniz...</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Rol</label>
                  <select
                    className="form-select"
                    value={memberForm.role}
                    onChange={(e) => setMemberForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    {Object.entries(GroupMemberRoleLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>İptal</button>
              <button
                className="btn btn-primary"
                onClick={handleAddMember}
                disabled={!memberForm.userId}
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {showPropertyModal && (
        <div className="modal-overlay" onClick={() => setShowPropertyModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Mülk Ata</div>
            {unassignedProperties.length === 0 ? (
              <div className="empty-state" style={{ padding: '16px 0' }}>Atanabilecek mülk kalmadı.</div>
            ) : (
              <div className="form-field">
                <label className="form-label">Mülk</label>
                <select
                  className="form-select"
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                >
                  <option value="">Seçiniz...</option>
                  {unassignedProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.city}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPropertyModal(false)}>İptal</button>
              <button
                className="btn btn-primary"
                onClick={handleAssignProperty}
                disabled={!selectedPropertyId}
              >
                Ata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
