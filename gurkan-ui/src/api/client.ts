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
} from '../types';

// ── Axios instance ───────────────────────────────────

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
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

// ── Response interceptor: handle 401 ─────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on the login page or this is a login request
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('expiresAt');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
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

export default api;
