import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Space } from '@/constants/aqua-theme';

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
    color: Palette.text,
    fontSize: 17,
    fontWeight: '900',
  },
  body: {
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.md,
    padding: Space.md,
  },
  footnote: {
    color: Palette.textSubtle,
    fontSize: 13,
    lineHeight: 18,
  },
});
