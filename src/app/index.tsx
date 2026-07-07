import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ActionButton } from '@/components/action-button';
import { ScreenShell } from '@/components/screen-shell';
import { StatusBadge } from '@/components/status-badge';
import { Palette, Radius, Space } from '@/constants/aqua-theme';
import {
  formatDateTime,
  getCurrentStatus,
  getGroupAlertSource,
  getLatestResult,
  getTankGroupStatus,
  sortTanksByRisk,
  statusLabel,
} from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

export default function HomeScreen() {
  const { tanks, results } = useAquaculture();
  const sortedTanks = useMemo(() => sortTanksByRisk(tanks, results), [results, tanks]);
  const firstTankId = sortedTanks[0]?.id;
  const suspiciousCount = sortedTanks.filter((tank) => getCurrentStatus(results, tank.id) === 'suspicious').length;
  const groupWatchCount = sortedTanks.filter(
    (tank) => getCurrentStatus(results, tank.id) === 'normal' && getTankGroupStatus(tanks, results, tank) === 'caution'
  ).length;

  return (
    <ScreenShell>
      <View style={styles.summaryBand}>
        <View style={styles.summaryText}>
          <Text selectable style={styles.kicker}>
            오늘의 우선 점검
          </Text>
          <Text selectable style={styles.summaryTitle}>
            {suspiciousCount > 0 ? `의심 수조 ${suspiciousCount}개` : '의심 수조 없음'}
          </Text>
          <Text selectable style={styles.summaryBody}>
            광어 수조만 관리합니다. 의심 수조와 같은 취수·배수 계통의 수조를 함께 상단에 올렸습니다.
          </Text>
        </View>
        <ActionButton
          label="촬영"
          icon="camera.fill"
          disabled={!firstTankId}
          onPress={() => router.push({ pathname: '/capture', params: { tankId: firstTankId } })}
        />
      </View>

      <View style={styles.toolbar}>
        <Text selectable style={styles.toolbarTitle}>
          광어 수조 {tanks.length} · 계통 주의 {groupWatchCount}
        </Text>
        <ActionButton
          label="수조 추가"
          icon="plus"
          variant="secondary"
          onPress={() => router.push('/add-tank')}
          style={styles.addButton}
        />
      </View>

      {sortedTanks.length === 0 ? (
        <View style={styles.empty}>
          <Text selectable style={styles.emptyTitle}>
            아직 수조가 없습니다
          </Text>
          <Text selectable style={styles.emptyBody}>
            수조 ID, 수조군, 광어 입식 정보를 추가하면 목록에서 상태를 바로 확인할 수 있습니다.
          </Text>
          <ActionButton label="수조 추가" icon="plus" onPress={() => router.push('/add-tank')} />
        </View>
      ) : (
        <View style={styles.list}>
          {sortedTanks.map((tank) => {
            const directStatus = getCurrentStatus(results, tank.id);
            const status = getTankGroupStatus(tanks, results, tank);
            const groupAlertSource = getGroupAlertSource(tanks, results, tank);
            const latest = getLatestResult(results, tank.id);

            return (
              <View
                key={tank.id}
                style={styles.card}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/tank/[tankId]', params: { tankId: tank.id } })}
                  style={({ pressed }) => [styles.cardTapArea, pressed && styles.cardPressed]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardIdentity}>
                      <Text selectable style={styles.tankId}>
                        {tank.id}
                      </Text>
                      <Text selectable style={styles.groupId}>
                        {tank.groupId}
                      </Text>
                      <Text selectable style={styles.stockedInfo}>
                        {tank.stockedInfo}
                      </Text>
                    </View>
                    <StatusBadge status={status} />
                  </View>

                  <View style={styles.cardMeta}>
                    <Text selectable style={styles.metaText}>
                      최근 촬영 {latest ? formatDateTime(latest.capturedAt) : '기록 없음'}
                    </Text>
                    <Text selectable style={[styles.metaText, status !== 'normal' && styles.dangerText]}>
                      {groupAlertSource
                        ? `${groupAlertSource.id} 경보로 계통 주의`
                        : directStatus === 'suspicious'
                          ? '근거 확인 필요'
                          : `${statusLabel[directStatus]} 추적 중`}
                    </Text>
                  </View>
                </Pressable>

                <ActionButton
                  label="이 수조 촬영"
                  icon="camera"
                  variant={directStatus === 'suspicious' ? 'danger' : 'secondary'}
                  onPress={() => router.push({ pathname: '/capture', params: { tankId: tank.id } })}
                />
              </View>
            );
          })}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  summaryBand: {
    backgroundColor: Palette.black,
    borderRadius: Radius.card,
    padding: Space.lg,
    gap: Space.lg,
  },
  summaryText: {
    gap: Space.xs,
  },
  kicker: {
    color: '#9FD8CF',
    fontSize: 13,
    fontWeight: '900',
  },
  summaryTitle: {
    color: Palette.white,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  summaryBody: {
    color: '#C9D8D5',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Space.md,
  },
  toolbarTitle: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '900',
  },
  addButton: {
    minHeight: 44,
  },
  list: {
    gap: Space.md,
  },
  card: {
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.md,
    padding: Space.md,
  },
  cardTapArea: {
    gap: Space.md,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Space.md,
    justifyContent: 'space-between',
  },
  cardIdentity: {
    flex: 1,
    gap: 4,
  },
  tankId: {
    color: Palette.text,
    fontSize: 25,
    fontWeight: '900',
  },
  stockedInfo: {
    color: Palette.textMuted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  groupId: {
    color: Palette.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  cardMeta: {
    borderTopColor: Palette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Space.md,
    paddingTop: Space.md,
  },
  metaText: {
    color: Palette.textMuted,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  dangerText: {
    color: Palette.suspicious,
    textAlign: 'right',
  },
  empty: {
    alignItems: 'stretch',
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.md,
    padding: Space.xl,
  },
  emptyTitle: {
    color: Palette.text,
    fontSize: 22,
    fontWeight: '900',
  },
  emptyBody: {
    color: Palette.textMuted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
});
