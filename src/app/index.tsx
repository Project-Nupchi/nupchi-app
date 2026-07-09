import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/glass-card';
import { ScreenShell } from '@/components/screen-shell';
import { StatusBadge } from '@/components/status-badge';
import { FlounderMark } from '@/components/tank-decor';
import { Palette, Radius, Shadow, Space } from '@/constants/aqua-theme';
import {
  formatDateTime,
  getGroupAlertSource,
  getLatestResult,
  getTankGroupStatus,
  sortTanksByRisk,
  TankStatus,
} from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

const headline: Record<TankStatus, { word: string; message: string }> = {
  normal: { word: '양호', message: '광어들이 건강한 상태예요.' },
  caution: { word: '주의', message: '일부 수조에 주의가 필요해요.' },
  suspicious: { word: '의심', message: '의심 수조를 바로 확인하세요.' },
};

export default function HomeScreen() {
  const { session, tanks, results } = useAquaculture();
  const insets = useSafeAreaInsets();
  const sorted = useMemo(() => sortTanksByRisk(tanks, results), [results, tanks]);

  const counts = { normal: 0, caution: 0, suspicious: 0 };
  for (const tank of tanks) counts[getTankGroupStatus(tanks, results, tank)] += 1;
  const overall: TankStatus = counts.suspicious > 0 ? 'suspicious' : counts.caution > 0 ? 'caution' : 'normal';
  const state = headline[overall];

  return (
    <View style={styles.root}>
      <ScreenShell bottomInset={insets.bottom + 110}>
        {/* 넙치 히어로 + 상태 문구 */}
        <View style={[styles.hero, { paddingTop: insets.top + Space.xl }]}>
          <Text selectable style={styles.farmName}>
            {session.farmName}
          </Text>
          <View style={styles.flounderWrap}>
            <FlounderMark width={196} showLesion={overall === 'suspicious'} />
          </View>
          <Text selectable style={styles.statusWord}>
            {state.word}
          </Text>
          <Text selectable style={styles.statusMessage}>
            {state.message}
          </Text>
          <View style={styles.countRow}>
            <CountPill label="정상" value={counts.normal} tint={Palette.normal} />
            <CountPill label="주의" value={counts.caution} tint={Palette.caution} />
            <CountPill label="의심" value={counts.suspicious} tint={Palette.suspicious} />
          </View>
        </View>

        {/* 수조별 현황 서브헤더 + 추가 버튼 */}
        <View style={styles.subHeader}>
          <Text selectable style={styles.subHeaderTitle}>
            수조별 현황
          </Text>
          <Pressable
            accessibilityLabel="수조 추가"
            accessibilityRole="button"
            onPress={() => router.push('/add-tank')}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <View style={styles.plusH} />
            <View style={styles.plusV} />
          </Pressable>
        </View>

        {sorted.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text selectable style={styles.emptyTitle}>
              아직 수조가 없어요
            </Text>
            <Text selectable style={styles.emptyBody}>
              오른쪽 위 + 버튼으로 첫 수조를 추가해 보세요.
            </Text>
          </GlassCard>
        ) : (
          <View style={styles.list}>
            {sorted.map((tank) => {
              const status = getTankGroupStatus(tanks, results, tank);
              const latest = getLatestResult(results, tank.id);
              const linked = Boolean(getGroupAlertSource(tanks, results, tank));
              return (
                <Pressable
                  key={tank.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/tank/[tankId]', params: { tankId: tank.id } })}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <GlassCard style={styles.card}>
                    <View style={styles.cardLeft}>
                      <Text selectable style={styles.tankId}>
                        {tank.id}
                      </Text>
                      <Text selectable style={styles.tankMeta}>
                        {tank.groupId} · {tank.stockedInfo}
                      </Text>
                      <Text selectable style={styles.tankSub}>
                        {latest ? `최근 촬영 ${formatDateTime(latest.capturedAt)}` : '촬영 기록 없음'}
                        {linked && status !== 'suspicious' ? ' · 계통 주의' : ''}
                      </Text>
                    </View>
                    <StatusBadge status={status} />
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScreenShell>

      {/* 카메라 FAB */}
      <Pressable
        accessibilityLabel="촬영"
        accessibilityRole="button"
        onPress={() => router.push('/camera')}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + Space.lg }, pressed && styles.fabPressed]}
      >
        <CameraGlyph />
      </Pressable>
    </View>
  );
}

function CountPill({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <View style={styles.countPill}>
      <View style={[styles.countDot, { backgroundColor: tint }]} />
      <Text selectable style={styles.countLabel}>
        {label}
      </Text>
      <Text selectable style={styles.countValue}>
        {value}
      </Text>
    </View>
  );
}

// View 조합 카메라 글리프 (모든 플랫폼 동일)
function CameraGlyph() {
  return (
    <View style={glyph.body}>
      <View style={glyph.bump} />
      <View style={glyph.lens} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.canvas,
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
  },
  farmName: {
    color: Palette.onGradientMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  flounderWrap: {
    marginVertical: Space.sm,
  },
  statusWord: {
    color: Palette.onGradient,
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 58,
  },
  statusMessage: {
    color: Palette.onGradientMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  countRow: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.md,
  },
  countPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  countDot: {
    borderRadius: Radius.pill,
    height: 8,
    width: 8,
  },
  countLabel: {
    color: Palette.onGradient,
    fontSize: 13,
    fontWeight: '700',
  },
  countValue: {
    color: Palette.onGradient,
    fontSize: 14,
    fontWeight: '800',
  },
  subHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Space.sm,
  },
  subHeaderTitle: {
    color: Palette.onGradient,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: Palette.glassStrong,
    borderColor: Palette.glassLine,
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
    ...Shadow.card,
  },
  plusH: {
    backgroundColor: Palette.primary,
    borderRadius: 2,
    height: 2.5,
    position: 'absolute',
    width: 16,
  },
  plusV: {
    backgroundColor: Palette.primary,
    borderRadius: 2,
    height: 16,
    position: 'absolute',
    width: 2.5,
  },
  list: {
    gap: Space.md,
  },
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.md,
    padding: Space.lg,
  },
  cardLeft: {
    flex: 1,
    gap: 3,
  },
  tankId: {
    color: Palette.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  tankMeta: {
    color: Palette.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  tankSub: {
    color: Palette.textSubtle,
    fontSize: 13,
  },
  emptyCard: {
    gap: Space.sm,
    padding: Space.xl,
  },
  emptyTitle: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  emptyBody: {
    color: Palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: Radius.pill,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    right: Space.lg,
    width: 64,
    ...Shadow.raised,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  pressed: {
    opacity: 0.85,
  },
});

const glyph = StyleSheet.create({
  body: {
    alignItems: 'center',
    borderColor: Palette.white,
    borderRadius: 7,
    borderWidth: 2.5,
    height: 24,
    justifyContent: 'center',
    width: 30,
  },
  bump: {
    backgroundColor: Palette.white,
    borderRadius: 2,
    height: 5,
    position: 'absolute',
    top: -5.5,
    width: 12,
  },
  lens: {
    borderColor: Palette.white,
    borderRadius: Radius.pill,
    borderWidth: 2.5,
    height: 11,
    width: 11,
  },
});
