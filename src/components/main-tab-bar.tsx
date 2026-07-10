import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette, Radius, Shadow, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';

const cameraImg = require('../../assets/images/home/camera.png');
const tabHomeImg = require('../../assets/images/home/tab-home.png');
const tabListImg = require('../../assets/images/home/tab-list.png');

const NAVIGATION_SIZE = Space.xxl + Space.xl;

const tabItems = {
  index: { icon: tabHomeImg, label: AppCopy.navigation.home },
  'tank-status': { icon: tabListImg, label: AppCopy.navigation.tankStatus },
} as const;

type MainTabRoute = {
  key: string;
  name: keyof typeof tabItems;
  params?: Readonly<Record<string, unknown>>;
};

const webBlur =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)' } as unknown as ViewStyle)
    : null;

export function MainTabBar({ descriptors, navigation, state }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const navigationBottom = Math.max(insets.bottom + Space.md - Space.xxs, Space.lg);

  return (
    <View style={[styles.root, { height: navigationBottom + NAVIGATION_SIZE }]}>
      <View style={[styles.tabBar, webBlur, { bottom: navigationBottom }]}>
        {state.routes.map((route: MainTabRoute, index: number) => {
          const tab = tabItems[route.name];
          if (!tab) return null;

          const focused = state.index === index;
          const options = descriptors[route.key]?.options;

          const onPress = () => {
            const event = navigation.emit({
              canPreventDefault: true,
              target: route.key,
              type: 'tabPress',
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ target: route.key, type: 'tabLongPress' });
          };

          return (
            <Pressable
              key={route.key}
              aria-selected={focused}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? tab.label}
              accessibilityRole="tab"
              onLongPress={onLongPress}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabItem,
                focused && styles.tabItemActive,
                pressed && styles.pressed,
              ]}
              testID={options?.tabBarButtonTestID}
            >
              <Image
                contentFit="contain"
                source={tab.icon}
                style={[styles.tabIcon, focused ? styles.tabIconActive : styles.tabIconInactive]}
              />
              <Text selectable={false} style={focused ? styles.tabLabelActive : styles.tabLabel}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityLabel={AppCopy.navigation.capture}
        accessibilityRole="button"
        onPress={() => router.push('/camera')}
        style={({ pressed }) => [
          styles.fab,
          webBlur,
          { bottom: navigationBottom },
          pressed && styles.fabPressed,
        ]}
      >
        <Image contentFit="contain" source={cameraImg} style={styles.fabIcon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.canvas,
    position: 'relative',
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: Palette.glass,
    borderColor: Palette.glassLine,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Space.xs,
    height: NAVIGATION_SIZE,
    left: Space.lg,
    paddingHorizontal: Space.xs,
    position: 'absolute',
    ...Shadow.navigation,
  },
  tabItem: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    gap: Space.xxs,
    height: 56,
    justifyContent: 'center',
    width: 80,
  },
  tabItemActive: {
    backgroundColor: Palette.white,
  },
  tabIcon: {
    height: 24,
    width: 24,
  },
  tabIconActive: {
    tintColor: Palette.ink,
  },
  tabIconInactive: {
    tintColor: Palette.textSubtle,
  },
  tabLabelActive: {
    color: Palette.ink,
    ...Type.label3,
  },
  tabLabel: {
    color: Palette.textSubtle,
    ...Type.label3,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: Palette.inkOverlay,
    borderColor: Palette.white,
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: NAVIGATION_SIZE,
    justifyContent: 'center',
    position: 'absolute',
    right: Space.lg,
    width: NAVIGATION_SIZE,
    ...Shadow.navigation,
  },
  fabIcon: {
    height: 28,
    tintColor: Palette.white,
    width: 28,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  pressed: {
    opacity: 0.85,
  },
});
