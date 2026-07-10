import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { GlassCard } from '@/components/glass-card';
import { ScreenShell } from '@/components/screen-shell';
import { Palette, Space } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';

export default function NotFoundScreen() {
  return (
    <ScreenShell contentStyle={styles.content}>
      <GlassCard style={styles.panel}>
        <Text selectable style={styles.title}>
          {AppCopy.notFound.title}
        </Text>
        <Text selectable style={styles.body}>
          {AppCopy.notFound.body}
        </Text>
        <ActionButton label={AppCopy.common.home} icon="house" onPress={() => router.replace('/')} />
      </GlassCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 80,
  },
  panel: {
    gap: Space.md,
    padding: Space.lg,
  },
  title: {
    color: Palette.text,
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    color: Palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
