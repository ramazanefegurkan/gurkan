import { type APIRequestContext } from '@playwright/test';
import { API_URL, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from './constants';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function createGroup(
  request: APIRequestContext,
  name?: string
): Promise<{ id: string; name: string }> {
  const groupName = name || `E2E Group ${uid()}`;
  const res = await request.post(`${API_URL}/groups`, {
    data: { name: groupName, description: 'E2E test group' },
  });
  const body = await res.json();
  return { id: body.id, name: groupName };
}

export async function deleteGroup(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`${API_URL}/groups/${id}`);
}

export async function addGroupMember(
  request: APIRequestContext,
  groupId: string,
  userId: string,
  role: string = 'Admin'
): Promise<void> {
  await request.post(`${API_URL}/groups/${groupId}/members`, {
    data: { userId, role },
  });
}

export async function createProperty(
  request: APIRequestContext,
  groupId: string,
  overrides?: Record<string, unknown>
): Promise<{ id: string; name: string }> {
  const name = `E2E Property ${uid()}`;
  const res = await request.post(`${API_URL}/properties`, {
    data: {
      name,
      type: 'Apartment',
      currency: 'TRY',
      address: 'Test Sokak 1',
      city: 'İstanbul',
      district: 'Kadıköy',
      groupId,
      ...overrides,
    },
  });
  const body = await res.json();
  return { id: body.id, name };
}

export async function deleteProperty(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`${API_URL}/properties/${id}`);
}

export async function createTenant(
  request: APIRequestContext,
  propertyId: string,
  overrides?: Record<string, unknown>
): Promise<{ id: string; fullName: string }> {
  const fullName = `E2E Tenant ${uid()}`;
  const today = new Date();
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  const toUtcIso = (d: Date) => `${d.toISOString().split('T')[0]}T00:00:00Z`;
  const res = await request.post(`${API_URL}/properties/${propertyId}/tenants`, {
    data: {
      fullName,
      leaseStart: toUtcIso(today),
      leaseEnd: toUtcIso(threeMonthsLater),
      monthlyRent: 5000,
      currency: 'TRY',
      ...overrides,
    },
  });
  const body = await res.json();
  return { id: body.id, fullName };
}

export async function createExpense(
  request: APIRequestContext,
  propertyId: string,
  overrides?: Record<string, unknown>
): Promise<{ id: string }> {
  const toUtcIso = (d: Date) => `${d.toISOString().split('T')[0]}T00:00:00Z`;
  const res = await request.post(`${API_URL}/properties/${propertyId}/expenses`, {
    data: {
      category: 'Maintenance',
      date: toUtcIso(new Date()),
      description: `E2E Expense ${uid()}`,
      amount: 1000,
      currency: 'TRY',
      ...overrides,
    },
  });
  const body = await res.json();
  return { id: body.id };
}

export async function createBill(
  request: APIRequestContext,
  propertyId: string,
  overrides?: Record<string, unknown>
): Promise<{ id: string }> {
  const toUtcIso = (d: Date) => `${d.toISOString().split('T')[0]}T00:00:00Z`;
  const res = await request.post(`${API_URL}/properties/${propertyId}/bills`, {
    data: {
      type: 'Water',
      dueDate: toUtcIso(new Date()),
      amount: 250,
      currency: 'TRY',
      ...overrides,
    },
  });
  const body = await res.json();
  return { id: body.id };
}

export async function createShortTermRental(
  request: APIRequestContext,
  propertyId: string,
  overrides?: Record<string, unknown>
): Promise<{ id: string }> {
  const toUtcIso = (d: Date) => `${d.toISOString().split('T')[0]}T00:00:00Z`;
  const checkIn = new Date();
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);
  const res = await request.post(`${API_URL}/properties/${propertyId}/short-term-rentals`, {
    data: {
      guestName: `E2E Guest ${uid()}`,
      checkIn: toUtcIso(checkIn),
      checkOut: toUtcIso(checkOut),
      nightCount: 3,
      platform: 'Airbnb',
      currency: 'TRY',
      nightlyRate: 500,
      totalAmount: 1500,
      platformFee: 150,
      netAmount: 1350,
      ...overrides,
    },
  });
  const body = await res.json();
  return { id: body.id };
}

export async function registerUser(
  request: APIRequestContext,
  email: string,
  password: string,
  fullName: string
): Promise<{ userId: string }> {
  const res = await request.post(`${API_URL}/auth/register`, {
    data: { email, password, fullName },
  });
  const body = await res.json();
  const token = body.accessToken;
  const payload = JSON.parse(atob(token.split('.')[1]));
  const userId =
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
  return { userId };
}

export async function createAdminApiContext(): Promise<APIRequestContext> {
  const { request } = await import('@playwright/test');
  const tmpCtx = await request.newContext();
  const tokens = await (await import('./auth')).loginViaApi(tmpCtx, ADMIN_EMAIL, ADMIN_PASSWORD);
  await tmpCtx.dispose();
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
  });
}

export async function createUserApiContext(): Promise<APIRequestContext> {
  const { request } = await import('@playwright/test');
  const tmpCtx = await request.newContext();
  const tokens = await (await import('./auth')).loginViaApi(tmpCtx, USER_EMAIL, USER_PASSWORD);
  await tmpCtx.dispose();
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
  });
}
