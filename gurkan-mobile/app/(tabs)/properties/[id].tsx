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

import { getProperty } from '@/src/api/client';
import {
  PropertyTypeLabels,
  CurrencyLabels,
  Currency,
  type PropertyResponse,
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

// ── Date formatter ───────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Property Detail Screen ───────────────────────────

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<PropertyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!id) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.debug('[property-detail] fetching id:', id);
      try {
        const data = await getProperty(id);
        setProperty(data);
        console.debug('[property-detail] loaded:', data.name);
      } catch (err) {
        console.error('[property-detail] fetch error:', err);
        setError('Mülk bilgileri yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  if (error || !property) {
    return (
      <>
        <Stack.Screen options={{ title: 'Hata' }} />
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.critical} />
          <Text style={styles.errorText}>
            {error ?? 'Mülk bulunamadı.'}
          </Text>
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

  const typeLabel = PropertyTypeLabels[property.type as PropertyType] ?? property.type;
  const currencyLabel = CurrencyLabels[property.currency] ?? property.currency;
  const currencyColors =
    currencyBadgeColors[property.currency] ?? currencyBadgeColors[Currency.TRY];

  return (
    <>
      <Stack.Screen options={{ title: property.name }} />

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
        {/* ── Header Section ── */}
        <View style={styles.headerSection}>
          <Text style={styles.propertyName}>{property.name}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
            <View
              style={[
                styles.currencyBadge,
                { backgroundColor: currencyColors.bg },
              ]}
            >
              <Text
                style={[
                  styles.currencyBadgeText,
                  { color: currencyColors.text },
                ]}
              >
                {currencyLabel}
              </Text>
            </View>
            {property.groupName ? (
              <View style={styles.groupBadge}>
                <MaterialIcons name="group" size={13} color={colors.accent} />
                <Text style={styles.groupBadgeText}>{property.groupName}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Location Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="place" size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Konum</Text>
          </View>
          <View style={styles.sectionBody}>
            <DetailRow label="Adres" value={property.address} />
            <DetailRow label="Şehir" value={property.city} />
            <DetailRow label="İlçe" value={property.district} />
          </View>
        </View>

        {/* ── Details Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="info-outline" size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Detaylar</Text>
          </View>
          <View style={styles.sectionBody}>
            <DetailRow
              label="Alan"
              value={property.area != null ? `${property.area} m²` : null}
            />
            <DetailRow
              label="Oda Sayısı"
              value={property.roomCount != null ? String(property.roomCount) : null}
            />
            <DetailRow
              label="Kat"
              value={
                property.floor != null
                  ? property.totalFloors != null
                    ? `${property.floor} / ${property.totalFloors}`
                    : String(property.floor)
                  : null
              }
            />
            <DetailRow
              label="Yapım Yılı"
              value={property.buildYear != null ? String(property.buildYear) : null}
            />
          </View>
        </View>

        {/* ── Description Section ── */}
        {property.description ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="description"
                size={18}
                color={colors.accent}
              />
              <Text style={styles.sectionTitle}>Açıklama</Text>
            </View>
            <View style={styles.sectionBody}>
              <Text style={styles.descriptionText}>{property.description}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Dates Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="event" size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Tarihler</Text>
          </View>
          <View style={styles.sectionBody}>
            <DetailRow label="Oluşturulma" value={formatDate(property.createdAt)} />
            <DetailRow label="Son Güncelleme" value={formatDate(property.updatedAt)} />
          </View>
        </View>

        {/* ── Management Section (sub-page navigation) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="dashboard" size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Yönetim</Text>
          </View>
          <View style={styles.navList}>
            <Pressable
              style={({ pressed }) => [
                styles.navItem,
                pressed && styles.navItemPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/properties/tenants',
                  params: { propertyId: id },
                })
              }
            >
              <View style={styles.navItemLeft}>
                <MaterialIcons name="people" size={22} color={colors.accent} />
                <Text style={styles.navItemLabel}>Kiracılar</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navItem,
                pressed && styles.navItemPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/properties/short-term-rentals',
                  params: { propertyId: id },
                })
              }
            >
              <View style={styles.navItemLeft}>
                <MaterialIcons name="date-range" size={22} color={colors.accent} />
                <Text style={styles.navItemLabel}>Kısa Dönem</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navItem,
                pressed && styles.navItemPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/properties/expenses',
                  params: { propertyId: id },
                })
              }
            >
              <View style={styles.navItemLeft}>
                <MaterialIcons name="account-balance-wallet" size={22} color={colors.accent} />
                <Text style={styles.navItemLabel}>Giderler</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navItem,
                pressed && styles.navItemPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/properties/bills',
                  params: { propertyId: id },
                })
              }
            >
              <View style={styles.navItemLeft}>
                <MaterialIcons name="receipt" size={22} color={colors.accent} />
                <Text style={styles.navItemLabel}>Faturalar</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navItem,
                styles.navItemLast,
                pressed && styles.navItemPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/properties/documents',
                  params: { propertyId: id },
                })
              }
            >
              <View style={styles.navItemLeft}>
                <MaterialIcons name="folder" size={22} color={colors.accent} />
                <Text style={styles.navItemLabel}>Dökümanlar</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={colors.textTertiary}
              />
            </Pressable>
          </View>
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
  // Don't render rows with no value
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
  propertyName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm + 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeBadge: {
    backgroundColor: colors.accentLight + '22',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    color: colors.accent,
  },
  currencyBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  currencyBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight + '15',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  groupBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.accent,
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

  // Description
  descriptionText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.bodySmall,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.bodySmall,
    paddingVertical: spacing.xs,
  },

  // Navigation items
  navList: {
    paddingVertical: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  navItemLast: {
    borderBottomWidth: 0,
  },
  navItemPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  navItemLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.body,
    color: colors.textPrimary,
  },
});
