// ── Auth ──────────────────────────────────────────────

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface UserInfo {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
}

// ── Enums (match backend GurkanApi.Entities.Enums) ───
// Using const objects instead of enums to comply with erasableSyntaxOnly.
// Values are strings matching ASP.NET Core JsonStringEnumConverter output.

export const PropertyType = {
  Apartment: 'Apartment',
  House: 'House',
  Shop: 'Shop',
  Land: 'Land',
  Office: 'Office',
  Other: 'Other',
} as const;

export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const PropertyTypeLabels: Record<PropertyType, string> = {
  [PropertyType.Apartment]: 'Daire',
  [PropertyType.House]: 'Ev',
  [PropertyType.Shop]: 'Dükkan',
  [PropertyType.Land]: 'Arsa',
  [PropertyType.Office]: 'Ofis',
  [PropertyType.Other]: 'Diğer',
};

export const Currency = {
  TRY: 'TRY',
  USD: 'USD',
  EUR: 'EUR',
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

export const CurrencyLabels: Record<Currency, string> = {
  [Currency.TRY]: '₺ TRY',
  [Currency.USD]: '$ USD',
  [Currency.EUR]: '€ EUR',
};

// ── Properties ───────────────────────────────────────

export interface PropertyResponse {
  id: string;
  name: string;
  type: PropertyType;
  address: string;
  city: string;
  district: string;
  area: number | null;
  roomCount: number | null;
  floor: number | null;
  totalFloors: number | null;
  buildYear: number | null;
  currency: Currency;
  description: string | null;
  groupId: string | null;
  groupName: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface PropertyListResponse {
  id: string;
  name: string;
  type: PropertyType;
  city: string;
  currency: Currency;
  groupId: string | null;
  groupName: string | null;
}

export interface CreatePropertyRequest {
  name: string;
  type: PropertyType;
  address: string;
  city: string;
  district: string;
  area?: number | null;
  roomCount?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  buildYear?: number | null;
  currency: Currency;
  description?: string | null;
  groupId: string;
}

export interface UpdatePropertyRequest {
  name?: string;
  type?: PropertyType;
  address?: string;
  city?: string;
  district?: string;
  area?: number | null;
  roomCount?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  buildYear?: number | null;
  currency?: Currency;
  description?: string | null;
}

// ── Property Notes ───────────────────────────────────

export interface PropertyNoteResponse {
  id: string;
  content: string;
  createdByName: string;
  createdAt: string;
}

// ── Groups ───────────────────────────────────────────

export interface GroupResponse {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  members: GroupMemberResponse[];
  propertyCount: number;
}

export interface GroupMemberResponse {
  userId: string;
  fullName: string;
  email: string;
  role: string;
}
