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
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { getExpense, createExpense, updateExpense } from '@/src/api/client';
import {
  Currency,
  ExpenseCategory,
  ExpenseCategoryLabels,
  type CreateExpenseRequest,
  type UpdateExpenseRequest,
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

const categoryOptions: { value: ExpenseCategory; label: string }[] = (
  Object.keys(ExpenseCategoryLabels) as ExpenseCategory[]
).map((key) => ({
  value: key,
  label: ExpenseCategoryLabels[key],
}));

// ── Expense Form Screen ──────────────────────────────

export default function ExpenseFormScreen() {
  const { propertyId, expenseId } = useLocalSearchParams<{
    propertyId: string;
    expenseId?: string;
  }>();
  const router = useRouter();
  const isEdit = !!expenseId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.Maintenance);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.TRY);
  const [date, setDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState('');
  const [notes, setNotes] = useState('');

  // Load existing data for edit mode
  const fetchExpense = useCallback(async () => {
    if (!propertyId || !expenseId) return;
    setLoading(true);
    console.debug('[expense-form] fetching expense for edit:', expenseId);
    try {
      const data = await getExpense(propertyId, expenseId);
      setCategory(data.category);
      setDescription(data.description);
      setAmount(String(data.amount));
      setCurrency(data.currency);
      setDate(data.date ? data.date.slice(0, 10) : '');
      setIsRecurring(data.isRecurring);
      setRecurrenceInterval(data.recurrenceInterval ?? '');
      setNotes(data.notes ?? '');
      console.debug('[expense-form] loaded expense');
    } catch (err) {
      console.error('[expense-form] error loading expense', err);
      Alert.alert('Hata', 'Gider bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [propertyId, expenseId]);

  useEffect(() => {
    if (isEdit) {
      fetchExpense();
    }
  }, [isEdit, fetchExpense]);

  const handleSubmit = useCallback(async () => {
    if (!propertyId) return;

    // Validation
    if (!description.trim()) {
      Alert.alert('Uyarı', 'Açıklama alanı zorunludur.');
      return;
    }
    if (!amount.trim()) {
      Alert.alert('Uyarı', 'Tutar alanı zorunludur.');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Uyarı', 'Tarih alanı zorunludur.');
      return;
    }

    setSubmitting(true);
    console.debug('[expense-form] submitting...');

    try {
      // K012: append T00:00:00Z for UTC ISO format
      const dateISO = `${date.trim()}T00:00:00Z`;

      const payload: CreateExpenseRequest = {
        category,
        description: description.trim(),
        amount: parseFloat(amount),
        currency,
        date: dateISO,
        isRecurring,
        recurrenceInterval: isRecurring && recurrenceInterval.trim()
          ? recurrenceInterval.trim()
          : null,
        notes: notes.trim() || null,
      };

      if (isEdit && expenseId) {
        await updateExpense(propertyId, expenseId, payload as UpdateExpenseRequest);
      } else {
        await createExpense(propertyId, payload);
      }

      console.debug('[expense-form] saved');
      router.back();
    } catch (err) {
      console.error('[expense-form] error', err);
      Alert.alert('Hata', 'Gider kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }, [
    propertyId,
    expenseId,
    isEdit,
    category,
    description,
    amount,
    currency,
    date,
    isRecurring,
    recurrenceInterval,
    notes,
    router,
  ]);

  // ── Loading state (edit mode) ──
  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{ title: isEdit ? 'Gider Düzenle' : 'Yeni Gider' }}
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
        options={{ title: isEdit ? 'Gider Düzenle' : 'Yeni Gider' }}
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
          {/* ── Category ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Kategori</Text>
            <View style={styles.chipRow}>
              {categoryOptions.map((opt) => {
                const isSelected = category === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => setCategory(opt.value)}
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

          {/* ── Description ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Açıklama <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Gider açıklaması"
              placeholderTextColor={colors.textTertiary}
            />
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

          {/* ── Date ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Tarih <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-AA-GG"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* ── Recurring Toggle ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Tekrarlayan mı?</Text>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: colors.border, true: colors.accent + '80' }}
                thumbColor={isRecurring ? colors.accent : colors.surface}
              />
            </View>
          </View>

          {/* ── Recurrence Interval (shown only if recurring) ── */}
          {isRecurring && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tekrar Aralığı</Text>
              <TextInput
                style={styles.input}
                value={recurrenceInterval}
                onChangeText={setRecurrenceInterval}
                placeholder="Ör: Aylık, 3 Aylık"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          )}

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
                  {isEdit ? 'Kaydet' : 'Gider Ekle'}
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

  // Switch row
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
