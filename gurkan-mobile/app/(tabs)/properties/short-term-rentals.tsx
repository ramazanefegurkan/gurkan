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

import { getShortTermRentals, deleteShortTermRental } from '@/src/api/client';
import {
  RentalPlatform,
  RentalPlatformLabels,
  type ShortTermRentalResponse,
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

const platformColors: Record<string, string> = {
  [RentalPlatform.Airbnb]: '#FF5A5F',
  [RentalPlatform.Booking]: '#003580',
  [RentalPlatform.Direct]: colors.textTertiary,
};

// ── Short-Term Rental List Screen ────────────────────

export default function ShortTermRentalsScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const router = useRouter();
  const [rentals, setRentals] = useState<ShortTermRentalResponse[]>([]);
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

      console.debug('[short-term-rentals] fetching...');
      try {
        const data = await getShortTermRentals(propertyId);
        setRentals(data);
        console.debug('[short-term-rentals] loaded', data.length, 'rentals');
      } catch (err) {
        console.error('[short-term-rentals] error', err);
        setError('Kısa dönem kiralama listesi yüklenirken bir hata oluştu.');
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
    (rentalId: string) => {
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
              console.debug('[short-term-rentals] deleting:', rentalId);
              try {
                await deleteShortTermRental(propertyId, rentalId);
                console.debug('[short-term-rentals] deleted');
                fetchData(true);
              } catch (err) {
                console.error('[short-term-rentals] delete error', err);
                Alert.alert('Hata', 'Kayıt silinirken bir hata oluştu.');
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
        <Stack.Screen options={{ title: 'Kısa Dönem Kiralama' }} />
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
        <Stack.Screen options={{ title: 'Kısa Dönem Kiralama' }} />
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
  if (rentals.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Kısa Dönem Kiralama' }} />
        <View style={styles.centered}>
          <MaterialIcons name="hotel" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Henüz kısa dönem kiralama kaydı yok</Text>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/properties/short-term-rental-form',
                params: { propertyId },
              })
            }
          >
            <MaterialIcons name="add" size={20} color={colors.textInverse} />
            <Text style={styles.addButtonText}>Yeni Kayıt</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Kısa Dönem Kiralama' }} />

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
              pathname: '/(tabs)/properties/short-term-rental-form',
              params: { propertyId },
            })
          }
        >
          <MaterialIcons name="add" size={20} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Yeni Kayıt</Text>
        </Pressable>

        {/* ── Rental Cards ── */}
        {rentals.map((rental) => (
          <RentalCard
            key={rental.id}
            rental={rental}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/properties/short-term-rental-form',
                params: { propertyId, rentalId: rental.id },
              })
            }
            onDelete={() => handleDelete(rental.id)}
          />
        ))}
      </ScrollView>
    </>
  );
}

// ── Rental Card Component ────────────────────────────

function RentalCard({
  rental,
  onPress,
  onDelete,
}: {
  rental: ShortTermRentalResponse;
  onPress: () => void;
  onDelete: () => void;
}) {
  const platformColor = platformColors[rental.platform] ?? colors.textTertiary;
  const platformLabel =
    RentalPlatformLabels[rental.platform as keyof typeof RentalPlatformLabels] ??
    rental.platform;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={1}>
          {rental.guestName || 'İsimsiz Misafir'}
        </Text>
        <View style={[styles.platformBadge, { backgroundColor: platformColor + '20' }]}>
          <Text style={[styles.platformBadgeText, { color: platformColor }]}>
            {platformLabel}
          </Text>
        </View>
      </View>

      <View style={styles.cardDateRow}>
        <MaterialIcons name="event" size={14} color={colors.textTertiary} />
        <Text style={styles.cardDateText}>
          {formatDate(rental.checkIn)} → {formatDate(rental.checkOut)}
        </Text>
        <Text style={styles.nightBadge}>{rental.nightCount} gece</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardAmount}>
          {formatAmount(rental.netAmount, rental.currency)}
        </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.body,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  platformBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  platformBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
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
    flex: 1,
  },
  nightBadge: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cardAmount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
  },
  deleteButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  deleteButtonPressed: {
    backgroundColor: colors.criticalLight,
  },
});
