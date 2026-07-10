import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Palette } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import { AquacultureProvider, useAquaculture } from '@/state/aquaculture-store';

// 물빛 그라디언트 배경 위에서 헤더는 투명하게 띄운다
const tideTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent',
    text: Palette.onGradient,
    primary: Palette.onGradient,
    border: 'transparent',
  },
};

export default function RootLayout() {
  return (
    <AquacultureProvider>
      <RootNavigator />
    </AquacultureProvider>
  );
}

function RootNavigator() {
  const { session } = useAquaculture();

  return (
    <ThemeProvider value={tideTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerShadowVisible: false,
          headerTintColor: Palette.onGradient,
          headerTitleStyle: { color: Palette.onGradient, fontWeight: '800' },
          contentStyle: { backgroundColor: Palette.canvas },
        }}
      >
        <Stack.Protected guard={session.isLoggedIn}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="tank-status" options={{ headerShown: false }} />
          <Stack.Screen name="tank/[tankId]" options={{ title: '' }} />
          <Stack.Screen name="camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="result/[resultId]" options={{ title: AppCopy.navigation.result }} />
          <Stack.Screen name="guidance/[resultId]" options={{ title: AppCopy.navigation.guidance }} />
          <Stack.Screen
            name="add-tank"
            options={{
              title: AppCopy.navigation.addTank,
              presentation: 'formSheet',
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.6, 0.95],
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!session.isLoggedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
