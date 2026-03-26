# Superadmin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user and group management UI to the React frontend, accessible only to SuperAdmin users.

**Architecture:** New pages under `src/pages/Admin/` with route guard. Uses existing API endpoints — no backend changes. Follows existing project patterns: useState+useEffect for state, CSS modules per page, modal-overlay/modal-dialog for modals.

**Tech Stack:** React 19, TypeScript, React Router, Axios (existing client.ts)

**Spec:** `docs/superpowers/specs/2026-03-25-superadmin-panel-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `gurkan-ui/src/types/index.ts` | Add UserResponse, RegisterRequest, UpdateRoleRequest types |
| Modify | `gurkan-ui/src/api/client.ts` | Add admin API functions (users CRUD, group detail, member/property management) |
| Modify | `gurkan-ui/src/App.tsx` | Add `/admin/*` routes with SuperAdmin guard |
| Modify | `gurkan-ui/src/components/Layout.tsx` | Add "Yönetim" section to sidebar (SuperAdmin only) |
| Create | `gurkan-ui/src/pages/Admin/Admin.css` | Styles for all admin pages |
| Create | `gurkan-ui/src/pages/Admin/UserList.tsx` | User table + create modal + role change |
| Create | `gurkan-ui/src/pages/Admin/GroupList.tsx` | Group card grid + create modal |
| Create | `gurkan-ui/src/pages/Admin/GroupDetail.tsx` | Group detail with member/property management |

---

### Task 1: Types — Add Admin DTOs

**Files:**
- Modify: `gurkan-ui/src/types/index.ts`

- [ ] **Step 1: Add UserResponse and admin request types**

After the `UserInfo` interface (~line 14), add:

```typescript
export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
  groupCount: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface UpdateRoleRequest {
  role: string;
}

export const UserRole = {
  SuperAdmin: 'SuperAdmin',
  User: 'User',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'SuperAdmin',
  [UserRole.User]: 'Kullanıcı',
};

export const GroupMemberRole = {
  Admin: 'Admin',
  Member: 'Member',
} as const;

export type GroupMemberRole = (typeof GroupMemberRole)[keyof typeof GroupMemberRole];

export const GroupMemberRoleLabels: Record<GroupMemberRole, string> = {
  [GroupMemberRole.Admin]: 'Yönetici',
  [GroupMemberRole.Member]: 'Üye',
};

export interface CreateGroupRequest {
  name: string;
  description?: string | null;
}

export interface UpdateGroupRequest {
  name?: string | null;
  description?: string | null;
}

export interface AddMemberRequest {
  userId: string;
  role: GroupMemberRole;
}

export interface AssignPropertyRequest {
  propertyId: string;
}
```

Also add `joinedAt` to the existing `GroupMemberResponse` (line ~591):

```typescript
export interface GroupMemberResponse {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  joinedAt: string;
}
```

- [ ] **Step 2: Verify build**

Run: `cd gurkan-ui && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add gurkan-ui/src/types/index.ts
git commit -m "feat(admin): add user/group admin DTO types"
```

---

### Task 2: API Client — Add Admin Functions

**Files:**
- Modify: `gurkan-ui/src/api/client.ts`

- [ ] **Step 1: Add imports for new types**

Add to the import block at top of `client.ts`:

```typescript
import type {
  // ... existing imports ...
  UserResponse,
  RegisterRequest,
  UpdateRoleRequest,
  CreateGroupRequest,
  UpdateGroupRequest,
  AddMemberRequest,
  AssignPropertyRequest,
} from '../types';
```

- [ ] **Step 2: Add Users API section**

After the existing `// ── Groups ──` section (after `getGroups`), add:

```typescript
// ── Users (Admin) ───────────────────────────────────

export async function getUsers(): Promise<UserResponse[]> {
  const { data } = await api.get<UserResponse[]>('/users');
  return data;
}

export async function registerUser(payload: RegisterRequest): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/register', payload);
  return data;
}

export async function updateUserRole(userId: string, payload: UpdateRoleRequest): Promise<void> {
  await api.patch(`/users/${userId}/role`, payload);
}
```

- [ ] **Step 3: Add Groups Admin API section**

After the Users section, add:

```typescript
// ── Groups (Admin) ──────────────────────────────────

export async function getGroup(id: string): Promise<GroupResponse> {
  const { data } = await api.get<GroupResponse>(`/groups/${id}`);
  return data;
}

export async function createGroup(payload: CreateGroupRequest): Promise<GroupResponse> {
  const { data } = await api.post<GroupResponse>('/groups', payload);
  return data;
}

export async function updateGroup(id: string, payload: UpdateGroupRequest): Promise<GroupResponse> {
  const { data } = await api.put<GroupResponse>(`/groups/${id}`, payload);
  return data;
}

export async function deleteGroup(id: string): Promise<void> {
  await api.delete(`/groups/${id}`);
}

export async function addGroupMember(groupId: string, payload: AddMemberRequest): Promise<void> {
  await api.post(`/groups/${groupId}/members`, payload);
}

export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  await api.delete(`/groups/${groupId}/members/${memberId}`);
}

export async function assignPropertyToGroup(groupId: string, payload: AssignPropertyRequest): Promise<void> {
  await api.post(`/groups/${groupId}/properties`, payload);
}

export async function unassignPropertyFromGroup(groupId: string, propertyId: string): Promise<void> {
  await api.delete(`/groups/${groupId}/properties/${propertyId}`);
}
```

- [ ] **Step 4: Verify build**

Run: `cd gurkan-ui && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add gurkan-ui/src/api/client.ts
git commit -m "feat(admin): add user/group admin API client functions"
```

---

### Task 3: Route Guard & Routing

**Files:**
- Modify: `gurkan-ui/src/App.tsx`

- [ ] **Step 1: Add SuperAdminRoute guard**

After the existing `ProtectedRoute` component, add:

```tsx
function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== 'SuperAdmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Add admin route imports and routes**

Add imports:
```tsx
import UserList from './pages/Admin/UserList';
import GroupList from './pages/Admin/GroupList';
import GroupDetail from './pages/Admin/GroupDetail';
```

Inside the protected `<Route element={...}>` block, after the property sub-pages route and before the catch-all, add:

```tsx
{/* Admin routes */}
<Route path="/admin/users" element={<SuperAdminRoute><UserList /></SuperAdminRoute>} />
<Route path="/admin/groups" element={<SuperAdminRoute><GroupList /></SuperAdminRoute>} />
<Route path="/admin/groups/:id" element={<SuperAdminRoute><GroupDetail /></SuperAdminRoute>} />
```

- [ ] **Step 3: Commit**

```bash
git add gurkan-ui/src/App.tsx
git commit -m "feat(admin): add SuperAdmin route guard and admin routes"
```

---

### Task 4: Sidebar — Yönetim Section

**Files:**
- Modify: `gurkan-ui/src/components/Layout.tsx`
- Modify: `gurkan-ui/src/components/Layout.css`

- [ ] **Step 1: Add Yönetim section to sidebar**

In `Layout.tsx`, inside `<nav className="sidebar-nav">`, after the İçe Aktar NavLink (after line ~135), add:

```tsx
{user?.role === 'SuperAdmin' && (
  <>
    <div className="nav-separator" />
    <div className="nav-section-label">Yönetim</div>
    <NavLink
      to="/admin/users"
      className={({ isActive }) =>
        `nav-item ${isActive ? 'nav-item--active' : ''}`
      }
    >
      <svg
        className="nav-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
      <span>Kullanıcılar</span>
    </NavLink>
    <NavLink
      to="/admin/groups"
      className={({ isActive }) =>
        `nav-item ${isActive ? 'nav-item--active' : ''}`
      }
    >
      <svg
        className="nav-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
      <span>Gruplar</span>
    </NavLink>
  </>
)}
```

- [ ] **Step 2: Add separator and section label CSS**

In `Layout.css`, add:

```css
.nav-separator {
  height: 1px;
  background: var(--border-subtle);
  margin: 12px 16px;
}

