import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type {
  TokenResponse,
  PropertyResponse,
  PropertyListResponse,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  GroupResponse,
  DashboardResponse,
  NotificationItem,
  PropertyNoteResponse,
  TenantListItem,
  TenantResponse,
  CreateTenantRequest,
  UpdateTenantRequest,
  RentPaymentResponse,
  MarkPaymentPaidRequest,
  RentIncreaseResponse,
  CreateRentIncreaseRequest,
  ShortTermRentalResponse,
  CreateShortTermRentalRequest,
  UpdateShortTermRentalRequest,
  ExpenseResponse,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  BillResponse,
  CreateBillRequest,
  UpdateBillRequest,
  DocumentResponse,
  ProfitLossReport,
  ImportPreviewResponse,
  AirbnbImportRow,
  RentPaymentImportRow,
  DeviceTokenRequest,
  PushTriggerResponse,
  TelegramLinkResponse,
} from './types';

// ── Storage helpers (SecureStore on native, localStorage on web) ──

async function getStorageItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    }
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.error('[auth] SecureStore read error', e);
    return null;
  }
}

async function setStorageItem(key: string, value: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } else {
      if (value === null) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    }
  } catch (e) {
    console.error('[auth] SecureStore write error', e);
  }
}

// ── API base URL ─────────────────────────────────────

function getApiUrl(): string {
  return (
    Constants.expoConfig?.extra?.apiUrl ??
    'https://gurkan.efegurkan.com/api'
  );
}

// ── Axios instance ───────────────────────────────────

const api = axios.create({
  baseURL: getApiUrl(),
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT (async — SecureStore is async) ──

api.interceptors.request.use(async (config) => {
  const token = await getStorageItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Token refresh state ──────────────────────────────

let refreshPromise: Promise<TokenResponse> | null = null;

// Callback for SessionProvider to register so it can sync React state
// after the interceptor silently refreshes tokens outside React.
let onTokenRefreshCallback: ((tokens: TokenResponse | null) => void) | null = null;

export function setOnTokenRefreshCallback(
  cb: ((tokens: TokenResponse | null) => void) | null,
): void {
  onTokenRefreshCallback = cb;
}

// ── Response interceptor: handle 401 with refresh ────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Non-401 errors — reject immediately
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

    const storedRefreshToken = await getStorageItem('refreshToken');
    if (!storedRefreshToken) {
      // No refresh token available — clear tokens and trigger auth context logout
      await setStorageItem('accessToken', null);
      await setStorageItem('refreshToken', null);
      await setStorageItem('expiresAt', null);
      if (onTokenRefreshCallback) {
        onTokenRefreshCallback(null);
      }
      return Promise.reject(error);
    }

    try {
      // Share a single refresh promise across concurrent 401s
      if (!refreshPromise) {
        refreshPromise = refreshToken(storedRefreshToken);
      }

      const tokens = await refreshPromise;

      // Update SecureStore with new tokens
      await setStorageItem('accessToken', tokens.accessToken);
      await setStorageItem('refreshToken', tokens.refreshToken);
      await setStorageItem('expiresAt', tokens.expiresAt);

      // Notify SessionProvider so React state stays in sync
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

      // Refresh failed — clear tokens and trigger logout via auth context
      await setStorageItem('accessToken', null);
      await setStorageItem('refreshToken', null);
      await setStorageItem('expiresAt', null);
      if (onTokenRefreshCallback) {
        onTokenRefreshCallback(null);
      }
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

// ── Dashboard ────────────────────────────────────────

export async function getDashboard(): Promise<DashboardResponse> {
  const { data } = await api.get<DashboardResponse>('/dashboard');
  return data;
}

// ── Notifications ────────────────────────────────────

export async function getNotifications(): Promise<NotificationItem[]> {
  const { data } = await api.get<NotificationItem[]>('/notifications');
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

// ── Groups ───────────────────────────────────────────

export async function getGroups(): Promise<GroupResponse[]> {
  const { data } = await api.get<GroupResponse[]>('/groups');
  return data;
}

// ── Properties (CRUD) ────────────────────────────────

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
  fileUri: string,
  fileName: string,
  fileType: string,
  category: string,
): Promise<DocumentResponse> {
  const formData = new FormData();
  // React Native FormData pattern: { uri, name, type } instead of new File()
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: fileType,
  } as unknown as Blob);
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
  fileName: string,
): Promise<void> {
  // Use expo-file-system (SDK 54 File API) + expo-sharing for RN-compatible download
  const token = await getStorageItem('accessToken');
  const baseUrl = getApiUrl();
  const downloadUrl = `${baseUrl}/properties/${propertyId}/documents/${documentId}/download`;

  const destination = new ExpoFile(Paths.cache, fileName);
  const downloadedFile = await ExpoFile.downloadFileAsync(downloadUrl, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    idempotent: true,
  });

  console.debug('[documents] downloaded to:', downloadedFile.uri);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(downloadedFile.uri);
  } else {
    console.warn('[documents] Sharing is not available on this device');
  }
}

export async function deleteDocument(
  propertyId: string,
  documentId: string,
): Promise<void> {
  await api.delete(`/properties/${propertyId}/documents/${documentId}`);
}

// ── Reports ──────────────────────────────────────────

export async function getProfitLossReport(
  year?: number,
): Promise<ProfitLossReport> {
  const params = year ? { year } : {};
  const { data } = await api.get<ProfitLossReport>('/reports/profit-loss', {
    params,
  });
  return data;
}

export async function exportReport(
  format: 'excel' | 'pdf',
): Promise<void> {
  // Use expo-file-system (SDK 54 File API) + expo-sharing for RN-compatible export download
  const token = await getStorageItem('accessToken');
  const baseUrl = getApiUrl();
  const ext = format === 'excel' ? 'xlsx' : 'pdf';
  const downloadUrl = `${baseUrl}/reports/export/${format}`;
  const fileName = `portfoy-raporu.${ext}`;

  const destination = new ExpoFile(Paths.cache, fileName);
  const downloadedFile = await ExpoFile.downloadFileAsync(downloadUrl, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    idempotent: true,
  });

  console.debug('[reports] exported to:', downloadedFile.uri);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(downloadedFile.uri);
  }
}

