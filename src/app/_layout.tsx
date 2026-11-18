import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ToastHost } from '@/components/toast';
import { DatabaseGate } from '@/db/provider';
import { getAthlete } from '@/db/queries/profile';
import { useDbQuery } from '@/db/use-db-version';
import { restoreSession } from '@/features/timer/store';
import { AppThemeProvider, typography, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });
  if (!fontsLoaded && fontError == null) return null;

  return (
    <AppThemeProvider>
      <DatabaseGate fallback={(error) => <DatabaseError error={error} />}>
        <RootNavigator />
      </DatabaseGate>
    </AppThemeProvider>
  );
}

/** Hides the splash screen once the first real screen is mounted. */
function useHideSplash() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
}

function DatabaseError({ error }: { error: Error }) {
  useHideSplash();
  return (
    <Screen>
      <EmptyState title="Could not open your data" text={error.message} />
    </Screen>
  );
}

function RootNavigator() {
  useHideSplash();
  // Brings back a timer that was running when the app was closed.
  useEffect(() => restoreSession(), []);
  const { colors, scheme } = useTheme();
  // Until the athlete profile exists, onboarding is the only reachable screen.
  const onboarded = useDbQuery(() => getAthlete() != null, 'athlete');
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.bg,
      card: colors.bg,
      text: colors.textPrimary,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: colors.accentText,
          headerTitleStyle: { fontFamily: typography.title3.fontFamily, color: colors.textPrimary },
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="session/[scheduledSessionId]" options={{ title: 'Session' }} />
          <Stack.Screen name="workout/[workoutId]" options={{ title: 'Free session' }} />
          <Stack.Screen
            name="log/[exerciseLogId]"
            options={{ presentation: 'fullScreenModal', headerShown: false }}
          />
          <Stack.Screen name="program/[programId]/index" options={{ title: 'Program' }} />
          <Stack.Screen name="program/[programId]/edit" options={{ title: 'Edit program' }} />
          <Stack.Screen name="program/[programId]/grid" options={{ title: 'Grid view' }} />
          <Stack.Screen name="exercise/[exerciseId]" options={{ title: 'Exercise' }} />
          {/* The sheet draws its own header: the native one overlaps the content in a page sheet. */}
          <Stack.Screen name="add-exercise" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack.Protected>
      </Stack>
      <ToastHost />
    </ThemeProvider>
  );
}
