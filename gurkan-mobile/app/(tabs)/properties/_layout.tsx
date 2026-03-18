import { Stack } from 'expo-router';
import { colors, typography, shadows } from '@/src/theme';

/**
 * Stack navigator wrapping the Properties tab.
 * - `index` → Property list ("Mülkler")
 * - `[id]`  → Property detail (title set dynamically by the detail screen)
 * - Sub-page screens for property management (tenants, rentals, expenses, bills, documents)
 */
export default function PropertiesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          ...shadows.sm,
        } as any,
        headerTitleStyle: {
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.size.subtitle,
          color: colors.textPrimary,
        },
        headerTintColor: colors.accent,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Mülkler' }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          // Title is set dynamically by the detail screen via <Stack.Screen options={{}} />
          title: '',
        }}
      />
      {/* ── Sub-page screens ── */}
      <Stack.Screen
        name="tenants"
        options={{ title: 'Kiracılar' }}
      />
      <Stack.Screen
        name="tenant-detail"
        options={{ title: 'Kiracı Detay' }}
      />
      <Stack.Screen
        name="tenant-form"
        options={{ title: 'Kiracı Formu' }}
      />
      <Stack.Screen
        name="short-term-rentals"
        options={{ title: 'Kısa Dönem Kiralamalar' }}
      />
      <Stack.Screen
        name="short-term-rental-form"
        options={{ title: 'Kısa Dönem Formu' }}
      />
      <Stack.Screen
        name="expenses"
        options={{ title: 'Giderler' }}
      />
      <Stack.Screen
        name="expense-form"
        options={{ title: 'Gider Formu' }}
      />
      <Stack.Screen
        name="bills"
        options={{ title: 'Faturalar' }}
      />
      <Stack.Screen
        name="bill-form"
        options={{ title: 'Fatura Formu' }}
      />
      <Stack.Screen
        name="documents"
        options={{ title: 'Dökümanlar' }}
      />
    </Stack>
  );
}
