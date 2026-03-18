import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { getProperties } from '@/src/api/client';
import {
  PropertyTypeLabels,
  CurrencyLabels,
  Currency,
  type PropertyListResponse,
  type PropertyType,
} from '@/src/api/types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@/src/theme';

// ── Currency badge styling ───────────────────────────

const currencyBadgeColors: Record<string, { bg: string; text: string }> = {
  [Currency.TRY]: { bg: colors.surfaceElevated, text: colors.textSecondary },
  [Currency.USD]: { bg: '#e3f2fd', text: '#1565c0' },
  [Currency.EUR]: { bg: '#e8f5e9', text: '#2d8a4e' },
};

// ── Property List Screen ─────────────────────────────

export default function PropertiesScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    console.debug('[properties] fetching list...');
    try {
      const data = await getProperties();
      setProperties(data);
      console.debug('[properties] loaded:', data.length, 'properties');
    } catch (err) {
      console.error('[properties] fetch error:', err);
      setError('Mülkler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Loading state ──
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  // ── Error state ──
  if (error && properties.length === 0) {
    return (
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
    );
  }

  // ── Empty state ──
  if (properties.length === 0) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="home-work" size={64} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>Henüz mülk yok</Text>
        <Text style={styles.emptySubtitle}>
          Mülklerinizi web panelinden ekleyebilirsiniz.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={properties}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PropertyCard
          item={item}
          onPress={() => router.push(`/(tabs)/properties/${item.id}`)}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          colors={[colors.accent]}
          tintColor={colors.accent}
        />
      }
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <Text style={styles.countText}>
          {properties.length} mülk listeleniyor
        </Text>
      }
    />
  );
}

// ── Property Card ────────────────────────────────────

function PropertyCard({
  item,
  onPress,
}: {
  item: PropertyListResponse;
  onPress: () => void;
}) {
  const typeLabel = PropertyTypeLabels[item.type as PropertyType] ?? item.type;
  const currencyLabel = CurrencyLabels[item.currency] ?? item.currency;
  const currencyColors =
    currencyBadgeColors[item.currency] ?? currencyBadgeColors[Currency.TRY];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${typeLabel}, ${item.city}`}
    >
      {/* Top row: name + chevron */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <MaterialIcons
          name="chevron-right"
          size={22}
          color={colors.textTertiary}
        />
      </View>

      {/* Badges row: type, currency, group */}
      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabel}</Text>
        </View>

        <View
          style={[styles.currencyBadge, { backgroundColor: currencyColors.bg }]}
        >
          <Text style={[styles.currencyBadgeText, { color: currencyColors.text }]}>
            {currencyLabel}
          </Text>
        </View>

        {item.groupName ? (
          <View style={styles.groupBadge}>
            <MaterialIcons name="group" size={12} color={colors.accent} />
            <Text style={styles.groupBadgeText}>{item.groupName}</Text>
          </View>
        ) : null}
      </View>

      {/* City row */}
      <View style={styles.cityRow}>
        <MaterialIcons name="place" size={15} color={colors.textTertiary} />
        <Text style={styles.cityText}>{item.city}</Text>
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
  emptyTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // List
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  countText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.bodySmall,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    ...shadows.sm,
  },
  cardPressed: {
    backgroundColor: colors.surfaceElevated,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.body,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    backgroundColor: colors.accentLight + '22',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.label,
    color: colors.accent,
  },
  currencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  currencyBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.label,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  groupBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.label,
    color: colors.accent,
  },

  // City
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cityText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textTertiary,
  },
});
