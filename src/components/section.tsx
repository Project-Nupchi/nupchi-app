import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Shadow, Space } from '@/constants/aqua-theme';

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
      <View style={styles.body}>{children}</View>
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
    color: Palette.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  body: {
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.md,
    padding: Space.lg,
    ...Shadow.card,
  },
  footnote: {
    color: Palette.textSubtle,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 2,
  },
});
