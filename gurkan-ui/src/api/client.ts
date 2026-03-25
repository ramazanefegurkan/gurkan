import axios from 'axios';
import type {
  TokenResponse,
  PropertyResponse,
  PropertyListResponse,
  PropertyNoteResponse,
  GroupResponse,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  TenantListItem,
  TenantResponse,
  CreateTenantRequest,
  UpdateTenantRequest,
  RentPaymentResponse,
  MarkPaymentPaidRequest,
  ShortTermRentalResponse,
  CreateShortTermRentalRequest,
  UpdateShortTermRentalRequest,
  RentIncreaseResponse,
  CreateRentIncreaseRequest,
  ExpenseResponse,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  BillResponse,
  CreateBillRequest,
  UpdateBillRequest,
  DocumentResponse,
  DashboardResponse,
  NotificationItem,
  ProfitLossReport,
  ImportPreviewResponse,
  AirbnbImportRow,
  RentPaymentImportRow,
  BankAccountResponse,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
  UserResponse,
  RegisterRequest,
  UpdateRoleRequest,
  CreateGroupRequest,
  UpdateGroupRequest,
  AddMemberRequest,
  AssignPropertyRequest,
} from '../types';

// ── Axios instance ───────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5039/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT ──────────────────

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Token refresh state ──────────────────────────────

let refreshPromise: Promise<TokenResponse> | null = null;

// Callback for AuthContext to register so it can sync user state after
// the interceptor silently refreshes tokens outside React.
let onTokenRefreshCallback: ((tokens: TokenResponse) => void) | null = null;

export function setOnTokenRefreshCallback(
  cb: ((tokens: TokenResponse) => void) | null,
): void {
  onTokenRefreshCallback = cb;
}

// ── Response interceptor: handle 401 with refresh ────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Don't attempt refresh for auth endpoints — prevents infinite loops
    const url = originalRequest?.url ?? '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Don't retry a request that already went through refresh
    if (originalRequest._retried) {
      return Promise.reject(error);
    }

    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      // No refresh token available — clean logout
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      // Share a single refresh promise across concurrent 401s
      if (!refreshPromise) {
        refreshPromise = refreshToken(storedRefreshToken);
      }

      const tokens = await refreshPromise;

      // Update localStorage with new tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('expiresAt', tokens.expiresAt);

      // Notify AuthContext so React state stays in sync
      if (onTokenRefreshCallback) {
        onTokenRefreshCallback(tokens);
      }

      console.debug('[auth] Token refreshed successfully, new expiresAt:', tokens.expiresAt);

      // Retry the original request with the new access token
      originalRequest._retried = true;
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      console.warn('[auth] Token refresh failed:', refreshError);

      // Refresh failed — clean logout
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  },
);

// ── Auth ─────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/login', {
    email,
    password,
  });
  return data;
}

export async function refreshToken(
  token: string,
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/refresh', {
    refreshToken: token,
  });
  return data;
}

// ── Properties ───────────────────────────────────────

export async function getProperties(): Promise<PropertyListResponse[]> {
  const { data } = await api.get<PropertyListResponse[]>('/properties');
  return data;
}

export async function getProperty(id: string): Promise<PropertyResponse> {
  const { data } = await api.get<PropertyResponse>(`/properties/${id}`);
  return data;
}

export async function createProperty(
  payload: CreatePropertyRequest,
): Promise<PropertyResponse> {
  const { data } = await api.post<PropertyResponse>('/properties', payload);
  return data;
}

export async function updateProperty(
  id: string,
  payload: UpdatePropertyRequest,
): Promise<PropertyResponse> {
  const { data } = await api.put<PropertyResponse>(
    `/properties/${id}`,
    payload,
  );
  return data;
}

export async function deleteProperty(id: string): Promise<void> {
  await api.delete(`/properties/${id}`);
}

// ── Property Notes ───────────────────────────────────

export async function getPropertyNotes(
  propertyId: string,
): Promise<PropertyNoteResponse[]> {
  const { data } = await api.get<PropertyNoteResponse[]>(
    `/properties/${propertyId}/notes`,
  );
  return data;
}

