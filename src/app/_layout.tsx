import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ChevronBackButton } from '@/components/chevron-back-button';
import { Palette, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import { AquacultureProvider } from '@/state/aquaculture-store';

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
  return (
    <ThemeProvider value={tideTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={({ navigation }) => ({
          headerTransparent: true,
          headerShadowVisible: false,
          headerTintColor: Palette.onGradient,
          headerLeft: ({ canGoBack, tintColor }) =>
            canGoBack ? (
              <ChevronBackButton
                color={tintColor ?? Palette.onGradient}
                onPress={() => navigation.goBack()}
              />
            ) : null,
          headerTitleAlign: 'center',
          headerTitleStyle: { color: Palette.onGradient, ...Type.title },
          contentStyle: { backgroundColor: Palette.canvas },
        })}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: AppCopy.navigation.home }} />
        <Stack.Screen name="tank/[tankId]" options={{ title: AppCopy.navigation.tankInfo }} />
        <Stack.Screen name="camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="result/[resultId]" options={{ title: AppCopy.navigation.result }} />
        <Stack.Screen name="guidance/[resultId]" options={{ title: AppCopy.navigation.guidance }} />
        <Stack.Screen
          name="add-tank"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
