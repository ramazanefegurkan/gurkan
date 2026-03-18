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
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useSession } from '@/src/ctx';
import { getDashboard, getNotifications } from '@/src/api/client';
import {
  CurrencyLabels,
  PropertyTypeLabels,
  NotificationSeverity,
  type DashboardResponse,
  type NotificationItem,
  type CurrencySummary,
  type PropertyFinancials,
  type CurrencyAmount,
} from '@/src/api/types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@/src/theme';

// ── Helpers ──────────────────────────────────────────

function formatAmount(amount: number): string {
  return amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrencyAmounts(amounts: CurrencyAmount[]): string {
  if (amounts.length === 0) return '—';
  return amounts
    .map(
      (a) =>
        `${formatAmount(a.amount)} ${CurrencyLabels[a.currency] ?? a.currency}`,
    )
    .join('\n');
}

// ── Dashboard Screen ─────────────────────────────────

export default function DashboardScreen() {
  const { user, signOut } = useSession();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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

    console.debug('[dashboard] fetching data...');
    try {
      const [dashData, notifData] = await Promise.all([
        getDashboard(),
        getNotifications(),
      ]);
      setDashboard(dashData);
      setNotifications(notifData);
      console.debug(
        '[dashboard] data loaded:',
        dashData.summary.length,
        'currencies,',
        dashData.properties.length,
        'properties,',
        notifData.length,
        'notifications',
      );
    } catch (err) {
      console.error('[dashboard] fetch error:', err);
      setError('Dashboard verileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => {
            console.debug('[auth] signOut confirmed by user');
            signOut();
          },
        },
      ],
    );
  }, [signOut]);

  // ── Notification counts ──
  const criticalCount = notifications.filter(
    (n) => n.severity === NotificationSeverity.Critical,
  ).length;
  const warningCount = notifications.filter(
    (n) => n.severity === NotificationSeverity.Warning,
  ).length;

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
  if (error && !dashboard) {
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

  return (
    <ScrollView
      style={styles.scrollView}
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
      {/* ── Header row with user + sign-out ── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>
            Merhaba{user?.fullName ? `, ${user.fullName}` : ''} 👋
          </Text>
          <Text style={styles.headerSubtitle}>Portföy özeti</Text>
        </View>
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.signOutButtonPressed,
          ]}
          hitSlop={8}
        >
          <MaterialIcons name="logout" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* ── Notification banner ── */}
      {notifications.length > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.notificationBanner,
            pressed && styles.notificationBannerPressed,
          ]}
          onPress={() => router.push('/(tabs)/notifications')}
        >
          <View style={styles.notifBannerIcon}>
            <MaterialIcons
              name="notifications-active"
              size={22}
              color={colors.accent}
            />
          </View>
          <View style={styles.notifBannerContent}>
            <Text style={styles.notifBannerTitle}>
              {notifications.length} bildirim
            </Text>
            <View style={styles.notifBannerBadges}>
              {criticalCount > 0 && (
                <View style={[styles.notifBadge, styles.notifBadgeCritical]}>
                  <Text style={styles.notifBadgeText}>
                    {criticalCount} kritik
                  </Text>
                </View>
              )}
              {warningCount > 0 && (
                <View style={[styles.notifBadge, styles.notifBadgeWarning]}>
                  <Text style={styles.notifBadgeTextDark}>
                    {warningCount} uyarı
                  </Text>
                </View>
              )}
            </View>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={colors.textTertiary}
          />
        </Pressable>
      )}

      {/* ── Error banner (partial, data still visible) ── */}
      {error && dashboard && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="warning" size={18} color={colors.warning} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* ── Empty state ── */}
      {dashboard && dashboard.properties.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="home-work"
            size={64}
            color={colors.textTertiary}
          />
          <Text style={styles.emptyTitle}>Henüz mülk bulunmuyor</Text>
          <Text style={styles.emptySubtitle}>
            Dashboard verilerini görmek için mülk ekleyin.
          </Text>
        </View>
      )}

      {/* ── Summary cards ── */}
      {dashboard && dashboard.summary.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Finansal Özet</Text>
          {dashboard.summary.map((s) => (
            <SummaryCard key={s.currency} summary={s} />
          ))}
        </View>
      )}

      {/* ── Per-property list ── */}
      {dashboard && dashboard.properties.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mülk Bazlı Durum</Text>
          {dashboard.properties.map((p) => (
            <PropertyCard key={p.propertyId} property={p} />
          ))}
        </View>
      )}

      {/* Bottom padding for tab bar */}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

