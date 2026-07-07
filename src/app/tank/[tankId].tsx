import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { PhotoAnalysisStage } from '@/components/photo-analysis-stage';
import { ScreenShell } from '@/components/screen-shell';
import { Section } from '@/components/section';
import { StatusBadge } from '@/components/status-badge';
import { Palette, Radius, Space } from '@/constants/aqua-theme';
import {
  formatDateTime,
  getCurrentStatus,
  getGroupAlertSource,
  getTankGroupStatus,
  getTankResults,
  statusLabel,
} from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

export default function TankHistoryScreen() {
  const { tankId } = useLocalSearchParams<{ tankId: string }>();
  const { tanks, results } = useAquaculture();
  const tank = tanks.find((item) => item.id === tankId);
  const tankResults = getTankResults(results, tankId);
  const currentStatus = tank ? getTankGroupStatus(tanks, results, tank) : getCurrentStatus(results, tankId);
  const groupAlertSource = tank ? getGroupAlertSource(tanks, results, tank) : undefined;
  const activeAlert = tankResults.find((result) => result.grade === 'suspicious');
  const trend = tankResults.slice(0, 5).reverse();

  if (!tank) {
    return (
      <ScreenShell>
        <View style={styles.empty}>
          <Text selectable style={styles.emptyTitle}>
            수조를 찾을 수 없습니다
          </Text>
          <ActionButton label="목록으로" icon="list.bullet" onPress={() => router.replace('/')} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={styles.headerPanel}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text selectable style={styles.tankId}>
              {tank.id}
            </Text>
            <Text selectable style={styles.groupId}>
              {tank.groupId} · 광어 전용
            </Text>
            <Text selectable style={styles.stockedInfo}>
              {tank.stockedInfo}
            </Text>
          </View>
          <StatusBadge status={currentStatus} />
        </View>
        <ActionButton
          label="이 수조 촬영"
          icon="camera.fill"
          onPress={() => router.push({ pathname: '/capture', params: { tankId } })}
        />
      </View>

      {activeAlert ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/result/[resultId]', params: { resultId: activeAlert.id } })
          }
          style={({ pressed }) => [styles.alert, pressed && styles.pressed]}
        >
          <Text selectable style={styles.alertTitle}>
            활성 경보: {statusLabel[activeAlert.grade]}
          </Text>
          <Text selectable style={styles.alertBody}>
            {activeAlert.evidenceSummary}
          </Text>
          <Text selectable style={styles.alertLink}>
            병변 박스와 등급 근거 보기
          </Text>
        </Pressable>
      ) : null}

      {!activeAlert && groupAlertSource ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/tank/[tankId]', params: { tankId: groupAlertSource.id } })
          }
          style={({ pressed }) => [styles.groupAlert, pressed && styles.pressed]}
        >
          <Text selectable style={styles.groupAlertTitle}>
            계통 주의: {groupAlertSource.id}에서 의심 경보
          </Text>
          <Text selectable style={styles.alertBody}>
            같은 {tank.groupId} 취수·배수 계통을 공유합니다. 이 수조는 직접 의심 판정은 아니지만 재촬영과 관찰 우선순위를 올렸습니다.
          </Text>
          <Text selectable style={styles.groupAlertLink}>
            경보 수조 보기
          </Text>
        </Pressable>
      ) : null}

      <Section title="등급 추세">
        {trend.length === 0 ? (
          <Text selectable style={styles.muted}>
            기록이 쌓이면 광어 수조 단위의 유병 신호 흐름이 표시됩니다.
          </Text>
        ) : (
          <View style={styles.trendRow}>
            {trend.map((result) => (
              <View key={result.id} style={styles.trendItem}>
                <View style={[styles.trendDot, trendDotStyle(result.grade)]} />
                <Text selectable style={styles.trendLabel}>
                  {statusLabel[result.grade]}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title="사진·등급 타임라인">
        {tankResults.length === 0 ? (
          <View style={styles.emptyInline}>
            <Text selectable style={styles.emptyTitle}>
              아직 기록이 없습니다
            </Text>
            <Text selectable style={styles.muted}>
              첫 촬영을 완료하면 광어 사진, AI 점검 결과, 수조군 경보 근거가 이력에 쌓입니다.
            </Text>
            <ActionButton
              label="촬영 시작"
              icon="camera"
              onPress={() => router.push({ pathname: '/capture', params: { tankId } })}
            />
          </View>
        ) : (
          tankResults.map((result) => (
            <Pressable
              key={result.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/result/[resultId]', params: { resultId: result.id } })
              }
              style={({ pressed }) => [styles.timelineItem, pressed && styles.pressed]}
            >
              <PhotoAnalysisStage result={result} />
              <View style={styles.timelineText}>
                <Text selectable style={styles.timelineDate}>
                  {formatDateTime(result.capturedAt)}
                </Text>
                <StatusBadge status={result.grade} compact />
                <Text selectable style={styles.muted}>
                  {result.evidenceSummary || '판정 대기 중'}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </Section>
    </ScreenShell>
  );
}

function trendDotStyle(status: 'normal' | 'caution' | 'suspicious') {
  if (status === 'suspicious') return { backgroundColor: Palette.suspicious };
  if (status === 'caution') return { backgroundColor: Palette.caution };
  return { backgroundColor: Palette.normal };
}

const styles = StyleSheet.create({
  headerPanel: {
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.lg,
    padding: Space.lg,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Space.md,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 5,
  },
  tankId: {
    color: Palette.text,
    fontSize: 30,
    fontWeight: '900',
  },
  stockedInfo: {
    color: Palette.textMuted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  groupId: {
    color: Palette.accent,
    fontSize: 14,
    fontWeight: '900',
  },
  alert: {
    backgroundColor: Palette.suspiciousBg,
    borderColor: '#F1B1AC',
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 8,
    padding: Space.lg,
  },
  alertTitle: {
    color: Palette.suspicious,
    fontSize: 18,
    fontWeight: '900',
  },
  alertBody: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  alertLink: {
    color: Palette.suspicious,
    fontSize: 14,
    fontWeight: '900',
  },
  groupAlert: {
    backgroundColor: Palette.cautionBg,
    borderColor: '#E9C078',
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 8,
    padding: Space.lg,
  },
  groupAlertTitle: {
    color: Palette.caution,
    fontSize: 18,
    fontWeight: '900',
  },
  groupAlertLink: {
    color: Palette.caution,
    fontSize: 14,
    fontWeight: '900',
  },
  trendRow: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  trendDot: {
    height: 12,
    width: '100%',
    borderRadius: Radius.pill,
  },
  trendLabel: {
    color: Palette.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  timelineItem: {
    borderBottomColor: Palette.line,
    borderBottomWidth: 1,
    gap: Space.md,
    paddingBottom: Space.md,
  },
  timelineText: {
    gap: Space.sm,
  },
  timelineDate: {
    color: Palette.text,
    fontSize: 17,
    fontWeight: '900',
  },
  muted: {
    color: Palette.textMuted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  empty: {
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.md,
    padding: Space.lg,
  },
  emptyInline: {
    gap: Space.md,
  },
  emptyTitle: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.8,
  },
});
