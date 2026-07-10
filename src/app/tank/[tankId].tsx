import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { GlassCard } from '@/components/glass-card';
import { ScreenShell } from '@/components/screen-shell';
import { StateChip } from '@/components/state-chip';
import { StatusBadge } from '@/components/status-badge';
import { FlounderMark } from '@/components/tank-decor';
import { Palette, Radius, Space } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import {
  formatDateTime,
  getGroupAlertSource,
  getTankGroupStatus,
  getTankResults,
} from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

// 수조 상세 — 수조 정보 + 점검 내역(카드 → 분석 결과)
export default function TankDetailScreen() {
  const { tankId } = useLocalSearchParams<{ tankId: string }>();
  const { tanks, results } = useAquaculture();
  const insets = useSafeAreaInsets();
  const tank = tanks.find((item) => item.id === tankId);
  const tankResults = getTankResults(results, tankId);
  const status = tank ? getTankGroupStatus(tanks, results, tank) : 'normal';
  const linkedSource = tank ? getGroupAlertSource(tanks, results, tank) : undefined;

  if (!tank) {
    return (
      <ScreenShell>
        <GlassCard style={styles.panel}>
          <Text selectable style={styles.panelTitle}>
            {AppCopy.tank.notFound}
          </Text>
          <ActionButton label={AppCopy.common.home} onPress={() => router.replace('/')} />
        </GlassCard>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell contentStyle={{ paddingTop: insets.top + 52 }}>
      {/* 수조 정보 헤더 */}
      <GlassCard emphasis="strong" style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text selectable style={styles.tankId}>
              {tank.id}
            </Text>
            <Text selectable style={styles.tankMeta}>
              {tank.groupId}
              {tank.active ? '' : AppCopy.tank.inactive}
            </Text>
          </View>
          <FlounderMark width={96} showLesion={status === 'suspicious'} />
        </View>
        <Text selectable style={styles.stocked}>
          {tank.stockedInfo}
        </Text>
        <View style={styles.headerBadgeRow}>
          <StatusBadge status={status} />
          {linkedSource && status !== 'suspicious' ? (
            <Text selectable style={styles.linked}>
              {AppCopy.tank.linkedWarning(linkedSource.id)}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <ActionButton
            label={AppCopy.tank.captureThis}
            icon="camera.fill"
            onPress={() => router.push({ pathname: '/camera', params: { tankId: tank.id } })}
            style={styles.grow}
          />
          <ActionButton
            label={AppCopy.tank.edit}
            icon="pencil"
            variant="secondary"
            size="compact"
            onPress={() => router.push({ pathname: '/add-tank', params: { editId: tank.id } })}
          />
        </View>
      </GlassCard>

      {/* 점검 내역 */}
      <Text selectable style={styles.sectionTitle}>
        {AppCopy.tank.history} {tankResults.length > 0 ? tankResults.length : ''}
      </Text>

      {tankResults.length === 0 ? (
        <GlassCard style={styles.empty}>
          <Text selectable style={styles.emptyBody}>
            {AppCopy.tank.emptyHistory}
          </Text>
        </GlassCard>
      ) : (
        <View style={styles.list}>
          {tankResults.map((result) => (
            <Pressable
              key={result.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/result/[resultId]', params: { resultId: result.id } })}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <GlassCard style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <Text selectable style={styles.recordDate}>
                    {formatDateTime(result.capturedAt)}
                  </Text>
                  {result.status === 'completed' ? (
                    <StatusBadge status={result.grade} compact binary />
                  ) : (
                    <StateChip status={result.status} />
                  )}
                </View>
                <Text selectable style={styles.recordSummary} numberOfLines={2}>
                  {result.status === 'completed'
                    ? result.evidenceSummary
                    : result.status === 'pending'
                      ? AppCopy.tank.pendingSummary
                      : result.evidenceSummary}
                </Text>
                {result.status === 'completed' && result.diseases.length > 0 ? (
                  <View style={styles.tagRow}>
                    {result.diseases.map((disease) => (
                      <View key={disease} style={styles.tag}>
                        <Text selectable style={styles.tagText}>
                          {disease}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </GlassCard>
            </Pressable>
          ))}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Space.md,
    padding: Space.lg,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.md,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  tankId: {
    color: Palette.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  tankMeta: {
    color: Palette.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  stocked: {
    color: Palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  headerBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.md,
  },
  linked: {
    color: Palette.caution,
    fontSize: 13,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  grow: {
    flex: 1,
  },
  sectionTitle: {
    color: 'rgba(20, 23, 30, 0.8)',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.36,
    marginLeft: 4,
    marginTop: Space.sm,
  },
  list: {
    gap: Space.md,
  },
  recordCard: {
    gap: Space.sm,
    padding: Space.lg,
  },
  recordTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordDate: {
    color: Palette.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  recordSummary: {
    color: Palette.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.xs,
  },
  tag: {
    backgroundColor: Palette.suspiciousBg,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: Palette.suspicious,
    fontSize: 12,
    fontWeight: '800',
  },
  empty: {
    padding: Space.xl,
  },
  emptyBody: {
    color: Palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    gap: Space.md,
    padding: Space.lg,
  },
  panelTitle: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
});
