import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { getTelegramStatus, linkTelegram, unlinkTelegram } from '@/src/api/client';
import type { TelegramLinkResponse } from '@/src/api/types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@/src/theme';

function formatDate(dateStr: string): string {
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

export default function SettingsScreen() {
  const [status, setStatus] = useState<TelegramLinkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStatus = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getTelegramStatus();
      setStatus(data);
    } catch {
      Alert.alert('Hata', 'Telegram durumu yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleLink = useCallback(async () => {
    if (linkCode.length !== 6) {
      Alert.alert('Hata', 'Bağlantı kodu 6 haneli olmalıdır.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await linkTelegram(linkCode);
      setStatus(data);
      setLinkCode('');
    } catch {
      Alert.alert('Hata', 'Bağlantı kurulurken bir hata oluştu. Kodunuzu kontrol edin.');
    } finally {
      setSubmitting(false);
    }
  }, [linkCode]);

  const handleUnlink = useCallback(() => {
    Alert.alert(
      'Bağlantıyı Kaldır',
      'Telegram bağlantısını kaldırmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await unlinkTelegram();
              setStatus({
                isLinked: false,
                telegramUserId: null,
                telegramUsername: null,
                linkedAt: null,
              });
            } catch {
              Alert.alert('Hata', 'Bağlantı kaldırılırken bir hata oluştu.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
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
          onRefresh={() => fetchStatus(true)}
          colors={[colors.accent]}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconContainer}>
            <MaterialIcons name="send" size={22} color={colors.accent} />
          </View>
          <Text style={styles.cardTitle}>Telegram Bağlantısı</Text>
        </View>

        {status?.isLinked ? (
          <View style={styles.linkedContent}>
            <View style={styles.statusRow}>
              <MaterialIcons name="check-circle" size={18} color={colors.success} />
              <Text style={styles.statusLinkedText}>Bağlı</Text>
            </View>

            {status.telegramUsername && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Kullanıcı Adı</Text>
                <Text style={styles.infoValue}>@{status.telegramUsername}</Text>
              </View>
            )}

            {status.linkedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bağlantı Tarihi</Text>
                <Text style={styles.infoValue}>{formatDate(status.linkedAt)}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.unlinkButton,
                pressed && styles.unlinkButtonPressed,
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleUnlink}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.critical} />
              ) : (
                <>
                  <MaterialIcons name="link-off" size={18} color={colors.critical} />
                  <Text style={styles.unlinkButtonText}>Bağlantıyı Kaldır</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.unlinkedContent}>
            <View style={styles.statusRow}>
              <MaterialIcons name="link-off" size={18} color={colors.textTertiary} />
              <Text style={styles.statusUnlinkedText}>Bağlı değil</Text>
            </View>

            <Text style={styles.hint}>
              Telegram botundan aldığınız 6 haneli kodu girin.
            </Text>

            <Text style={styles.inputLabel}>Bağlantı Kodu</Text>
            <TextInput
              style={styles.input}
              value={linkCode}
              onChangeText={setLinkCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={colors.textTertiary}
              editable={!submitting}
            />

            <Pressable
              style={({ pressed }) => [
                styles.linkButton,
                pressed && styles.linkButtonPressed,
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleLink}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <MaterialIcons name="link" size={18} color={colors.textInverse} />
                  <Text style={styles.linkButtonText}>Bağla</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardIconContainer: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subtitle,
    color: colors.textPrimary,
  },
  linkedContent: {
    gap: spacing.sm,
  },
  unlinkedContent: {
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  statusLinkedText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.success,
  },
  statusUnlinkedText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.bodySmall,
    color: colors.textTertiary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.bodySmall,
    color: colors.textSecondary,
  },
  infoValue: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
  },
  hint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subtitle,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  linkButtonPressed: {
    backgroundColor: colors.accentDark,
  },
  linkButtonText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.body,
    color: colors.textInverse,
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.critical,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  unlinkButtonPressed: {
    backgroundColor: colors.criticalLight,
  },
  unlinkButtonText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.body,
    color: colors.critical,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
