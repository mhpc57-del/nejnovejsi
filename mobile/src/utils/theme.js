export const COLORS = {
  primary: '#f97316',
  primaryDark: '#ea580c',
  primaryLight: '#fff7ed',
  primaryGlow: 'rgba(249,115,22,0.15)',
  white: '#ffffff',
  black: '#09090b',
  bg: '#fafaf9',
  card: '#ffffff',
  gray50: '#fafaf9',
  gray100: '#f4f4f5',
  gray200: '#e4e4e7',
  gray300: '#d4d4d8',
  gray400: '#a1a1aa',
  gray500: '#71717a',
  gray600: '#52525b',
  gray700: '#3f3f46',
  gray800: '#27272a',
  gray900: '#18181b',
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green500: '#22c55e',
  green700: '#15803d',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red500: '#ef4444',
  red700: '#b91c1c',
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue500: '#3b82f6',
  blue700: '#1d4ed8',
  purple50: '#faf5ff',
  purple100: '#f3e8ff',
  purple500: '#a855f7',
  purple700: '#7e22ce',
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber500: '#f59e0b',
  amber700: '#b45309',
  orange50: '#fff7ed',
  orange100: '#ffedd5',
  orange500: '#f97316',
  yellow500: '#eab308',
};

export const SHADOWS = {
  sm: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  md: { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  lg: { elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16 },
  glow: { elevation: 6, shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
};

export const FONTS = {
  regular: { fontSize: 14, color: COLORS.gray900 },
  medium: { fontSize: 14, fontWeight: '500', color: COLORS.gray900 },
  semibold: { fontSize: 14, fontWeight: '600', color: COLORS.gray900 },
  bold: { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  h1: { fontSize: 26, fontWeight: '700', color: COLORS.gray900, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: '600', color: COLORS.gray900 },
  small: { fontSize: 12, color: COLORS.gray500 },
  caption: { fontSize: 11, color: COLORS.gray500, letterSpacing: 0.3 },
};

export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 24, full: 999 };

export const STATUS_COLORS = {
  open: { bg: COLORS.green50, text: COLORS.green700, label: 'Otevřená', icon: 'radio-button-on' },
  in_progress: { bg: COLORS.blue50, text: COLORS.blue700, label: 'Probíhá', icon: 'time-outline' },
  pending_completion: { bg: COLORS.purple50, text: COLORS.purple700, label: 'K potvrzení', icon: 'hourglass-outline' },
  dispute: { bg: COLORS.amber50, text: COLORS.amber700, label: 'V řešení', icon: 'warning-outline' },
  completed: { bg: COLORS.gray100, text: COLORS.gray700, label: 'Dokončeno', icon: 'checkmark-circle-outline' },
  cancelled: { bg: COLORS.red50, text: COLORS.red700, label: 'Zrušeno', icon: 'close-circle-outline' },
};

export const DEMAND_TABS_CUSTOMER = [
  { key: 'verified', label: 'Ověřené', color: COLORS.green500, icon: 'shield-checkmark-outline' },
  { key: 'unverified', label: 'Neověřené', color: COLORS.orange500, icon: 'alert-circle-outline' },
  { key: 'in_progress', label: 'Probíhající', color: COLORS.blue500, icon: 'time-outline' },
  { key: 'pending_completion', label: 'K potvrzení', color: COLORS.purple500, icon: 'hourglass-outline' },
  { key: 'dispute', label: 'V řešení', color: COLORS.amber500, icon: 'warning-outline' },
  { key: 'completed', label: 'Dokončené', color: COLORS.gray500, icon: 'checkmark-circle-outline' },
  { key: 'cancelled', label: 'Nedokončené', color: COLORS.red500, icon: 'close-circle-outline' },
];

export const DEMAND_TABS_SUPPLIER = [
  { key: 'available_verified', label: 'Ověřené', color: COLORS.green500, icon: 'shield-checkmark-outline' },
  { key: 'available_unverified', label: 'Neověřené', color: COLORS.orange500, icon: 'alert-circle-outline' },
  { key: 'in_progress', label: 'Rozdělané', color: COLORS.blue500, icon: 'time-outline' },
  { key: 'pending_completion', label: 'K potvrzení', color: COLORS.purple500, icon: 'hourglass-outline' },
  { key: 'dispute', label: 'V řešení', color: COLORS.amber500, icon: 'warning-outline' },
  { key: 'completed', label: 'Dokončené', color: COLORS.gray500, icon: 'checkmark-circle-outline' },
  { key: 'cancelled', label: 'Nedokončené', color: COLORS.red500, icon: 'close-circle-outline' },
];
