import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ActionButton } from '@/components/action-button';
import { GlassCard } from '@/components/glass-card';
import { GuidanceReportContent } from '@/components/guidance-report-content';
import { ScreenShell } from '@/components/screen-shell';
import { Palette, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import { useAquaculture } from '@/state/aquaculture-store';

export default function GuidanceScreen() {
  const params = useLocalSearchParams<{ resultId?: string | string[] }>();
  const routeResultId = Array.isArray(params.resultId) ? params.resultId[0] : params.resultId;
  const { results, tanks } = useAquaculture();
  const result = results.find(
    (item) => item.id === routeResultId || item.aiResultId === routeResultId
  );
  const tank = result ? tanks.find((item) => item.id === result.tankId) : undefined;
  const aiResultId = result?.aiResultId ?? routeResultId;
  const unavailableMessage = getUnavailableMessage(routeResultId, result);
  const guideResultId = unavailableMessage ? undefined : aiResultId;
  const tankLabel = tank?.code ?? result?.tankId ?? '진단 결과';
  const groupLabel = tank?.groupName ?? tank?.groupId;

  return (
    <ScreenShell contentStyle={styles.content} gradient="detail" topInset={Space.xxl * 2}>
      <GlassCard emphasis="strong" style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text selectable style={styles.heroKicker}>
            {[tankLabel, groupLabel].filter(Boolean).join(' · ')}
          </Text>
          <Text accessibilityRole="header" selectable style={styles.heroTitle}>
            AI 현장 대응 보고서
          </Text>
          <Text selectable style={styles.heroBody}>
            저장된 진단 결과와 근거를 바탕으로 제안된 후속 조치예요.
          </Text>
        </View>
      </GlassCard>

      <GlassCard emphasis="strong" style={styles.reportCard}>
        <GuidanceReportContent
          aiResultId={guideResultId}
          unavailableMessage={unavailableMessage}
        />
      </GlassCard>

      <ActionButton
        label={AppCopy.common.close}
        onPress={() => router.back()}
        variant="secondary"
      />
    </ScreenShell>
  );
}

function getUnavailableMessage(
  routeResultId: string | undefined,
  result: ReturnType<typeof useAquaculture>['results'][number] | undefined
): string | undefined {
  if (!routeResultId) return '진단 결과 식별자가 없어 대응 보고서를 불러올 수 없어요.';
  if (!result) return undefined;
  if (result.status === 'pending') return '진단 분석과 저장이 완료된 뒤 대응 보고서를 확인할 수 있어요.';
  if (result.status === 'failed') return '진단에 실패해 대응 보고서가 생성되지 않았어요.';

  const isNormal = result.rawGrade ? result.rawGrade === 'normal' : result.grade === 'normal';
  if (isNormal) return '문제 없음 판정에는 별도 대응 보고서를 생성하지 않아요.';
  if (!result.aiResultId && !result.id) return '저장된 AI 진단 결과가 없어 대응 보고서를 불러올 수 없어요.';
  return undefined;
}

const styles = StyleSheet.create({
  content: {
    gap: Space.lg,
  },
  hero: {
    padding: Space.lg,
  },
  heroCopy: {
    gap: Space.sm,
  },
  heroKicker: {
    color: Palette.textSubtle,
    ...Type.label2,
  },
  heroTitle: {
    color: Palette.text,
    ...Type.heading1,
  },
  heroBody: {
    color: Palette.textMuted,
    ...Type.body2,
  },
  reportCard: {
    padding: Space.lg,
  },
});
