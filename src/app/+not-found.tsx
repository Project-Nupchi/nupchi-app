import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ScreenShell } from '@/components/screen-shell';
import { Palette, Radius, Space } from '@/constants/aqua-theme';

export default function NotFoundScreen() {
  return (
    <ScreenShell>
      <View style={styles.panel}>
        <Text selectable style={styles.title}>
          화면을 찾을 수 없습니다
        </Text>
        <Text selectable style={styles.body}>
          요청한 경로가 앱의 수조 점검 흐름에 없습니다.
        </Text>
        <ActionButton label="수조 목록으로" icon="list.bullet" onPress={() => router.replace('/')} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.md,
    padding: Space.lg,
  },
  title: {
    color: Palette.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  body: {
    color: Palette.textMuted,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
});
