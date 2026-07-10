import TopTabs from 'expo-router/js-top-tabs';

import { MainTabBar } from '@/components/main-tab-bar';
import { Palette } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';

export default function MainTabsLayout() {
  return (
    <TopTabs
      backBehavior="initialRoute"
      initialRouteName="index"
      screenOptions={{
        animationEnabled: true,
        lazy: false,
        sceneStyle: { backgroundColor: Palette.canvas },
        swipeEnabled: true,
      }}
      tabBar={MainTabBar}
      tabBarPosition="bottom"
    >
      <TopTabs.Screen name="index" options={{ title: AppCopy.navigation.home }} />
      <TopTabs.Screen name="tank-status" options={{ title: AppCopy.navigation.tankStatus }} />
    </TopTabs>
  );
}