// ── Import ───────────────────────────────────────────

export async function importAirbnbCsv(
  propertyId: string,
  fileUri: string,
  fileName: string,
  fileType: string,
  dryRun: boolean = true,
): Promise<ImportPreviewResponse<AirbnbImportRow>> {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: fileType,
  } as unknown as Blob);
  const { data } = await api.post<ImportPreviewResponse<AirbnbImportRow>>(
    `/import/airbnb-csv?propertyId=${propertyId}&dryRun=${dryRun}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function importRentPayments(
  fileUri: string,
  fileName: string,
  fileType: string,
  dryRun: boolean = true,
): Promise<ImportPreviewResponse<RentPaymentImportRow>> {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: fileType,
  } as unknown as Blob);
  const { data } = await api.post<ImportPreviewResponse<RentPaymentImportRow>>(
    `/import/rent-payments?dryRun=${dryRun}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

// ── Device Tokens (Push Notifications) ───────────────

export async function registerDeviceToken(
  payload: DeviceTokenRequest,
): Promise<void> {
  await api.post('/device-tokens', payload);
}

export async function unregisterDeviceToken(
  expoPushToken: string,
): Promise<void> {
  await api.delete('/device-tokens', { data: { expoPushToken } });
}

// ── Telegram ─────────────────────────────────────────

export async function getTelegramStatus(): Promise<TelegramLinkResponse> {
  const res = await api.get('/telegram/status');
  return res.data;
}

export async function linkTelegram(linkCode: string): Promise<TelegramLinkResponse> {
  const res = await api.post('/telegram/link', { linkCode });
  return res.data;
}

export async function unlinkTelegram(): Promise<void> {
  await api.delete('/telegram/link');
}

// ── Push Trigger ─────────────────────────────────────

export async function triggerPush(): Promise<PushTriggerResponse> {
  const { data } = await api.post<PushTriggerResponse>('/push/trigger');
  return data;
}

export default api;
