import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { GlassCard } from '@/components/glass-card';
import { ScreenShell } from '@/components/screen-shell';
import { Palette, Space } from '@/constants/aqua-theme';

export default function NotFoundScreen() {
  return (
    <ScreenShell contentStyle={styles.content}>
      <GlassCard style={styles.panel}>
        <Text selectable style={styles.title}>
          화면을 찾을 수 없습니다
        </Text>
        <Text selectable style={styles.body}>
          요청한 경로가 앱의 수조 점검 흐름에 없습니다.
        </Text>
        <ActionButton label="홈으로" icon="house" onPress={() => router.replace('/')} />
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