.nav-section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-tertiary);
  padding: 4px 24px;
  margin-bottom: 4px;
}
```

- [ ] **Step 3: Verify visually**

Run: `cd gurkan-ui && npm run dev`
Open browser, login as SuperAdmin. Confirm "Yönetim" section appears with Kullanıcılar and Gruplar links. Confirm it does NOT appear for regular User role.

- [ ] **Step 4: Commit**

```bash
git add gurkan-ui/src/components/Layout.tsx gurkan-ui/src/components/Layout.css
git commit -m "feat(admin): add Yönetim section to sidebar for SuperAdmin"
```

---

### Task 5: Admin CSS

**Files:**
- Create: `gurkan-ui/src/pages/Admin/Admin.css`

- [ ] **Step 1: Create Admin.css with all admin page styles**

```css
/* ── Page header ─────────────────────────────────── */

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.admin-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

/* ── User table extras ───────────────────────────── */

.role-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.role-badge--superadmin {
  background: var(--accent);
  color: white;
}

.role-badge--user {
  background: var(--border-subtle);
  color: var(--text-secondary);
}

.row-actions {
  display: flex;
  gap: 6px;
}

/* ── Group cards ─────────────────────────────────── */

.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.group-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 20px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.group-card:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.group-card-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.group-card-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.group-card-stats {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--text-tertiary);
}

