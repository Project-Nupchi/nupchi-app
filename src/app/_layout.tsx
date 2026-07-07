import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Palette } from '@/constants/aqua-theme';
import { AquacultureProvider } from '@/state/aquaculture-store';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <AquacultureProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerLargeTitle: true,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Palette.canvas },
            contentStyle: { backgroundColor: Palette.canvas },
          }}
        >
          <Stack.Screen name="index" options={{ title: '수조 목록' }} />
          <Stack.Screen name="tank/[tankId]" options={{ title: '수조 이력' }} />
          <Stack.Screen name="capture" options={{ headerShown: false }} />
          <Stack.Screen name="result/[resultId]" options={{ title: '점검 결과' }} />
          <Stack.Screen name="guidance/[resultId]" options={{ title: '대응·신고 안내' }} />
          <Stack.Screen
            name="add-tank"
            options={{
              title: '수조 추가',
              presentation: 'formSheet',
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.48, 0.82],
              contentStyle: { backgroundColor: Palette.canvas },
            }}
          />
        </Stack>
      </ThemeProvider>
    </AquacultureProvider>
  );
}
