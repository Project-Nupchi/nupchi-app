import { PropsWithChildren } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FigmaTokens, Gradient, Palette, Space } from '@/constants/aqua-theme';

type ScreenShellProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  gradient?: 'default' | 'detail';
  topInset?: number;
  // 하단 FAB 등 스크롤 위에 겹치는 요소가 있을 때 여백 확보
  bottomInset?: number;
}>;

// 물빛 그라디언트 배경 위에 콘텐츠를 스크롤로 얹는 공용 셸
export function ScreenShell({
  children,
  contentStyle,
  gradient = 'default',
  topInset = Space.lg,
  bottomInset = 48,
}: ScreenShellProps) {
  const colors = gradient === 'detail' ? Gradient.detailColors : Gradient.colors;
  const locations = gradient === 'detail' ? Gradient.detailLocations : Gradient.locations;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...colors]}
        locations={[...locations]}
        style={StyleSheet.absoluteFill}
      />
      {gradient === 'detail' ? (
        <LinearGradient
          colors={[FigmaTokens.color.white[0], Palette.white]}
          locations={[0, 1]}
          style={styles.detailFade}
        />
      ) : null}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset, paddingTop: topInset }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.canvas,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: Space.lg,
    paddingHorizontal: Space.lg,
  },
  detailFade: {
    bottom: 0,
    height: '56%',
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
  },
});
