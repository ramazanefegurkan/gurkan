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
  titleDeedOwner: string | null;
  subscriptions: SubscriptionResponse[];
  defaultBankAccountId: string | null;
  defaultBankAccountName: string | null;
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
  titleDeedOwner?: string | null;
  defaultBankAccountId?: string | null;
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
  titleDeedOwner?: string | null;
  defaultBankAccountId?: string | null;
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
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Nakit',
  [PaymentMethod.BankTransfer]: 'Banka Transferi',
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

export interface GlobalTenantListItem extends TenantListItem {
  propertyId: string;
  propertyName: string;
}

export interface GlobalSubscriptionListItem {
  id: string;
  propertyId: string;
  propertyName: string;
  type: SubscriptionType;
  subscriptionNo: string | null;
  holderType: SubscriptionHolderType;
  holderUserId: string | null;
  holderUserName: string | null;
  hasAutoPayment: boolean;
  autoPaymentBankId: string | null;
  autoPaymentBankName: string | null;
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

export interface RenewLeaseRequest {
  newLeaseEnd: string;
  newMonthlyRent: number;
  notes?: string | null;
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
  bankAccountId: string | null;
  bankAccountName: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MarkPaymentPaidRequest {
  paidDate?: string | null;
  paymentMethod?: PaymentMethod | null;
  bankAccountId?: string | null;
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

// ── Expense / Bill Enums ─────────────────────────────

export const ExpenseCategory = {
  Maintenance: 'Maintenance',
  Repair: 'Repair',
  Tax: 'Tax',
  Insurance: 'Insurance',
  Management: 'Management',
  Other: 'Other',
} as const;

export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Maintenance]: 'Bakım',
  [ExpenseCategory.Repair]: 'Tamir',
  [ExpenseCategory.Tax]: 'Vergi',
  [ExpenseCategory.Insurance]: 'Sigorta',
  [ExpenseCategory.Management]: 'Yönetim',
  [ExpenseCategory.Other]: 'Diğer',
};

export const BillType = {
  Water: 'Water',
  Electric: 'Electric',
  Gas: 'Gas',
  Internet: 'Internet',
  Dues: 'Dues',
} as const;

export type BillType = (typeof BillType)[keyof typeof BillType];

export const BillTypeLabels: Record<BillType, string> = {
  [BillType.Water]: 'Su',
  [BillType.Electric]: 'Elektrik',
  [BillType.Gas]: 'Doğalgaz',
  [BillType.Internet]: 'İnternet',
  [BillType.Dues]: 'Aidat',
};

export const BillPaymentStatus = {
  Pending: 'Pending',
  Paid: 'Paid',
  Overdue: 'Overdue',
} as const;

export type BillPaymentStatus = (typeof BillPaymentStatus)[keyof typeof BillPaymentStatus];

export const BillPaymentStatusLabels: Record<BillPaymentStatus, string> = {
  [BillPaymentStatus.Pending]: 'Bekliyor',
  [BillPaymentStatus.Paid]: 'Ödendi',
  [BillPaymentStatus.Overdue]: 'Gecikmiş',
};

// ── Subscriptions ────────────────────────────────────

export const SubscriptionType = {
  Electric: 'Electric',
  Gas: 'Gas',
  Water: 'Water',
  Internet: 'Internet',
  Dues: 'Dues',
} as const;

export type SubscriptionType = (typeof SubscriptionType)[keyof typeof SubscriptionType];

export const SubscriptionTypeLabels: Record<SubscriptionType, string> = {
  [SubscriptionType.Electric]: 'Elektrik',
  [SubscriptionType.Gas]: 'Doğalgaz',
  [SubscriptionType.Water]: 'Su',
  [SubscriptionType.Internet]: 'İnternet',
  [SubscriptionType.Dues]: 'Aidat',
};

export const SubscriptionHolderType = {
  User: 'User',
  Tenant: 'Tenant',
} as const;

export type SubscriptionHolderType = (typeof SubscriptionHolderType)[keyof typeof SubscriptionHolderType];

export const SubscriptionHolderTypeLabels: Record<SubscriptionHolderType, string> = {
  [SubscriptionHolderType.User]: 'Kullanıcı',
  [SubscriptionHolderType.Tenant]: 'Kiracı',
};

export interface SubscriptionResponse {
  id: string;
  type: SubscriptionType;
  subscriptionNo: string | null;
  holderType: SubscriptionHolderType;
  holderUserId: string | null;
  holderUserName: string | null;
  hasAutoPayment: boolean;
  autoPaymentBankId: string | null;
  autoPaymentBankName: string | null;
}

export interface UpsertSubscriptionRequest {
  type: SubscriptionType;
  subscriptionNo?: string | null;
  holderType: SubscriptionHolderType;
  holderUserId?: string | null;
  hasAutoPayment: boolean;
  autoPaymentBankId?: string | null;
}

// ── Expenses ─────────────────────────────────────────

export interface ExpenseResponse {
  id: string;
  propertyId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: Currency;
  date: string;
  isRecurring: boolean;
  recurrenceInterval: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateExpenseRequest {
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: Currency;
  date: string;
  isRecurring: boolean;
  recurrenceInterval?: string | null;
  notes?: string | null;
}

export interface UpdateExpenseRequest extends CreateExpenseRequest {}

// ── Bills ────────────────────────────────────────────

export interface BillResponse {
  id: string;
  propertyId: string;
  type: BillType;
  amount: number;
  currency: Currency;
  dueDate: string;
  paidDate: string | null;
  status: BillPaymentStatus;
  notes: string | null;
  createdAt: string;
}

export interface CreateBillRequest {
  type: BillType;
  amount: number;
  currency: Currency;
  dueDate: string;
  notes?: string | null;
}

export interface UpdateBillRequest extends CreateBillRequest {}

// ── Document Categories ──────────────────────────────

export const DocumentCategory = {
  TitleDeed: 'TitleDeed',
  Contract: 'Contract',
  Insurance: 'Insurance',
  Invoice: 'Invoice',
  Photo: 'Photo',
  Other: 'Other',
} as const;

export type DocumentCategoryType = (typeof DocumentCategory)[keyof typeof DocumentCategory];

export const DocumentCategoryLabels: Record<DocumentCategoryType, string> = {
  [DocumentCategory.TitleDeed]: 'Tapu',
  [DocumentCategory.Contract]: 'Sözleşme',
  [DocumentCategory.Insurance]: 'Sigorta',
  [DocumentCategory.Invoice]: 'Fatura',
  [DocumentCategory.Photo]: 'Fotoğraf',
  [DocumentCategory.Other]: 'Diğer',
};

// ── Documents ────────────────────────────────────────

export interface DocumentResponse {
  id: string;
  propertyId: string;
  originalFileName: string;
  category: DocumentCategoryType;
  contentType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}

// ── Dashboard ──────────────────────────────────────

export interface CurrencyAmount {
  currency: Currency;
  amount: number;
}

export interface CurrencySummary {
  currency: Currency;
  totalIncome: number;
  totalExpenses: number;
  totalProfit: number;
  unpaidRentCount: number;
  upcomingBillCount: number;
}

export interface PropertyFinancials {
  propertyId: string;
  propertyName: string;
  propertyType: PropertyType;
  currency: Currency;
  income: CurrencyAmount[];
  expenses: CurrencyAmount[];
  profit: CurrencyAmount[];
  unpaidRentCount: number;
  upcomingBillCount: number;
}

export interface DashboardResponse {
  totalPropertyCount: number;
  activeTenantCount: number;
  occupancyRate: number;
  year: number;
  summary: CurrencySummary[];
  properties: PropertyFinancials[];
}

// ── Notifications ─────────────────────────────────

export const NotificationType = {
  LateRent: 'LateRent',
  UpcomingBill: 'UpcomingBill',
  LeaseExpiry: 'LeaseExpiry',
  RentIncrease: 'RentIncrease',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.LateRent]: 'Kira Gecikmesi',
  [NotificationType.UpcomingBill]: 'Fatura Hatırlatması',
  [NotificationType.LeaseExpiry]: 'Sözleşme Bitişi',
  [NotificationType.RentIncrease]: 'Kira Artışı',
};

export const NotificationSeverity = {
  Critical: 'Critical',
  Warning: 'Warning',
  Info: 'Info',
} as const;

export type NotificationSeverity = (typeof NotificationSeverity)[keyof typeof NotificationSeverity];

export interface NotificationItem {
  key: string;
  type: NotificationType;
  severity: NotificationSeverity;
  message: string;
  propertyId: string;
  propertyName: string;
  relatedEntityId: string | null;
  date: string;
}

// ── Reports ───────────────────────────────────────

export interface PropertyReport {
  propertyId: string;
  propertyName: string;
  propertyType: PropertyType;
  city: string;
  currency: Currency;
  rentIncome: number;
  shortTermIncome: number;
  totalIncome: number;
  expenseTotal: number;
  billTotal: number;
  totalExpenses: number;
  profit: number;
  roi: number | null;
}

export interface ProfitLossReport {
  generatedAt: string;
  period: string;
  summary: { currency: Currency; totalIncome: number; totalExpenses: number; totalProfit: number }[];
  properties: PropertyReport[];
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
  joinedAt: string;
}

// ── Import ────────────────────────────────────────────

export interface ImportSummary {
  totalRows: number;
  importedCount: number;
  errorCount: number;
  warningCount: number;
  duplicateCount: number;
}

export interface AirbnbImportRow {
  rowNumber: number;
  status: string; // "Success" | "Error" | "Warning"
  errorMessage?: string;
  warningMessage?: string;
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
  nightCount?: number;
  nightlyRate?: number;
  totalAmount?: number;
  platformFee?: number;
  netAmount?: number;
}

export interface RentPaymentImportRow {
  rowNumber: number;
  status: string; // "Success" | "Error" | "Warning"
  errorMessage?: string;
  warningMessage?: string;
  propertyName?: string;
  propertyId?: string;
  tenantName?: string;
  tenantId?: string;
  amount?: number;
  currency?: string;
  dueDate?: string;
  paidDate?: string;
  paymentStatus?: string;
  paymentMethod?: string;
}

export interface ImportPreviewResponse<TRow> {
  summary: ImportSummary;
  rows: TRow[];
}

// ── Bank Accounts ────────────────────────────────────

export interface BankAccountResponse {
  id: string;
  groupId: string;
  holderName: string;
  bankName: string;
  iban: string | null;
  description: string | null;
  createdAt: string;
}

export interface CreateBankAccountRequest {
  groupId: string;
  holderName: string;
  bankName: string;
  iban?: string | null;
  description?: string | null;
}

export interface UpdateBankAccountRequest {
  holderName?: string;
  bankName?: string;
  iban?: string | null;
  description?: string | null;
}

// ── Banks ────────────────────────────────────────────

export interface BankResponse {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateBankRequest {
  name: string;
}

// ── Telegram ──────────────────────────────────────────

export interface TelegramLinkResponse {
  isLinked: boolean;
  telegramUserId: number | null;
  telegramUsername: string | null;
  linkedAt: string | null;
}
