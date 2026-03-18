import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { getTenant, createTenant, updateTenant } from '@/src/api/client';
import {
  Currency,
  CurrencyLabels,
  type CreateTenantRequest,
  type UpdateTenantRequest,
} from '@/src/api/types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@/src/theme';

// ── Currency options for chips ───────────────────────

const currencyOptions: { value: Currency; label: string }[] = [
  { value: Currency.TRY, label: '₺ TRY' },
  { value: Currency.USD, label: '$ USD' },
  { value: Currency.EUR, label: '€ EUR' },
];

// ── Tenant Form Screen ───────────────────────────────

export default function TenantFormScreen() {
  const { propertyId, tenantId } = useLocalSearchParams<{
    propertyId: string;
    tenantId?: string;
  }>();
  const router = useRouter();
  const isEdit = !!tenantId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.TRY);

  // Load existing tenant data for edit mode
  const fetchTenant = useCallback(async () => {
    if (!propertyId || !tenantId) return;
    setLoading(true);
    console.debug('[tenant-form] fetching tenant for edit:', tenantId);
    try {
      const data = await getTenant(propertyId, tenantId);
      setFullName(data.fullName);
      setPhone(data.phone ?? '');
      setEmail(data.email ?? '');
      setIdentityNumber(data.identityNumber ?? '');
      setLeaseStart(data.leaseStart ? data.leaseStart.slice(0, 10) : '');
      setLeaseEnd(data.leaseEnd ? data.leaseEnd.slice(0, 10) : '');
      setMonthlyRent(String(data.monthlyRent));
      setDeposit(String(data.deposit));
      setCurrency(data.currency);
      console.debug('[tenant-form] loaded tenant:', data.fullName);
    } catch (err) {
      console.error('[tenant-form] error loading tenant', err);
      Alert.alert('Hata', 'Kiracı bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [propertyId, tenantId]);

  useEffect(() => {
    if (isEdit) {
      fetchTenant();
    }
  }, [isEdit, fetchTenant]);

  const handleSubmit = useCallback(async () => {
    if (!propertyId) return;

    // Validation
    if (!fullName.trim()) {
      Alert.alert('Uyarı', 'Ad Soyad alanı zorunludur.');
      return;
    }
    if (!leaseStart.trim()) {
      Alert.alert('Uyarı', 'Kira başlangıç tarihi zorunludur.');
      return;
    }
    if (!leaseEnd.trim()) {
      Alert.alert('Uyarı', 'Kira bitiş tarihi zorunludur.');
      return;
    }
    if (!monthlyRent.trim()) {
      Alert.alert('Uyarı', 'Aylık kira alanı zorunludur.');
      return;
    }

    setSubmitting(true);
    console.debug('[tenant-form] submitting...');

    try {
      // K012: append T00:00:00Z for UTC ISO format
      const leaseStartISO = `${leaseStart.trim()}T00:00:00Z`;
      const leaseEndISO = `${leaseEnd.trim()}T00:00:00Z`;

      if (isEdit && tenantId) {
        const payload: UpdateTenantRequest = {
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          identityNumber: identityNumber.trim() || null,
          leaseStart: leaseStartISO,
          leaseEnd: leaseEndISO,
          monthlyRent: parseFloat(monthlyRent),
          deposit: parseFloat(deposit || '0'),
          currency,
        };
        await updateTenant(propertyId, tenantId, payload);
      } else {
        const payload: CreateTenantRequest = {
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          identityNumber: identityNumber.trim() || null,
          leaseStart: leaseStartISO,
          leaseEnd: leaseEndISO,
          monthlyRent: parseFloat(monthlyRent),
          deposit: parseFloat(deposit || '0'),
          currency,
        };
        await createTenant(propertyId, payload);
      }

      console.debug('[tenant-form] saved');
      router.back();
    } catch (err) {
      console.error('[tenant-form] error', err);
      Alert.alert('Hata', 'Kiracı kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }, [
    propertyId,
    tenantId,
    isEdit,
    fullName,
    phone,
    email,
    identityNumber,
    leaseStart,
    leaseEnd,
    monthlyRent,
    deposit,
    currency,
    router,
  ]);

  // ── Loading state (edit mode) ──
  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{ title: isEdit ? 'Kiracı Düzenle' : 'Yeni Kiracı' }}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: isEdit ? 'Kiracı Düzenle' : 'Yeni Kiracı' }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Full Name ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Ad Soyad <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Kiracı adı soyadı"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          {/* ── Phone ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="05XX XXX XX XX"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>

          {/* ── Email ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* ── Identity Number ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>TC Kimlik No</Text>
            <TextInput
              style={styles.input}
              value={identityNumber}
              onChangeText={setIdentityNumber}
              placeholder="XXXXXXXXXXX"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={11}
            />
          </View>

          {/* ── Lease Start ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Kira Başlangıcı <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={leaseStart}
              onChangeText={setLeaseStart}
              placeholder="YYYY-AA-GG"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* ── Lease End ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Kira Bitişi <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={leaseEnd}
              onChangeText={setLeaseEnd}
              placeholder="YYYY-AA-GG"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* ── Monthly Rent ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Aylık Kira <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={monthlyRent}
              onChangeText={setMonthlyRent}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* ── Deposit ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Depozito</Text>
            <TextInput
              style={styles.input}
              value={deposit}
              onChangeText={setDeposit}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* ── Currency ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Para Birimi</Text>
            <View style={styles.chipRow}>
              {currencyOptions.map((opt) => {
                const isSelected = currency === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => setCurrency(opt.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Submit Button ── */}
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitButtonPressed,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <MaterialIcons
                  name={isEdit ? 'save' : 'add'}
                  size={20}
                  color={colors.textInverse}
                />
                <Text style={styles.submitButtonText}>
                  {isEdit ? 'Kaydet' : 'Kiracı Ekle'}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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

  // Fields
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  required: {
    color: colors.critical,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.textPrimary,
  },

  // Currency chips
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '15',
  },
  chipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.bodySmall,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.accent,
    fontFamily: typography.fontFamily.semiBold,
  },

  // Submit
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  submitButtonPressed: {
    backgroundColor: colors.accentDark,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.body,
    color: colors.textInverse,
  },
});
