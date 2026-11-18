import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { darkColors, lightColors, type ColorTokens } from './tokens';

export * from './tokens';

export type ThemePreference = 'dark' | 'light' | 'system';
export type ThemeScheme = 'dark' | 'light';

type ThemeContextValue = {
  colors: ColorTokens;
  scheme: ThemeScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Dark by default (design-system.md). The preference is stored in
// `user_profile.theme`; the root navigator syncs it here once the database is open.
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('dark');

  // Native views (tab bar, alerts, pickers, sheets) follow the app's interface
  // style, not our tokens: override it so they match the chosen theme.
  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
  }, [preference]);

  const scheme: ThemeScheme =
    preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      preference,
      setPreference,
    }),
    [scheme, preference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const value = use(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside AppThemeProvider');
  return value;
}
