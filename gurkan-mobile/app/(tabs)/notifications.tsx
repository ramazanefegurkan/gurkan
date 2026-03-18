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

import { getNotifications } from '@/src/api/client';
import {
  NotificationSeverity,
  NotificationTypeLabels,
  type NotificationItem,
  type NotificationType,
} from '@/src/api/types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@/src/theme';

// ── Severity config ──────────────────────────────────

const severityConfig: Record<
  string,
  { label: string; bg: string; text: string; icon: keyof typeof MaterialIcons.glyphMap }
> = {
  [NotificationSeverity.Critical]: {
    label: 'Kritik',
    bg: colors.critical,
    text: colors.textInverse,
    icon: 'error',
  },
  [NotificationSeverity.Warning]: {
    label: 'Uyarı',
    bg: colors.warning,
    text: colors.textInverse,
    icon: 'warning',
  },
  [NotificationSeverity.Info]: {
    label: 'Bilgi',
    bg: colors.info,
    text: colors.textInverse,
    icon: 'info',
  },
};

// Lighter tints for icon circle backgrounds
const severityIconBg: Record<string, string> = {
  [NotificationSeverity.Critical]: colors.criticalLight,
  [NotificationSeverity.Warning]: colors.warningLight,
  [NotificationSeverity.Info]: colors.infoLight,
};

const severityIconColor: Record<string, string> = {
  [NotificationSeverity.Critical]: colors.critical,
  [NotificationSeverity.Warning]: colors.warning,
  [NotificationSeverity.Info]: colors.info,
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Notification Screen ──────────────────────────────

export default function NotificationsScreen() {
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

    console.debug('[notifications] fetching...');
    try {
      const data = await getNotifications();
      setNotifications(data);
      console.debug('[notifications] loaded:', data.length, 'items');
    } catch (err) {
      console.error('[notifications] fetch error:', err);
      setError('Bildirimler yüklenirken bir hata oluştu.');
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
  if (error && notifications.length === 0) {
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
  if (notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <MaterialIcons
          name="check-circle"
          size={64}
          color={colors.success}
        />
        <Text style={styles.emptyTitle}>Bildirim yok</Text>
        <Text style={styles.emptySubtitle}>
          Her şey yolunda! Tüm mülkleriniz düzenli görünüyor.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={notifications}
      keyExtractor={(item, index) =>
        `${item.type}-${item.propertyId}-${item.relatedEntityId ?? index}`
      }
      renderItem={({ item }) => <NotificationRow item={item} />}
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
        <SeveritySummary notifications={notifications} />
      }
    />
  );
}

// ── Severity summary bar ─────────────────────────────

function SeveritySummary({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const criticalCount = notifications.filter(
    (n) => n.severity === NotificationSeverity.Critical,
  ).length;
  const warningCount = notifications.filter(
    (n) => n.severity === NotificationSeverity.Warning,
  ).length;
  const infoCount = notifications.filter(
    (n) => n.severity === NotificationSeverity.Info,
  ).length;

  return (
    <View style={styles.summaryBar}>
      {criticalCount > 0 && (
        <View style={[styles.summaryBadge, { backgroundColor: colors.criticalLight }]}>
          <MaterialIcons name="error" size={14} color={colors.critical} />
          <Text style={[styles.summaryBadgeText, { color: colors.critical }]}>
            {criticalCount} Kritik
          </Text>
        </View>
      )}
      {warningCount > 0 && (
        <View style={[styles.summaryBadge, { backgroundColor: colors.warningLight }]}>
          <MaterialIcons name="warning" size={14} color={colors.warning} />
          <Text style={[styles.summaryBadgeText, { color: colors.warning }]}>
            {warningCount} Uyarı
          </Text>
        </View>
      )}
      {infoCount > 0 && (
        <View style={[styles.summaryBadge, { backgroundColor: colors.infoLight }]}>
          <MaterialIcons name="info" size={14} color={colors.info} />
          <Text style={[styles.summaryBadgeText, { color: colors.info }]}>
            {infoCount} Bilgi
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Notification row ─────────────────────────────────

function NotificationRow({ item }: { item: NotificationItem }) {
  const router = useRouter();
  const config = severityConfig[item.severity] ?? severityConfig[NotificationSeverity.Info];
  const typeLabel = NotificationTypeLabels[item.type as NotificationType] ?? item.type;
  const iconBg = severityIconBg[item.severity] ?? colors.infoLight;
  const iconColor = severityIconColor[item.severity] ?? colors.info;

  return (
    <View style={styles.notifCard}>
      {/* Severity icon */}
      <View
        style={[styles.notifIconContainer, { backgroundColor: iconBg }]}
      >
        <MaterialIcons name={config.icon} size={20} color={iconColor} />
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        {/* Type + severity badge */}
        <View style={styles.notifTopRow}>
          <Text style={styles.notifType}>{typeLabel}</Text>
          <View
            style={[styles.severityBadge, { backgroundColor: config.bg }]}
          >
            <Text
              style={[styles.severityBadgeText, { color: config.text }]}
            >
              {config.label}
            </Text>
          </View>
        </View>

        {/* Message */}
        <Text style={styles.notifMessage}>{item.message}</Text>

        {/* Property + date row */}
        <View style={styles.notifBottomRow}>
          <Pressable
            style={({ pressed }) => [
              styles.notifPropertyRow,
              pressed && styles.notifPropertyPressed,
            ]}
            onPress={() => router.push(`/(tabs)/properties/${item.propertyId}`)}
            accessibilityRole="link"
            accessibilityLabel={`Mülk: ${item.propertyName}`}
          >
            <MaterialIcons
              name="apartment"
              size={13}
              color={colors.accent}
            />
            <Text style={styles.notifPropertyLink}>{item.propertyName}</Text>
          </Pressable>
          <Text style={styles.notifDate}>{formatDate(item.date)}</Text>
        </View>
      </View>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  summaryBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
  },

  // Notification card
  notifCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    ...shadows.sm,
  },
  notifIconContainer: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 4,
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notifType: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  severityBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.label,
  },
  notifMessage: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.bodySmall,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.bodySmall,
    marginBottom: spacing.sm,
  },
  notifBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifPropertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
    paddingRight: spacing.sm,
  },
  notifPropertyPressed: {
    opacity: 0.6,
  },
  notifPropertyLink: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  notifDate: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textTertiary,
  },
});
