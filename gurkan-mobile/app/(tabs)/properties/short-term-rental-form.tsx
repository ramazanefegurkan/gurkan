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

import {
  getShortTermRental,
  createShortTermRental,
  updateShortTermRental,
} from '@/src/api/client';
import {
  Currency,
  RentalPlatform,
  RentalPlatformLabels,
  type CreateShortTermRentalRequest,
  type UpdateShortTermRentalRequest,
} from '@/src/api/types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@/src/theme';

// ── Options ──────────────────────────────────────────

const currencyOptions: { value: Currency; label: string }[] = [
  { value: Currency.TRY, label: '₺ TRY' },
  { value: Currency.USD, label: '$ USD' },
  { value: Currency.EUR, label: '€ EUR' },
];

const platformOptions: { value: RentalPlatform; label: string }[] = [
  { value: RentalPlatform.Airbnb, label: 'Airbnb' },
  { value: RentalPlatform.Booking, label: 'Booking' },
  { value: RentalPlatform.Direct, label: 'Direkt' },
];

// ── Short-Term Rental Form Screen ────────────────────

export default function ShortTermRentalFormScreen() {
  const { propertyId, rentalId } = useLocalSearchParams<{
    propertyId: string;
    rentalId?: string;
  }>();
  const router = useRouter();
  const isEdit = !!rentalId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [guestName, setGuestName] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [nightlyRate, setNightlyRate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [platformFee, setPlatformFee] = useState('');
  const [netAmount, setNetAmount] = useState('');
  const [platform, setPlatform] = useState<RentalPlatform>(RentalPlatform.Airbnb);
  const [currency, setCurrency] = useState<Currency>(Currency.TRY);
  const [notes, setNotes] = useState('');

  // Load existing data for edit mode
  const fetchRental = useCallback(async () => {
    if (!propertyId || !rentalId) return;
    setLoading(true);
    console.debug('[short-term-rental-form] fetching rental for edit:', rentalId);
    try {
      const data = await getShortTermRental(propertyId, rentalId);
      setGuestName(data.guestName ?? '');
      setCheckIn(data.checkIn ? data.checkIn.slice(0, 10) : '');
      setCheckOut(data.checkOut ? data.checkOut.slice(0, 10) : '');
      setNightlyRate(String(data.nightlyRate));
      setTotalAmount(String(data.totalAmount));
      setPlatformFee(String(data.platformFee));
      setNetAmount(String(data.netAmount));
      setPlatform(data.platform);
      setCurrency(data.currency);
      setNotes(data.notes ?? '');
      console.debug('[short-term-rental-form] loaded rental');
    } catch (err) {
      console.error('[short-term-rental-form] error loading rental', err);
      Alert.alert('Hata', 'Kiralama bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [propertyId, rentalId]);

  useEffect(() => {
    if (isEdit) {
      fetchRental();
    }
  }, [isEdit, fetchRental]);

  const handleSubmit = useCallback(async () => {
    if (!propertyId) return;

    // Validation
    if (!checkIn.trim()) {
      Alert.alert('Uyarı', 'Giriş tarihi zorunludur.');
      return;
    }
    if (!checkOut.trim()) {
      Alert.alert('Uyarı', 'Çıkış tarihi zorunludur.');
      return;
    }
    if (!totalAmount.trim()) {
      Alert.alert('Uyarı', 'Toplam tutar zorunludur.');
      return;
    }

    setSubmitting(true);
    console.debug('[short-term-rental-form] submitting...');

    try {
      // K012: append T00:00:00Z for UTC ISO format
      const checkInISO = `${checkIn.trim()}T00:00:00Z`;
      const checkOutISO = `${checkOut.trim()}T00:00:00Z`;

      if (isEdit && rentalId) {
        const payload: UpdateShortTermRentalRequest = {
          guestName: guestName.trim() || null,
          checkIn: checkInISO,
          checkOut: checkOutISO,
          nightlyRate: parseFloat(nightlyRate || '0'),
          totalAmount: parseFloat(totalAmount),
          platformFee: parseFloat(platformFee || '0'),
          netAmount: parseFloat(netAmount || '0'),
          platform,
          currency,
          notes: notes.trim() || null,
        };
        await updateShortTermRental(propertyId, rentalId, payload);
      } else {
        const payload: CreateShortTermRentalRequest = {
          guestName: guestName.trim() || null,
          checkIn: checkInISO,
          checkOut: checkOutISO,
          nightlyRate: parseFloat(nightlyRate || '0'),
          totalAmount: parseFloat(totalAmount),
          platformFee: parseFloat(platformFee || '0'),
          netAmount: parseFloat(netAmount || '0'),
          platform,
          currency,
          notes: notes.trim() || null,
        };
        await createShortTermRental(propertyId, payload);
      }

      console.debug('[short-term-rental-form] saved');
      router.back();
    } catch (err) {
      console.error('[short-term-rental-form] error', err);
      Alert.alert('Hata', 'Kayıt kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }, [
    propertyId,
    rentalId,
    isEdit,
    guestName,
    checkIn,
    checkOut,
    nightlyRate,
    totalAmount,
    platformFee,
    netAmount,
    platform,
    currency,
    notes,
    router,
  ]);

  // ── Loading state (edit mode) ──
  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{ title: isEdit ? 'Kiralama Düzenle' : 'Yeni Kayıt' }}
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
        options={{ title: isEdit ? 'Kiralama Düzenle' : 'Yeni Kayıt' }}
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
          {/* ── Guest Name ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Misafir Adı</Text>
            <TextInput
              style={styles.input}
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Misafir adı (opsiyonel)"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          {/* ── Check-In Date ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Giriş Tarihi <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={checkIn}
              onChangeText={setCheckIn}
              placeholder="YYYY-AA-GG"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* ── Check-Out Date ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Çıkış Tarihi <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={checkOut}
              onChangeText={setCheckOut}
              placeholder="YYYY-AA-GG"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* ── Nightly Rate ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Gecelik Ücret</Text>
            <TextInput
              style={styles.input}
              value={nightlyRate}
              onChangeText={setNightlyRate}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* ── Total Amount ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Toplam Tutar <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={totalAmount}
              onChangeText={setTotalAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* ── Platform Fee ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Platform Komisyonu</Text>
            <TextInput
              style={styles.input}
              value={platformFee}
              onChangeText={setPlatformFee}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* ── Net Amount ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Net Tutar</Text>
            <TextInput
              style={styles.input}
              value={netAmount}
              onChangeText={setNetAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* ── Platform ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Platform</Text>
            <View style={styles.chipRow}>
              {platformOptions.map((opt) => {
                const isSelected = platform === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => setPlatform(opt.value)}
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

          {/* ── Notes ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Notlar</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notlar (opsiyonel)"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
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
                  {isEdit ? 'Kaydet' : 'Kayıt Ekle'}
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
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
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
