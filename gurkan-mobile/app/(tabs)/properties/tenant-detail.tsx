import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import {
  getTenant,
  getRentPayments,
  getRentIncreases,
  markPaymentPaid,
  terminateTenant,
} from '@/src/api/client';
import {
  CurrencyLabels,
  RentPaymentStatus,
  RentPaymentStatusLabels,
  type TenantResponse,
  type RentPaymentResponse,
  type RentIncreaseResponse,
} from '@/src/api/types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@/src/theme';

// ── Helpers ──────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
  const sym = symbols[currency] ?? currency;
  return `${sym}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Payment status badge colors ─────────────────────

const paymentStatusColors: Record<string, { bg: string; text: string }> = {
  [RentPaymentStatus.Paid]: { bg: colors.successLight, text: colors.success },
  [RentPaymentStatus.Pending]: { bg: colors.warningLight, text: colors.warning },
  [RentPaymentStatus.Late]: { bg: colors.criticalLight, text: colors.critical },
  [RentPaymentStatus.Cancelled]: { bg: colors.surfaceElevated, text: colors.textTertiary },
};

// ── Tenant Detail Screen ─────────────────────────────

export default function TenantDetailScreen() {
  const { propertyId, tenantId } = useLocalSearchParams<{
    propertyId: string;
    tenantId: string;
  }>();
  const router = useRouter();

  const [tenant, setTenant] = useState<TenantResponse | null>(null);
  const [payments, setPayments] = useState<RentPaymentResponse[]>([]);
  const [increases, setIncreases] = useState<RentIncreaseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingPayment, setMarkingPayment] = useState<string | null>(null);
  const [terminating, setTerminating] = useState(false);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!propertyId || !tenantId) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.debug('[tenant-detail] fetching...');
      try {
        const [tenantData, paymentData, increaseData] = await Promise.all([
          getTenant(propertyId, tenantId),
          getRentPayments(propertyId, tenantId),
          getRentIncreases(propertyId, tenantId),
        ]);
        setTenant(tenantData);
        setPayments(paymentData);
        setIncreases(increaseData);
        console.debug('[tenant-detail] loaded', tenantData.fullName);
      } catch (err) {
        console.error('[tenant-detail] error', err);
        setError('Kiracı bilgileri yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [propertyId, tenantId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkPaid = useCallback(
    async (paymentId: string) => {
      if (!propertyId || !tenantId) return;
      setMarkingPayment(paymentId);
      console.debug('[tenant-detail] marking payment paid:', paymentId);
      try {
        await markPaymentPaid(propertyId, tenantId, paymentId, {});
        console.debug('[tenant-detail] payment marked paid');
        await fetchData(true);
      } catch (err) {
        console.error('[tenant-detail] mark-paid error', err);
        Alert.alert('Hata', 'Ödeme durumu güncellenirken bir hata oluştu.');
      } finally {
        setMarkingPayment(null);
      }
    },
    [propertyId, tenantId, fetchData],
  );

  const handleTerminate = useCallback(() => {
    if (!propertyId || !tenantId) return;
    Alert.alert(
      'Kiracı Sonlandır',
      'Bu kiracıyı sonlandırmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sonlandır',
          style: 'destructive',
          onPress: async () => {
            setTerminating(true);
            console.debug('[tenant-detail] terminating tenant:', tenantId);
            try {
              await terminateTenant(propertyId, tenantId);
              console.debug('[tenant-detail] tenant terminated');
              router.back();
            } catch (err) {
              console.error('[tenant-detail] terminate error', err);
              Alert.alert('Hata', 'Kiracı sonlandırılırken bir hata oluştu.');
              setTerminating(false);
            }
          },
        },
      ],
    );
  }, [propertyId, tenantId, router]);

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Yükleniyor...' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </>
    );
  }

  // ── Error state ──
  if (error || !tenant) {
    return (
      <>
        <Stack.Screen options={{ title: 'Hata' }} />
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.critical} />
          <Text style={styles.errorText}>{error ?? 'Kiracı bulunamadı.'}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
            onPress={() => fetchData()}
          >
            <MaterialIcons name="refresh" size={20} color={colors.textInverse} />
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const statusBadge = tenant.isActive
    ? { bg: colors.successLight, text: colors.success, label: 'Aktif' }
    : { bg: colors.criticalLight, text: colors.critical, label: 'Sonlanmış' };

  return (
    <>
      <Stack.Screen options={{ title: tenant.fullName }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        {/* ── Header / Actions ── */}
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <Text style={styles.tenantName}>{tenant.fullName}</Text>
            <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.badgeText, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.editButtonPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/properties/tenant-form',
                  params: { propertyId, tenantId },
                })
              }
            >
              <MaterialIcons name="edit" size={18} color={colors.accent} />
              <Text style={styles.editButtonText}>Düzenle</Text>
            </Pressable>
            {tenant.isActive && (
              <Pressable
                style={({ pressed }) => [
                  styles.terminateButton,
                  pressed && styles.terminateButtonPressed,
                ]}
                onPress={handleTerminate}
                disabled={terminating}
              >
                {terminating ? (
                  <ActivityIndicator size="small" color={colors.critical} />
                ) : (
                  <>
                    <MaterialIcons name="block" size={18} color={colors.critical} />
                    <Text style={styles.terminateButtonText}>Sonlandır</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Tenant Info Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person" size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Kiracı Bilgileri</Text>
          </View>
          <View style={styles.sectionBody}>
            <DetailRow label="Ad Soyad" value={tenant.fullName} />
            <DetailRow label="Telefon" value={tenant.phone} />
            <DetailRow label="E-posta" value={tenant.email} />
            <DetailRow label="TC Kimlik No" value={tenant.identityNumber} />
            <DetailRow label="Kira Başlangıcı" value={formatDate(tenant.leaseStart)} />
            <DetailRow label="Kira Bitişi" value={formatDate(tenant.leaseEnd)} />
            <DetailRow
              label="Aylık Kira"
              value={formatAmount(tenant.monthlyRent, tenant.currency)}
            />
            <DetailRow
              label="Depozito"
              value={formatAmount(tenant.deposit, tenant.currency)}
            />
            <DetailRow
              label="Para Birimi"
              value={CurrencyLabels[tenant.currency] ?? tenant.currency}
            />
          </View>
        </View>

        {/* ── Rent Payments Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="payments" size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Kira Ödemeleri</Text>
          </View>
          {payments.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Henüz ödeme kaydı bulunmuyor</Text>
            </View>
          ) : (
            <View style={styles.sectionBody}>
              {payments.map((payment) => {
                const pColors =
                  paymentStatusColors[payment.status] ?? paymentStatusColors[RentPaymentStatus.Pending];
                const statusLabel =
                  RentPaymentStatusLabels[payment.status as keyof typeof RentPaymentStatusLabels] ??
                  payment.status;
                const canMarkPaid =
                  payment.status === RentPaymentStatus.Pending ||
                  payment.status === RentPaymentStatus.Late;
                const isMarking = markingPayment === payment.id;

                return (
                  <View key={payment.id} style={styles.paymentItem}>
                    <View style={styles.paymentRow}>
                      <View style={styles.paymentInfo}>
                        <Text style={styles.paymentDate}>
                          {formatDate(payment.dueDate)}
                        </Text>
                        <Text style={styles.paymentAmount}>
                          {formatAmount(payment.amount, payment.currency)}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: pColors.bg }]}>
                        <Text style={[styles.badgeText, { color: pColors.text }]}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>
                    {payment.paidDate && (
                      <Text style={styles.paidDateText}>
                        Ödeme: {formatDate(payment.paidDate)}
                      </Text>
                    )}
                    {canMarkPaid && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.markPaidButton,
                          pressed && styles.markPaidButtonPressed,
                        ]}
                        onPress={() => handleMarkPaid(payment.id)}
                        disabled={isMarking}
                      >
                        {isMarking ? (
                          <ActivityIndicator size="small" color={colors.success} />
                        ) : (
                          <>
                            <MaterialIcons
                              name="check-circle"
                              size={16}
                              color={colors.success}
                            />
                            <Text style={styles.markPaidButtonText}>
                              Ödendi İşaretle
                            </Text>
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Rent Increases Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="trending-up" size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Kira Artışları</Text>
          </View>
          {increases.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Henüz kira artışı bulunmuyor</Text>
            </View>
          ) : (
            <View style={styles.sectionBody}>
              {increases.map((inc) => (
                <View key={inc.id} style={styles.increaseItem}>
                  <View style={styles.increaseHeader}>
                    <Text style={styles.increaseDate}>
                      {formatDate(inc.effectiveDate)}
                    </Text>
                    <Text style={styles.increaseRate}>
                      %{inc.increaseRate.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}
                    </Text>
                  </View>
                  <Text style={styles.increaseAmounts}>
                    {formatAmount(inc.previousAmount, tenant.currency)} →{' '}
                    {formatAmount(inc.newAmount, tenant.currency)}
                  </Text>
                  {inc.notes ? (
                    <Text style={styles.increaseNotes}>{inc.notes}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

// ── Detail Row Component ─────────────────────────────

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  retryButtonPressed: {
    backgroundColor: colors.accentDark,
  },
  retryButtonText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.body,
    color: colors.textInverse,
  },

  // Scroll
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Header
  headerSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tenantName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subtitle,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: spacing.xs,
  },
  editButtonPressed: {
    backgroundColor: colors.accentLight + '15',
  },
  editButtonText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.accent,
  },
  terminateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.critical,
    gap: spacing.xs,
  },
  terminateButtonPressed: {
    backgroundColor: colors.criticalLight,
  },
  terminateButtonText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.critical,
  },

  // Badge
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
  },

  // Section
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm + 4,
    overflow: 'hidden',
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
  },
  sectionBody: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  emptySection: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptySectionText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.bodySmall,
    color: colors.textTertiary,
  },

  // Detail row
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.bodySmall,
    color: colors.textTertiary,
    flex: 1,
  },
  detailValue: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
    flex: 1.5,
    textAlign: 'right',
  },

  // Payment items
  paymentItem: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDate: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
  },
  paymentAmount: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paidDateText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.success,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  markPaidButtonPressed: {
    backgroundColor: colors.successLight,
  },
  markPaidButtonText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    color: colors.success,
  },

  // Increase items
  increaseItem: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  increaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  increaseDate: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
  },
  increaseRate: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.accent,
  },
  increaseAmounts: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  increaseNotes: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
