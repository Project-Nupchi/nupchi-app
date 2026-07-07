import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ActionButton } from '@/components/action-button';
import { ScreenShell } from '@/components/screen-shell';
import { StatusBadge } from '@/components/status-badge';
import { Palette, Radius, Shadow, Space } from '@/constants/aqua-theme';
import {
  formatDateTime,
  getCurrentStatus,
  getGroupAlertSource,
  getLatestResult,
  getTankGroupStatus,
  sortTanksByRisk,
  statusLabel,
  TankStatus,
} from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

const railColors: Record<TankStatus, string> = {
  normal: 'transparent',
  caution: Palette.caution,
  suspicious: Palette.suspicious,
};

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
        <View pointerEvents="none" style={styles.heroGlowLarge} />
        <View pointerEvents="none" style={styles.heroGlowSmall} />
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

        <View style={styles.statRow}>
          <HeroStat value={tanks.length} label="광어 수조" />
          <View style={styles.statDivider} />
          <HeroStat value={suspiciousCount} label="의심" tone={suspiciousCount > 0 ? 'danger' : undefined} />
          <View style={styles.statDivider} />
          <HeroStat value={groupWatchCount} label="계통 주의" tone={groupWatchCount > 0 ? 'caution' : undefined} />
        </View>

        <ActionButton
          label="바로 촬영"
          icon="camera.fill"
          disabled={!firstTankId}
          onPress={() => router.push({ pathname: '/capture', params: { tankId: firstTankId } })}
        />
      </View>

      <View style={styles.toolbar}>
        <Text selectable style={styles.toolbarTitle}>
          전체 수조
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
              <View key={tank.id} style={[styles.card, status === 'suspicious' && styles.cardSuspicious]}>
                <View style={[styles.statusRail, { backgroundColor: railColors[status] }]} />
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

function HeroStat({ value, label, tone }: { value: number; label: string; tone?: 'danger' | 'caution' }) {
  return (
    <View style={styles.stat}>
      <Text selectable style={[styles.statValue, tone === 'danger' && styles.statDanger, tone === 'caution' && styles.statCaution]}>
        {value}
      </Text>
      <Text selectable style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryBand: {
    backgroundColor: Palette.ink,
    borderRadius: Radius.card,
    overflow: 'hidden',
    padding: Space.xl,
    gap: Space.lg,
    ...Shadow.raised,
  },
  heroGlowLarge: {
    backgroundColor: 'rgba(143, 216, 203, 0.07)',
    borderRadius: Radius.pill,
    height: 260,
    position: 'absolute',
    right: -90,
    top: -120,
    width: 260,
  },
  heroGlowSmall: {
    backgroundColor: 'rgba(143, 216, 203, 0.05)',
    borderRadius: Radius.pill,
    bottom: -70,
    height: 170,
    left: -60,
    position: 'absolute',
    width: 170,
  },
  summaryText: {
    gap: Space.xs,
  },
  kicker: {
    color: Palette.inkMint,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  summaryTitle: {
    color: Palette.white,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 37,
  },
  summaryBody: {
    color: Palette.inkMuted,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 23,
  },
  statRow: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: Radius.button,
    borderWidth: 1,
    flexDirection: 'row',
    paddingVertical: Space.md,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  statDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    height: 30,
    width: 1,
  },
  statValue: {
    color: Palette.white,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statDanger: {
    color: '#FFB4AD',
  },
  statCaution: {
    color: '#FFD9A0',
  },
  statLabel: {
    color: Palette.inkMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Space.md,
  },
  toolbarTitle: {
    color: Palette.text,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
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
    overflow: 'hidden',
    padding: Space.lg,
    ...Shadow.card,
  },
  cardSuspicious: {
    borderColor: Palette.suspiciousLine,
  },
  statusRail: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
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
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  stockedInfo: {
    color: Palette.textMuted,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  groupId: {
    color: Palette.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    fontWeight: '500',
  },
  dangerText: {
    color: Palette.suspicious,
    fontWeight: '700',
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
    ...Shadow.card,
  },
  emptyTitle: {
    color: Palette.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  emptyBody: {
    color: Palette.textMuted,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 23,
  },
});
