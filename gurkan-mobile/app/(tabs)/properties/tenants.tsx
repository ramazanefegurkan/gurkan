import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { getTenants } from '@/src/api/client';
import { CurrencyLabels, type TenantListItem } from '@/src/api/types';
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

// ── Tenant List Screen ───────────────────────────────

export default function TenantsScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
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

      console.debug('[tenants] fetching...');
      try {
        const data = await getTenants(propertyId);
        setTenants(data);
        console.debug('[tenants] loaded', data.length, 'tenants');
      } catch (err) {
        console.error('[tenants] error', err);
        setError('Kiracı listesi yüklenirken bir hata oluştu.');
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

  const activeTenants = tenants.filter((t) => t.isActive);
  const pastTenants = tenants.filter((t) => !t.isActive);

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Kiracılar' }} />
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
        <Stack.Screen options={{ title: 'Kiracılar' }} />
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
  if (tenants.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Kiracılar' }} />
        <View style={styles.centered}>
          <MaterialIcons name="people-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Henüz kiracı bulunmuyor</Text>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/properties/tenant-form',
                params: { propertyId },
              })
            }
          >
            <MaterialIcons name="add" size={20} color={colors.textInverse} />
            <Text style={styles.addButtonText}>Yeni Kiracı</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Kiracılar' }} />

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
              pathname: '/(tabs)/properties/tenant-form',
              params: { propertyId },
            })
          }
        >
          <MaterialIcons name="add" size={20} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Yeni Kiracı</Text>
        </Pressable>

        {/* ── Active Tenants ── */}
        {activeTenants.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Aktif Kiracılar</Text>
            {activeTenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/properties/tenant-detail',
                    params: { propertyId, tenantId: tenant.id },
                  })
                }
              />
            ))}
          </View>
        )}

        {/* ── Past Tenants ── */}
        {pastTenants.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Geçmiş Kiracılar</Text>
            {pastTenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/properties/tenant-detail',
                    params: { propertyId, tenantId: tenant.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

// ── Tenant Card Component ────────────────────────────

function TenantCard({
  tenant,
  onPress,
}: {
  tenant: TenantListItem;
  onPress: () => void;
}) {
  const statusBadgeStyle = tenant.isActive
    ? { bg: colors.successLight, text: colors.success }
    : { bg: colors.criticalLight, text: colors.critical };
  const statusLabel = tenant.isActive ? 'Aktif' : 'Sonlanmış';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        !tenant.isActive && styles.cardMuted,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text
          style={[
            styles.cardName,
            !tenant.isActive && styles.cardNameMuted,
          ]}
          numberOfLines={1}
        >
          {tenant.fullName}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusBadgeStyle.bg },
          ]}
        >
          <Text style={[styles.statusBadgeText, { color: statusBadgeStyle.text }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.cardRent}>
        {formatAmount(tenant.monthlyRent, tenant.currency)} / ay
      </Text>

      <View style={styles.cardDateRow}>
        <MaterialIcons name="event" size={14} color={colors.textTertiary} />
        <Text style={styles.cardDateText}>
          {formatDate(tenant.leaseStart)} — {formatDate(tenant.leaseEnd)}
        </Text>
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

  // Section
  sectionContainer: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardMuted: {
    opacity: 0.7,
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
  cardNameMuted: {
    color: colors.textSecondary,
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
  cardRent: {
    fontFamily: typography.fontFamily.medium,
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
});