export async function createPropertyNote(
  propertyId: string,
  content: string,
): Promise<PropertyNoteResponse> {
  const { data } = await api.post<PropertyNoteResponse>(
    `/properties/${propertyId}/notes`,
    { content },
  );
  return data;
}

export async function updatePropertyNote(
  propertyId: string,
  noteId: string,
  content: string,
): Promise<PropertyNoteResponse> {
  const { data } = await api.put<PropertyNoteResponse>(
    `/properties/${propertyId}/notes/${noteId}`,
    { content },
  );
  return data;
}

export async function deletePropertyNote(
  propertyId: string,
  noteId: string,
): Promise<void> {
  await api.delete(`/properties/${propertyId}/notes/${noteId}`);
}

// ── Groups ───────────────────────────────────────────

export async function getGroups(): Promise<GroupResponse[]> {
  const { data } = await api.get<GroupResponse[]>('/groups');
  return data;
}

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

// ── Tenants ──────────────────────────────────────────

export async function getTenants(
  propertyId: string,
  active?: boolean,
): Promise<TenantListItem[]> {
  const params = active !== undefined ? { active } : {};
  const { data } = await api.get<TenantListItem[]>(
    `/properties/${propertyId}/tenants`,
    { params },
  );
  return data;
}

export async function getTenant(
  propertyId: string,
  tenantId: string,
): Promise<TenantResponse> {
  const { data } = await api.get<TenantResponse>(
    `/properties/${propertyId}/tenants/${tenantId}`,
  );
  return data;
}

export async function createTenant(
  propertyId: string,
  payload: CreateTenantRequest,
): Promise<TenantResponse> {
  const { data } = await api.post<TenantResponse>(
    `/properties/${propertyId}/tenants`,
    payload,
  );
  return data;
}

export async function updateTenant(
  propertyId: string,
  tenantId: string,
  payload: UpdateTenantRequest,
): Promise<TenantResponse> {
  const { data } = await api.put<TenantResponse>(
    `/properties/${propertyId}/tenants/${tenantId}`,
    payload,
  );
  return data;
}

export async function terminateTenant(
  propertyId: string,
  tenantId: string,
): Promise<void> {
  await api.post(`/properties/${propertyId}/tenants/${tenantId}/terminate`);
}

// ── Rent Payments ────────────────────────────────────

export async function getRentPayments(
  propertyId: string,
  tenantId: string,
  status?: string,
): Promise<RentPaymentResponse[]> {
  const params = status ? { status } : {};
  const { data } = await api.get<RentPaymentResponse[]>(
    `/properties/${propertyId}/tenants/${tenantId}/rent-payments`,
    { params },
  );
  return data;
}

export async function markPaymentPaid(
  propertyId: string,
  tenantId: string,
  paymentId: string,
  payload: MarkPaymentPaidRequest,
): Promise<RentPaymentResponse> {
  const { data } = await api.patch<RentPaymentResponse>(
    `/properties/${propertyId}/tenants/${tenantId}/rent-payments/${paymentId}/pay`,
    payload,
  );
  return data;
}

// ── Short-Term Rentals ───────────────────────────────

export async function getShortTermRentals(
  propertyId: string,
): Promise<ShortTermRentalResponse[]> {
  const { data } = await api.get<ShortTermRentalResponse[]>(
    `/properties/${propertyId}/short-term-rentals`,
  );
  return data;
}

export async function getShortTermRental(
  propertyId: string,
  rentalId: string,
): Promise<ShortTermRentalResponse> {
  const { data } = await api.get<ShortTermRentalResponse>(
    `/properties/${propertyId}/short-term-rentals/${rentalId}`,
  );
  return data;
}

export async function createShortTermRental(
  propertyId: string,
  payload: CreateShortTermRentalRequest,
): Promise<ShortTermRentalResponse> {
  const { data } = await api.post<ShortTermRentalResponse>(
    `/properties/${propertyId}/short-term-rentals`,
    payload,
  );
  return data;
}

export async function updateShortTermRental(
  propertyId: string,
  rentalId: string,
  payload: UpdateShortTermRentalRequest,
): Promise<ShortTermRentalResponse> {
  const { data } = await api.put<ShortTermRentalResponse>(
    `/properties/${propertyId}/short-term-rentals/${rentalId}`,
    payload,
  );
  return data;
}

