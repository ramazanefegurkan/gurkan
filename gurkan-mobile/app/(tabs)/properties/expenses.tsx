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

import { getExpenses, deleteExpense } from '@/src/api/client';
import {
  ExpenseCategory,
  ExpenseCategoryLabels,
  type ExpenseResponse,
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

const categoryColors: Record<string, string> = {
  [ExpenseCategory.Maintenance]: colors.info,
  [ExpenseCategory.Repair]: '#e67e22',
  [ExpenseCategory.Tax]: colors.critical,
  [ExpenseCategory.Insurance]: '#8e44ad',
  [ExpenseCategory.Management]: '#00897b',
  [ExpenseCategory.Other]: colors.textTertiary,
};

// ── Expense List Screen ──────────────────────────────

export default function ExpensesScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
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

      console.debug('[expenses] fetching...');
      try {
        const data = await getExpenses(propertyId);
        setExpenses(data);
        console.debug('[expenses] loaded', data.length, 'expenses');
      } catch (err) {
        console.error('[expenses] error', err);
        setError('Gider listesi yüklenirken bir hata oluştu.');
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
    (expenseId: string) => {
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
              console.debug('[expenses] deleting:', expenseId);
              try {
                await deleteExpense(propertyId, expenseId);
                console.debug('[expenses] deleted');
                fetchData(true);
              } catch (err) {
                console.error('[expenses] delete error', err);
                Alert.alert('Hata', 'Gider silinirken bir hata oluştu.');
              }
            },
          },
        ],
      );
    },
    [propertyId, fetchData],
  );

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Giderler' }} />
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
        <Stack.Screen options={{ title: 'Giderler' }} />
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
  if (expenses.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Giderler' }} />
        <View style={styles.centered}>
          <MaterialIcons name="receipt-long" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Henüz gider kaydı yok</Text>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/properties/expense-form',
                params: { propertyId },
              })
            }
          >
            <MaterialIcons name="add" size={20} color={colors.textInverse} />
            <Text style={styles.addButtonText}>Yeni Gider</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Giderler' }} />

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
              pathname: '/(tabs)/properties/expense-form',
              params: { propertyId },
            })
          }
        >
          <MaterialIcons name="add" size={20} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Yeni Gider</Text>
        </Pressable>

        {/* ── Expense Cards ── */}
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/properties/expense-form',
                params: { propertyId, expenseId: expense.id },
              })
            }
            onDelete={() => handleDelete(expense.id)}
          />
        ))}
      </ScrollView>
    </>
  );
}

// ── Expense Card Component ───────────────────────────

function ExpenseCard({
  expense,
  onPress,
  onDelete,
}: {
  expense: ExpenseResponse;
  onPress: () => void;
  onDelete: () => void;
}) {
  const catColor =
    categoryColors[expense.category] ?? colors.textTertiary;
  const catLabel =
    ExpenseCategoryLabels[expense.category as keyof typeof ExpenseCategoryLabels] ??
    expense.category;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
          <Text style={[styles.categoryBadgeText, { color: catColor }]}>
            {catLabel}
          </Text>
        </View>
        {expense.isRecurring && (
          <View style={styles.recurringBadge}>
            <MaterialIcons name="repeat" size={12} color={colors.info} />
            <Text style={styles.recurringText}>Tekrarlayan</Text>
          </View>
        )}
      </View>

      <Text style={styles.cardDescription} numberOfLines={2}>
        {expense.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.cardFooterLeft}>
          <Text style={styles.cardAmount}>
            {formatAmount(expense.amount, expense.currency)}
          </Text>
          <View style={styles.cardDateRow}>
            <MaterialIcons name="event" size={14} color={colors.textTertiary} />
            <Text style={styles.cardDateText}>{formatDate(expense.date)}</Text>
          </View>
        </View>
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
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.infoLight,
  },
  recurringText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.label,
    color: colors.info,
  },
  cardDescription: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  cardFooterLeft: {
    flex: 1,
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
  },
  cardDateText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textTertiary,
  },
  deleteButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  deleteButtonPressed: {
    backgroundColor: colors.criticalLight,
  },
});
