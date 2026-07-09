import { PropsWithChildren } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Palette, Radius, Shadow } from '@/constants/aqua-theme';

type GlassCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  emphasis?: 'regular' | 'strong';
}>;

// 웹에서는 실제 배경 블러, 네이티브는 반투명 흰 표면으로 프로스티드 글래스 표현
const webBlur =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as unknown as ViewStyle)
    : null;

export function GlassCard({ children, emphasis = 'regular', style }: GlassCardProps) {
  return (
    <View style={[styles.card, emphasis === 'strong' && styles.strong, webBlur, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.glass,
    borderColor: Palette.glassLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    ...Shadow.card,
  },
  strong: {
    backgroundColor: Palette.glassStrong,
  },
});