export async function deleteShortTermRental(
  propertyId: string,
  rentalId: string,
): Promise<void> {
  await api.delete(`/properties/${propertyId}/short-term-rentals/${rentalId}`);
}

// ── Rent Increases ───────────────────────────────────

export async function getRentIncreases(
  propertyId: string,
  tenantId: string,
): Promise<RentIncreaseResponse[]> {
  const { data } = await api.get<RentIncreaseResponse[]>(
    `/properties/${propertyId}/tenants/${tenantId}/rent-increases`,
  );
  return data;
}

export async function createRentIncrease(
  propertyId: string,
  tenantId: string,
  payload: CreateRentIncreaseRequest,
): Promise<RentIncreaseResponse> {
  const { data } = await api.post<RentIncreaseResponse>(
    `/properties/${propertyId}/tenants/${tenantId}/rent-increases`,
    payload,
  );
  return data;
}

// ── Expenses ─────────────────────────────────────────

export async function getExpenses(
  propertyId: string,
  category?: string,
): Promise<ExpenseResponse[]> {
  const params = category ? { category } : {};
  const { data } = await api.get<ExpenseResponse[]>(
    `/properties/${propertyId}/expenses`,
    { params },
  );
  return data;
}

export async function getExpense(
  propertyId: string,
  id: string,
): Promise<ExpenseResponse> {
  const { data } = await api.get<ExpenseResponse>(
    `/properties/${propertyId}/expenses/${id}`,
  );
  return data;
}

export async function createExpense(
  propertyId: string,
  payload: CreateExpenseRequest,
): Promise<ExpenseResponse> {
  const { data } = await api.post<ExpenseResponse>(
    `/properties/${propertyId}/expenses`,
    payload,
  );
  return data;
}

export async function updateExpense(
  propertyId: string,
  id: string,
  payload: UpdateExpenseRequest,
): Promise<ExpenseResponse> {
  const { data } = await api.put<ExpenseResponse>(
    `/properties/${propertyId}/expenses/${id}`,
    payload,
  );
  return data;
}

export async function deleteExpense(
  propertyId: string,
  id: string,
): Promise<void> {
  await api.delete(`/properties/${propertyId}/expenses/${id}`);
}

// ── Bills ────────────────────────────────────────────

export async function getBills(
  propertyId: string,
  status?: string,
): Promise<BillResponse[]> {
  const params = status ? { status } : {};
  const { data } = await api.get<BillResponse[]>(
    `/properties/${propertyId}/bills`,
    { params },
  );
  return data;
}

export async function getBill(
  propertyId: string,
  id: string,
): Promise<BillResponse> {
  const { data } = await api.get<BillResponse>(
    `/properties/${propertyId}/bills/${id}`,
  );
  return data;
}

export async function createBill(
  propertyId: string,
  payload: CreateBillRequest,
): Promise<BillResponse> {
  const { data } = await api.post<BillResponse>(
    `/properties/${propertyId}/bills`,
    payload,
  );
  return data;
}

export async function updateBill(
  propertyId: string,
  id: string,
  payload: UpdateBillRequest,
): Promise<BillResponse> {
  const { data } = await api.put<BillResponse>(
    `/properties/${propertyId}/bills/${id}`,
    payload,
  );
  return data;
}

export async function deleteBill(
  propertyId: string,
  id: string,
): Promise<void> {
  await api.delete(`/properties/${propertyId}/bills/${id}`);
}

export async function markBillPaid(
  propertyId: string,
  id: string,
): Promise<BillResponse> {
  const { data } = await api.patch<BillResponse>(
    `/properties/${propertyId}/bills/${id}/pay`,
  );
  return data;
}

// ── Documents ────────────────────────────────────────

export async function getDocuments(
  propertyId: string,
  category?: string,
): Promise<DocumentResponse[]> {
  const params = category ? { category } : {};
  const { data } = await api.get<DocumentResponse[]>(
    `/properties/${propertyId}/documents`,
    { params },
  );
  return data;
}

