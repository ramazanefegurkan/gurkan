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

// ── Rental / Tenant Enums ────────────────────────────

export const RentPaymentStatus = {
  Pending: 'Pending',
  Paid: 'Paid',
  Late: 'Late',
  Cancelled: 'Cancelled',
} as const;

export type RentPaymentStatus = (typeof RentPaymentStatus)[keyof typeof RentPaymentStatus];

export const RentPaymentStatusLabels: Record<RentPaymentStatus, string> = {
  [RentPaymentStatus.Pending]: 'Bekliyor',
  [RentPaymentStatus.Paid]: 'Ödendi',
  [RentPaymentStatus.Late]: 'Gecikmiş',
  [RentPaymentStatus.Cancelled]: 'İptal',
};

export const PaymentMethod = {
  Cash: 'Cash',
  BankTransfer: 'BankTransfer',
  Check: 'Check',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Nakit',
  [PaymentMethod.BankTransfer]: 'Banka Transferi',
  [PaymentMethod.Check]: 'Çek',
};

export const RentalPlatform = {
  Airbnb: 'Airbnb',
  Booking: 'Booking',
  Direct: 'Direct',
} as const;

export type RentalPlatform = (typeof RentalPlatform)[keyof typeof RentalPlatform];

export const RentalPlatformLabels: Record<RentalPlatform, string> = {
  [RentalPlatform.Airbnb]: 'Airbnb',
  [RentalPlatform.Booking]: 'Booking.com',
  [RentalPlatform.Direct]: 'Direkt',
};

// ── Tenants ──────────────────────────────────────────

export interface TenantListItem {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  currency: Currency;
  isActive: boolean;
}

export interface TenantResponse {
  id: string;
  propertyId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  identityNumber: string | null;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  deposit: number;
  currency: Currency;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateTenantRequest {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  identityNumber?: string | null;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  deposit: number;
  currency: Currency;
}

export interface UpdateTenantRequest {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  identityNumber?: string | null;
  leaseStart?: string;
  leaseEnd?: string;
  monthlyRent?: number;
  deposit?: number;
  currency?: Currency;
}

// ── Rent Payments ────────────────────────────────────

export interface RentPaymentResponse {
  id: string;
  tenantId: string;
  amount: number;
  currency: Currency;
  dueDate: string;
  paidDate: string | null;
  status: string; // "Pending" | "Paid" | "Late" | "Cancelled" — string because backend computes Late at query time
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MarkPaymentPaidRequest {
  paidDate?: string | null;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
}

// ── Short-Term Rentals ───────────────────────────────

export interface ShortTermRentalResponse {
  id: string;
  propertyId: string;
  guestName: string | null;
  checkIn: string;
  checkOut: string;
  nightCount: number;
  nightlyRate: number;
  totalAmount: number;
  platformFee: number;
  netAmount: number;
  platform: RentalPlatform;
  currency: Currency;
  notes: string | null;
  createdAt: string;
}

export interface CreateShortTermRentalRequest {
  guestName?: string | null;
  checkIn: string;
  checkOut: string;
  nightlyRate: number;
  totalAmount: number;
  platformFee: number;
  netAmount: number;
  platform: RentalPlatform;
  currency: Currency;
  notes?: string | null;
}

export interface UpdateShortTermRentalRequest {
  guestName?: string | null;
  checkIn?: string;
  checkOut?: string;
  nightlyRate?: number;
  totalAmount?: number;
  platformFee?: number;
  netAmount?: number;
  platform?: RentalPlatform;
  currency?: Currency;
  notes?: string | null;
}

// ── Rent Increases ───────────────────────────────────

export interface RentIncreaseResponse {
  id: string;
  tenantId: string;
  previousAmount: number;
  newAmount: number;
  increaseRate: number;
  effectiveDate: string;
  notes: string | null;
  createdAt: string;
}

export interface CreateRentIncreaseRequest {
  newAmount: number;
  effectiveDate: string;
  notes?: string | null;
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
