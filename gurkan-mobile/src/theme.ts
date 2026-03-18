/**
 * Gürkan Mobile — Design Tokens
 *
 * Matches the web UI palette & spacing for cross-platform consistency.
 */

export const colors = {
  /** Brand terracotta accent */
  accent: '#c4653a',
  accentLight: '#d4845f',
  accentDark: '#a3512e',

  /** Backgrounds */
  background: '#faf9f7',
  surface: '#ffffff',
  surfaceElevated: '#f5f3ef',

  /** Text */
  textPrimary: '#2d2926',
  textSecondary: '#6b655e',
  textTertiary: '#9e978e',
  textInverse: '#ffffff',

  /** Semantic */
  success: '#2d8a4e',
  successLight: '#e8f5e9',
  warning: '#d4890a',
  warningLight: '#fff8e1',
  critical: '#c62828',
  criticalLight: '#ffebee',
  info: '#1565c0',
  infoLight: '#e3f2fd',

  /** Borders & dividers */
  border: '#e4e0da',
  borderLight: '#f0ede8',

  /** Overlays */
  overlay: 'rgba(45, 41, 38, 0.5)',
} as const;

export const typography = {
  fontFamily: {
    regular: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    semiBold: 'DMSans_600SemiBold',
    bold: 'DMSans_700Bold',
  },
  size: {
    title: 28,
    subtitle: 20,
    body: 16,
    bodySmall: 14,
    caption: 12,
    label: 11,
  },
  lineHeight: {
    title: 36,
    subtitle: 28,
    body: 24,
    bodySmall: 20,
    caption: 16,
    label: 14,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#2d2926',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#2d2926',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#2d2926',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

const theme = { colors, typography, spacing, borderRadius, shadows } as const;

export default theme;