export async function uploadDocument(
  propertyId: string,
  file: File,
  category: string,
): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  const { data } = await api.post<DocumentResponse>(
    `/properties/${propertyId}/documents`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function downloadDocument(
  propertyId: string,
  documentId: string,
): Promise<void> {
  const { data, headers } = await api.get(
    `/properties/${propertyId}/documents/${documentId}/download`,
    { responseType: 'blob' },
  );
  // axios responseType:'blob' returns a Blob — use directly to preserve MIME type
  const blob = data instanceof Blob ? data : new Blob([data], { type: headers['content-type'] });
  const url = URL.createObjectURL(blob);
  const contentDisposition = headers['content-disposition'] || '';
  // Extract filename from content-disposition or fall back to documentId
  const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `document-${documentId}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deleteDocument(
  propertyId: string,
  documentId: string,
): Promise<void> {
  await api.delete(`/properties/${propertyId}/documents/${documentId}`);
}

// ── Dashboard ────────────────────────────────────────

export async function getDashboard(year?: number, month?: number, rentalType?: string): Promise<DashboardResponse> {
  const params: Record<string, unknown> = {};
  if (year) params.year = year;
  if (month) params.month = month;
  if (rentalType) params.rentalType = rentalType;
  const { data } = await api.get<DashboardResponse>('/dashboard', { params });
  return data;
}

// ── Notifications ────────────────────────────────────

export async function getNotifications(): Promise<NotificationItem[]> {
  const { data } = await api.get<NotificationItem[]>('/notifications');
  return data;
}

export async function dismissNotification(key: string): Promise<void> {
  await api.post('/notifications/dismiss', { key });
}

export async function dismissAllNotifications(keys: string[]): Promise<void> {
  await api.post('/notifications/dismiss-all', { keys });
}

// ── Reports ──────────────────────────────────────────

export async function getProfitLossReport(year?: number): Promise<ProfitLossReport> {
  const params = year ? { year } : {};
  const { data } = await api.get<ProfitLossReport>('/reports/profit-loss', { params });
  return data;
}

export async function exportExcel(): Promise<void> {
  const { data } = await api.get('/reports/export/excel', { responseType: 'blob' });
  const blob = data instanceof Blob ? data : new Blob([data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'portfoy-raporu.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportPdf(): Promise<void> {
  const { data } = await api.get('/reports/export/pdf', { responseType: 'blob' });
  const blob = data instanceof Blob ? data : new Blob([data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'portfoy-raporu.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Import ───────────────────────────────────────────

export async function importAirbnbCsv(
  propertyId: string,
  file: File,
  dryRun: boolean = true,
): Promise<ImportPreviewResponse<AirbnbImportRow>> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<ImportPreviewResponse<AirbnbImportRow>>(
    `/import/airbnb-csv?propertyId=${propertyId}&dryRun=${dryRun}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function importRentPayments(
  file: File,
  dryRun: boolean = true,
): Promise<ImportPreviewResponse<RentPaymentImportRow>> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<ImportPreviewResponse<RentPaymentImportRow>>(
    `/import/rent-payments?dryRun=${dryRun}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

// ── Bank Accounts ────────────────────────────────────

export async function getBankAccounts(groupId?: string): Promise<BankAccountResponse[]> {
  const params = groupId ? { groupId } : {};
  const { data } = await api.get<BankAccountResponse[]>('/bank-accounts', { params });
  return data;
}

export async function getBankAccount(id: string): Promise<BankAccountResponse> {
  const { data } = await api.get<BankAccountResponse>(`/bank-accounts/${id}`);
  return data;
}

export async function createBankAccount(payload: CreateBankAccountRequest): Promise<BankAccountResponse> {
  const { data } = await api.post<BankAccountResponse>('/bank-accounts', payload);
  return data;
}

export async function updateBankAccount(id: string, payload: UpdateBankAccountRequest): Promise<BankAccountResponse> {
  const { data } = await api.put<BankAccountResponse>(`/bank-accounts/${id}`, payload);
  return data;
}

export async function deleteBankAccount(id: string): Promise<void> {
  await api.delete(`/bank-accounts/${id}`);
}

export default api;
