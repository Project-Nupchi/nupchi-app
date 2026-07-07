import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';

import { Palette, Space } from '@/constants/aqua-theme';

type ScreenShellProps = PropsWithChildren<{
  contentStyle?: ViewStyle;
}>;

export function ScreenShell({ children, contentStyle }: ScreenShellProps) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.root}
      contentContainerStyle={[styles.content, contentStyle]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  content: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
    paddingBottom: 42,
    gap: Space.lg,
  },
});
