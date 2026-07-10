import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/glass-card';
import { Palette, Space } from '@/constants/aqua-theme';

type SectionProps = PropsWithChildren<{
  title?: string;
  footnote?: string;
}>;

export function Section({ title, footnote, children }: SectionProps) {
  return (
    <View style={styles.wrap}>
      {title ? (
        <Text selectable style={styles.title}>
          {title}
        </Text>
      ) : null}
      <GlassCard style={styles.body}>{children}</GlassCard>
      {footnote ? (
        <Text selectable style={styles.footnote}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Space.sm,
  },
  title: {
    color: 'rgba(20, 23, 30, 0.8)',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.36,
    marginLeft: 4,
  },
  body: {
    gap: Space.md,
    padding: Space.lg,
  },
  footnote: {
    color: Palette.onGradientMuted,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 4,
  },
});