// ── Summary Card Component ───────────────────────────

function SummaryCard({ summary }: { summary: CurrencySummary }) {
  const profitColor =
    summary.totalProfit >= 0 ? colors.success : colors.critical;
  const profitSign = summary.totalProfit >= 0 ? '+' : '';

  return (
    <View style={styles.summaryCard}>
      {/* Currency header */}
      <View style={styles.summaryCardHeader}>
        <Text style={styles.currencyLabel}>
          {CurrencyLabels[summary.currency] ?? summary.currency}
        </Text>
      </View>

      {/* Profit / Loss */}
      <View style={styles.profitRow}>
        <Text style={styles.profitLabel}>Kâr / Zarar</Text>
        <Text style={[styles.profitValue, { color: profitColor }]}>
          {profitSign}
          {formatAmount(summary.totalProfit)}
        </Text>
      </View>

      {/* Income & Expense */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Gelir</Text>
          <Text style={[styles.metricValue, { color: colors.success }]}>
            {formatAmount(summary.totalIncome)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Gider</Text>
          <Text style={[styles.metricValue, { color: colors.critical }]}>
            {formatAmount(summary.totalExpenses)}
          </Text>
        </View>
      </View>

      {/* Alert badges */}
      <View style={styles.alertRow}>
        {summary.unpaidRentCount > 0 && (
          <View style={[styles.alertBadge, styles.alertBadgeDanger]}>
            <MaterialIcons
              name="warning"
              size={13}
              color={colors.critical}
            />
            <Text style={styles.alertBadgeDangerText}>
              {summary.unpaidRentCount} ödenmemiş kira
            </Text>
          </View>
        )}
        {summary.upcomingBillCount > 0 && (
          <View style={[styles.alertBadge, styles.alertBadgeWarning]}>
            <MaterialIcons
              name="schedule"
              size={13}
              color={colors.warning}
            />
            <Text style={styles.alertBadgeWarningText}>
              {summary.upcomingBillCount} yaklaşan fatura
            </Text>
          </View>
        )}
        {summary.unpaidRentCount === 0 && summary.upcomingBillCount === 0 && (
          <View style={[styles.alertBadge, styles.alertBadgeOk]}>
            <MaterialIcons
              name="check-circle"
              size={13}
              color={colors.success}
            />
            <Text style={styles.alertBadgeOkText}>Sorun yok</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Property Card Component ──────────────────────────

function PropertyCard({ property }: { property: PropertyFinancials }) {
  const router = useRouter();
  const totalProfit = property.profit.reduce((acc, x) => acc + x.amount, 0);
  const profitColor = totalProfit >= 0 ? colors.success : colors.critical;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.propertyCard,
        pressed && styles.propertyCardPressed,
      ]}
      onPress={() => router.push(`/(tabs)/properties/${property.propertyId}` as any)}
    >
      {/* Name + type badge */}
      <View style={styles.propertyHeader}>
        <Text style={styles.propertyName} numberOfLines={1}>
          {property.propertyName}
        </Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {PropertyTypeLabels[property.propertyType] ?? 'Diğer'}
          </Text>
        </View>
      </View>

      {/* Financials row */}
      <View style={styles.propertyFinancials}>
        <View style={styles.propertyMetric}>
          <Text style={styles.propertyMetricLabel}>Gelir</Text>
          <Text
            style={[styles.propertyMetricValue, { color: colors.success }]}
            numberOfLines={1}
          >
            {formatCurrencyAmounts(property.income)}
          </Text>
        </View>
        <View style={styles.propertyMetric}>
          <Text style={styles.propertyMetricLabel}>Gider</Text>
          <Text
            style={[styles.propertyMetricValue, { color: colors.critical }]}
            numberOfLines={1}
          >
            {formatCurrencyAmounts(property.expenses)}
          </Text>
        </View>
        <View style={styles.propertyMetric}>
          <Text style={styles.propertyMetricLabel}>Kâr</Text>
          <Text
            style={[styles.propertyMetricValue, { color: profitColor }]}
            numberOfLines={1}
          >
            {formatCurrencyAmounts(property.profit)}
          </Text>
        </View>
      </View>

      {/* Status badges */}
      <View style={styles.propertyBadges}>
        {property.unpaidRentCount > 0 && (
          <View style={styles.propertyStatusBadgeDanger}>
            <Text style={styles.propertyStatusBadgeDangerText}>
              {property.unpaidRentCount} ödenmemiş
            </Text>
          </View>
        )}
        {property.upcomingBillCount > 0 && (
          <View style={styles.propertyStatusBadgeWarning}>
            <Text style={styles.propertyStatusBadgeWarningText}>
              {property.upcomingBillCount} fatura
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Error
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.body,
    color: colors.textSecondary,
    textAlign: 'center',
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

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  greeting: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subtitle,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signOutButton: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  signOutButtonPressed: {
    backgroundColor: colors.surfaceElevated,
  },

  // Notification banner
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    ...shadows.sm,
  },
  notificationBannerPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  notifBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 4,
  },
  notifBannerContent: {
    flex: 1,
  },
  notifBannerTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
  },
  notifBannerBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  notifBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  notifBadgeCritical: {
    backgroundColor: colors.criticalLight,
  },
  notifBadgeWarning: {
    backgroundColor: colors.warningLight,
  },
  notifBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.label,
    color: colors.critical,
  },
  notifBadgeTextDark: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.label,
    color: colors.warning,
  },

  // Error banner (partial)
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorBannerText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.bodySmall,
    color: colors.warning,
    flex: 1,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.sm,
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

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm + 4,
    letterSpacing: 0.2,
  },

  // Summary card
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    ...shadows.md,
  },
  summaryCardHeader: {
    marginBottom: spacing.sm + 4,
  },
  currencyLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.body,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  profitLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.bodySmall,
    color: colors.textSecondary,
  },
  profitValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subtitle,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.sm,
  },
  alertRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  alertBadgeDanger: {
    backgroundColor: colors.criticalLight,
  },
  alertBadgeWarning: {
    backgroundColor: colors.warningLight,
  },
  alertBadgeOk: {
    backgroundColor: colors.successLight,
  },
  alertBadgeDangerText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.label,
    color: colors.critical,
  },
  alertBadgeWarningText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.label,
    color: colors.warning,
  },
  alertBadgeOkText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.label,
    color: colors.success,
  },

  // Property card
  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    ...shadows.sm,
  },
  propertyCardPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 4,
  },
  propertyName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  typeBadge: {
    backgroundColor: `${colors.accent}15`,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.label,
    color: colors.accent,
  },
  propertyFinancials: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  propertyMetric: {
    flex: 1,
  },
  propertyMetricLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.label,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  propertyMetricValue: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
  },
  propertyBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  propertyStatusBadgeDanger: {
    backgroundColor: colors.criticalLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  propertyStatusBadgeDangerText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.label,
    color: colors.critical,
  },
  propertyStatusBadgeWarning: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  propertyStatusBadgeWarningText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.label,
    color: colors.warning,
  },
});
