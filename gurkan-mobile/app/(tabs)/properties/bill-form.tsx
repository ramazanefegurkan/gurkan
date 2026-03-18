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

import { getBill, createBill, updateBill } from '@/src/api/client';
import {
  Currency,
  BillType,
  BillTypeLabels,
  type CreateBillRequest,
  type UpdateBillRequest,
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

const billTypeOptions: { value: BillType; label: string }[] = (
  Object.keys(BillTypeLabels) as BillType[]
).map((key) => ({
  value: key,
  label: BillTypeLabels[key],
}));

// ── Bill Form Screen ─────────────────────────────────

export default function BillFormScreen() {
  const { propertyId, billId } = useLocalSearchParams<{
    propertyId: string;
    billId?: string;
  }>();
  const router = useRouter();
  const isEdit = !!billId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [type, setType] = useState<BillType>(BillType.Water);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.TRY);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Load existing data for edit mode
  const fetchBill = useCallback(async () => {
    if (!propertyId || !billId) return;
    setLoading(true);
    console.debug('[bill-form] fetching bill for edit:', billId);
    try {
      const data = await getBill(propertyId, billId);
      setType(data.type);
      setAmount(String(data.amount));
      setCurrency(data.currency);
      setDueDate(data.dueDate ? data.dueDate.slice(0, 10) : '');
      setNotes(data.notes ?? '');
      console.debug('[bill-form] loaded bill');
    } catch (err) {
      console.error('[bill-form] error loading bill', err);
      Alert.alert('Hata', 'Fatura bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [propertyId, billId]);

  useEffect(() => {
    if (isEdit) {
      fetchBill();
    }
  }, [isEdit, fetchBill]);

  const handleSubmit = useCallback(async () => {
    if (!propertyId) return;

    // Validation
    if (!amount.trim()) {
      Alert.alert('Uyarı', 'Tutar alanı zorunludur.');
      return;
    }
    if (!dueDate.trim()) {
      Alert.alert('Uyarı', 'Son ödeme tarihi zorunludur.');
      return;
    }

    setSubmitting(true);
    console.debug('[bill-form] submitting...');

    try {
      // K012: append T00:00:00Z for UTC ISO format
      const dueDateISO = `${dueDate.trim()}T00:00:00Z`;

      const payload: CreateBillRequest = {
        type,
        amount: parseFloat(amount),
        currency,
        dueDate: dueDateISO,
        notes: notes.trim() || null,
      };

      if (isEdit && billId) {
        await updateBill(propertyId, billId, payload as UpdateBillRequest);
      } else {
        await createBill(propertyId, payload);
      }

      console.debug('[bill-form] saved');
      router.back();
    } catch (err) {
      console.error('[bill-form] error', err);
      Alert.alert('Hata', 'Fatura kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }, [propertyId, billId, isEdit, type, amount, currency, dueDate, notes, router]);

  // ── Loading state (edit mode) ──
  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{ title: isEdit ? 'Fatura Düzenle' : 'Yeni Fatura' }}
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
        options={{ title: isEdit ? 'Fatura Düzenle' : 'Yeni Fatura' }}
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
          {/* ── Bill Type ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Fatura Türü</Text>
            <View style={styles.chipRow}>
              {billTypeOptions.map((opt) => {
                const isSelected = type === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => setType(opt.value)}
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

          {/* ── Amount ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Tutar <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
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

          {/* ── Due Date ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Son Ödeme Tarihi <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-AA-GG"
              placeholderTextColor={colors.textTertiary}
            />
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
                  {isEdit ? 'Kaydet' : 'Fatura Ekle'}
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