/* ── Group detail ────────────────────────────────── */

.group-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.group-detail-info {
  flex: 1;
}

.group-detail-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.group-detail-actions {
  display: flex;
  gap: 8px;
}

.group-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.group-section {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 20px;
}

.group-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.group-section-title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.member-row,
.property-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 14px;
}

.member-row:last-child,
.property-row:last-child {
  border-bottom: none;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-name {
  color: var(--text-primary);
  font-weight: 500;
}

.member-email {
  font-size: 12px;
  color: var(--text-tertiary);
}

.member-role-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.member-role-badge--admin {
  background: var(--accent-subtle);
  color: var(--accent);
}

.member-role-badge--member {
  background: var(--border-subtle);
  color: var(--text-secondary);
}

/* ── Responsive ──────────────────────────────────── */

@media (max-width: 768px) {
  .group-sections {
    grid-template-columns: 1fr;
  }

  .group-detail-header {
    flex-direction: column;
    gap: 12px;
  }

  .admin-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add gurkan-ui/src/pages/Admin/Admin.css
git commit -m "feat(admin): add admin page styles"
```

---

### Task 6: UserList Page

**Files:**
- Create: `gurkan-ui/src/pages/Admin/UserList.tsx`

- [ ] **Step 1: Create UserList with table, create modal, and role change**

Create `gurkan-ui/src/pages/Admin/UserList.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify build and test visually**

Run: `cd gurkan-ui && npx tsc --noEmit`
Then open browser, navigate to `/admin/users`. Verify table loads, create modal opens, role change works.

- [ ] **Step 3: Commit**

```bash
git add gurkan-ui/src/pages/Admin/UserList.tsx
git commit -m "feat(admin): add user list page with create and role change"
```

---

### Task 7: GroupList Page

**Files:**
- Create: `gurkan-ui/src/pages/Admin/GroupList.tsx`

- [ ] **Step 1: Create GroupList with card grid and create modal**

Create `gurkan-ui/src/pages/Admin/GroupList.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify build and test visually**

Run: `cd gurkan-ui && npx tsc --noEmit`
Then open `/admin/groups`. Verify cards render, create modal works, clicking a card navigates to detail.

- [ ] **Step 3: Commit**

```bash
git add gurkan-ui/src/pages/Admin/GroupList.tsx
git commit -m "feat(admin): add group list page with card grid and create modal"
```

---

### Task 8: GroupDetail Page

**Files:**
- Create: `gurkan-ui/src/pages/Admin/GroupDetail.tsx`

- [ ] **Step 1: Create GroupDetail with member and property management**

Create `gurkan-ui/src/pages/Admin/GroupDetail.tsx`:

```tsx
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
import { GroupMemberRole, GroupMemberRoleLabels } from '../../types';
import './Admin.css';
import '../../styles/shared.css';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<GroupResponse | null>(null);
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

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

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
        {/* Members */}
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
                  <span className="member-email">{m.email}</span>
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

        {/* Properties */}
        <div className="group-section">
          <div className="group-section-header">
            <span className="group-section-title">Mülkler ({group.propertyCount})</span>
            <button className="btn btn-primary btn-sm" onClick={openPropertyModal}>
              + Mülk Ata
            </button>
          </div>
          {group.propertyCount === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}>Henüz mülk atanmamış.</div>
          ) : (
            <div className="empty-state" style={{ padding: '16px 0' }}>
              Mülk listesi grup detay API'sinden yüklenir.
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
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

      {/* Delete Confirm */}
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

      {/* Add Member Modal */}
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

      {/* Assign Property Modal */}
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
```

**Note:** The `GET /api/groups/:id` response includes `propertyCount` but not the full property list. We load properties via `getProperties()` and filter by `groupId === id`.

The component above needs these additions (already integrated in the final file):

1. Add state: `const [groupProperties, setGroupProperties] = useState<PropertyListResponse[]>([]);`
2. Add effect after `fetchGroup` effect:

```tsx
useEffect(() => {
  if (!id) return;
  let cancelled = false;
  async function fetchProps() {
    try {
      const props = await getProperties();
      if (!cancelled) setGroupProperties(props.filter((p) => p.groupId === id));
    } catch { /* non-critical */ }
  }
  fetchProps();
  return () => { cancelled = true; };
}, [id]);
```

3. Replace the property section placeholder (`Mülk listesi grup detay API'sinden yüklenir.`) with:

```tsx
{groupProperties.length === 0 ? (
  <div className="empty-state" style={{ padding: '16px 0' }}>Henüz mülk atanmamış.</div>
) : (
  groupProperties.map((p) => (
    <div key={p.id} className="property-row">
      <span>{p.name}</span>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => handleUnassignProperty(p.id)}
      >
        Kaldır
      </button>
    </div>
  ))
)}
```

4. Re-fetch properties after assign/unassign by calling `setGroupProperties` update after `fetchGroup()`.

- [ ] **Step 3: Verify build and test visually**

Run: `cd gurkan-ui && npx tsc --noEmit`
Then test all flows: view group detail, edit group, add/remove member, assign/unassign property, delete group.

- [ ] **Step 4: Commit**

```bash
git add gurkan-ui/src/pages/Admin/GroupDetail.tsx
git commit -m "feat(admin): add group detail page with member and property management"
```

---

### Task 9: Final Verification & Cleanup

- [ ] **Step 1: Full build check**

Run: `cd gurkan-ui && npm run build`
Expected: Successful build with no errors

- [ ] **Step 2: Test all flows end-to-end**

1. Login as SuperAdmin → verify "Yönetim" section in sidebar
2. Navigate to Kullanıcılar → verify table loads
3. Create a new user → verify appears in table
4. Change user role → verify badge updates
5. Navigate to Gruplar → verify cards load
6. Create a new group → verify card appears
7. Click a group → verify detail page loads
8. Add a member → verify appears in list
9. Remove a member → verify removed
10. Assign a property → verify appears in list
11. Unassign a property → verify removed
12. Edit group → verify name/description updates
13. Delete group → verify redirects to list
14. Login as regular User → verify "Yönetim" section is NOT visible
15. Navigate directly to `/admin/users` as User → verify redirect to dashboard

- [ ] **Step 3: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(admin): superadmin panel with user and group management"
```
