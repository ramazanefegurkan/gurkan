import axios from 'axios';
import type {
  TokenResponse,
  PropertyResponse,
  PropertyListResponse,
  PropertyNoteResponse,
  GroupResponse,
  CreatePropertyRequest,
  UpdatePropertyRequest,
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

export default api;
