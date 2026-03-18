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

import { getBills, deleteBill, markBillPaid } from '@/src/api/client';
import {
  BillType,
  BillTypeLabels,
  BillPaymentStatus,
  BillPaymentStatusLabels,
  type BillResponse,
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

const billTypeColors: Record<string, string> = {
  [BillType.Water]: '#1976d2',
  [BillType.Electric]: '#f9a825',
  [BillType.Gas]: '#e67e22',
  [BillType.Internet]: '#8e44ad',
  [BillType.Dues]: '#00897b',
};

const billStatusColors: Record<string, { bg: string; text: string }> = {
  [BillPaymentStatus.Paid]: { bg: colors.successLight, text: colors.success },
  [BillPaymentStatus.Pending]: { bg: colors.warningLight, text: colors.warning },
  [BillPaymentStatus.Overdue]: { bg: colors.criticalLight, text: colors.critical },
};

// ── Bill List Screen ─────────────────────────────────

export default function BillsScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const router = useRouter();
  const [bills, setBills] = useState<BillResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!propertyId) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.debug('[bills] fetching...');
      try {
        const data = await getBills(propertyId);
        setBills(data);
        console.debug('[bills] loaded', data.length, 'bills');
      } catch (err) {
        console.error('[bills] error', err);
        setError('Fatura listesi yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [propertyId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = useCallback(
    (billId: string) => {
      if (!propertyId) return;
      Alert.alert(
        'Silme Onayı',
        'Bu kaydı silmek istediğinize emin misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              console.debug('[bills] deleting:', billId);
              try {
                await deleteBill(propertyId, billId);
                console.debug('[bills] deleted');
                fetchData(true);
              } catch (err) {
                console.error('[bills] delete error', err);
                Alert.alert('Hata', 'Fatura silinirken bir hata oluştu.');
              }
            },
          },
        ],
      );
    },
    [propertyId, fetchData],
  );

  const handleMarkPaid = useCallback(
    async (billId: string) => {
      if (!propertyId) return;
      console.debug('[bills] marking paid:', billId);
      try {
        await markBillPaid(propertyId, billId);
        console.debug('[bills] marked paid');
        fetchData(true);
      } catch (err) {
        console.error('[bills] mark paid error', err);
        Alert.alert('Hata', 'Fatura ödenirken bir hata oluştu.');
      }
    },
    [propertyId, fetchData],
  );

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Faturalar' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Faturalar' }} />
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.critical} />
          <Text style={styles.errorText}>{error}</Text>
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

  // ── Empty state ──
  if (bills.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Faturalar' }} />
        <View style={styles.centered}>
          <MaterialIcons name="receipt" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Henüz fatura kaydı yok</Text>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/properties/bill-form',
                params: { propertyId },
              })
            }
          >
            <MaterialIcons name="add" size={20} color={colors.textInverse} />
            <Text style={styles.addButtonText}>Yeni Fatura</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Faturalar' }} />

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
        {/* ── Add Button ── */}
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/properties/bill-form',
              params: { propertyId },
            })
          }
        >
          <MaterialIcons name="add" size={20} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Yeni Fatura</Text>
        </Pressable>

        {/* ── Bill Cards ── */}
        {bills.map((bill) => (
          <BillCard
            key={bill.id}
            bill={bill}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/properties/bill-form',
                params: { propertyId, billId: bill.id },
              })
            }
            onDelete={() => handleDelete(bill.id)}
            onMarkPaid={() => handleMarkPaid(bill.id)}
          />
        ))}
      </ScrollView>
    </>
  );
}

// ── Bill Card Component ──────────────────────────────

function BillCard({
  bill,
  onPress,
  onDelete,
  onMarkPaid,
}: {
  bill: BillResponse;
  onPress: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
}) {
  const typeColor = billTypeColors[bill.type] ?? colors.textTertiary;
  const typeLabel =
    BillTypeLabels[bill.type as keyof typeof BillTypeLabels] ?? bill.type;

  const statusStyle =
    billStatusColors[bill.status] ?? billStatusColors[BillPaymentStatus.Pending];
  const statusLabel =
    BillPaymentStatusLabels[bill.status as keyof typeof BillPaymentStatusLabels] ??
    bill.status;

  const canMarkPaid =
    bill.status === BillPaymentStatus.Pending ||
    bill.status === BillPaymentStatus.Overdue;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: typeColor }]}>
            {typeLabel}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.cardAmount}>
        {formatAmount(bill.amount, bill.currency)}
      </Text>

      <View style={styles.cardDateRow}>
        <MaterialIcons name="event" size={14} color={colors.textTertiary} />
        <Text style={styles.cardDateText}>
          Son ödeme: {formatDate(bill.dueDate)}
        </Text>
      </View>

      <View style={styles.cardActions}>
        {canMarkPaid && (
          <Pressable
            style={({ pressed }) => [
              styles.markPaidButton,
              pressed && styles.markPaidButtonPressed,
            ]}
            onPress={(e) => {
              e.stopPropagation?.();
              onMarkPaid();
            }}
          >
            <MaterialIcons name="check-circle" size={16} color={colors.success} />
            <Text style={styles.markPaidText}>Ödendi</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
          onPress={(e) => {
            e.stopPropagation?.();
            onDelete();
          }}
          hitSlop={8}
        >
          <MaterialIcons name="delete-outline" size={20} color={colors.critical} />
        </Pressable>
      </View>
    </Pressable>
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
  emptyText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.body,
    color: colors.textTertiary,
    marginTop: spacing.sm,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addButtonPressed: {
    backgroundColor: colors.accentDark,
  },
  addButtonText: {
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

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
  },
  cardAmount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardDateText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textTertiary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.successLight,
  },
  markPaidButtonPressed: {
    opacity: 0.7,
  },
  markPaidText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    color: colors.success,
  },
  deleteButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  deleteButtonPressed: {
    backgroundColor: colors.criticalLight,
  },
});
