import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { GlassCard } from '@/components/glass-card';
import { ScreenShell } from '@/components/screen-shell';
import { StateChip } from '@/components/state-chip';
import { Palette, Radius, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import { getTankGroupStatus, getTankResults, statusLabel } from '@/domain/aquaculture';
import type { InspectionResult, TankStatus } from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

const flounderGoodBaseImg = require('../../../assets/images/home/flounder.png');
const flounderGoodOverlayImg = require('../../../assets/images/home/flounder-good-overlay.png');
const flounderSuspectImg = require('../../../assets/images/home/flounder-suspect.png');
const flounderWarnImg = require('../../../assets/images/home/flounder-warn.png');
const cameraImg = require('../../../assets/images/home/camera.png');
const chevronDarkImg = require('../../../assets/images/home/chevron-dark.png');

const statusIcons: Record<TankStatus, number> = {
  suspicious: require('../../../assets/images/home/status-warn.png'),
  caution: require('../../../assets/images/home/status-suspect.png'),
  normal: require('../../../assets/images/home/status-good.png'),
};

const statusTone: Record<TankStatus, { backgroundColor: string; color: string }> = {
  suspicious: { backgroundColor: Palette.suspiciousBg, color: Palette.suspicious },
  caution: { backgroundColor: Palette.cautionBg, color: Palette.caution },
  normal: { backgroundColor: Palette.normalBg, color: Palette.normal },
};

const APP_BAR_HEIGHT = Space.lg * 3;

// 수조 상세 — 수조 정보 + 점검 내역(카드 → 분석 결과)
export default function TankDetailScreen() {
  const { tankId } = useLocalSearchParams<{ tankId: string }>();
  const { tanks, results } = useAquaculture();
  const insets = useSafeAreaInsets();
  const tank = tanks.find((item) => item.id === tankId);
  const tankResults = getTankResults(results, tankId);
  const status = tank ? getTankGroupStatus(tanks, results, tank) : 'normal';
  const contentTop = Platform.OS === 'ios' ? Space.md : insets.top + APP_BAR_HEIGHT + Space.md;

  if (!tank) {
    return (
      <ScreenShell gradient="detail" topInset={contentTop}>
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
    <ScreenShell gradient="detail" topInset={contentTop}>
      <View style={styles.container}>
        <GlassCard style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <View style={styles.tankTitleRow}>
                <Text selectable style={styles.tankId}>
                  {tank.id}
                </Text>
                <View style={[styles.heroStatus, { backgroundColor: statusTone[status].backgroundColor }]}>
                  <StatusMark color={statusTone[status].color} hero status={status} />
                </View>
              </View>
              <Text selectable style={styles.groupText}>
                {tank.groupId}
                {tank.active ? '' : AppCopy.tank.inactive}
              </Text>
              <Text selectable style={styles.stockedText}>
                {tank.stockedInfo}
              </Text>
            </View>
            <StatusFlounder status={status} />
          </View>

          <View style={styles.heroActions}>
            <Pressable
              accessibilityLabel={AppCopy.tank.captureThis}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/camera', params: { tankId: tank.id } })}
              style={({ pressed }) => [styles.captureButton, pressed && styles.pressed]}
            >
              <Image accessible={false} source={cameraImg} style={styles.cameraIcon} contentFit="contain" />
              <Text selectable={false} style={styles.captureButtonText}>
                {AppCopy.tank.captureThis}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={AppCopy.tank.edit}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/add-tank', params: { editId: tank.id } })}
              style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
            >
              <Text selectable={false} style={styles.editButtonText}>
                {AppCopy.tank.edit}
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        <View style={styles.historySection}>
          <View style={styles.sectionTitleRow}>
            <Text selectable style={styles.sectionTitle}>
              {AppCopy.tank.history}
            </Text>
            {tankResults.length > 0 ? (
              <Text selectable style={styles.sectionCount}>
                {tankResults.length}
              </Text>
            ) : null}
          </View>

          {tankResults.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text selectable style={styles.emptyBody}>
                {AppCopy.tank.emptyHistory}
              </Text>
            </GlassCard>
          ) : (
            <View style={styles.list}>
              {tankResults.map((result) => (
                <InspectionCard key={result.id} result={result} />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScreenShell>
  );
}

function InspectionCard({ result }: { result: InspectionResult }) {
  const completed = result.status === 'completed';
  const normal = completed && result.grade === 'normal';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/result/[resultId]', params: { resultId: result.id } })}
      style={({ pressed }) => [styles.recordPressable, pressed && styles.pressed]}
    >
      <GlassCard style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <Text selectable style={styles.recordDate}>
            {formatInspectionDate(result.capturedAt)}
          </Text>
          <Image accessible={false} source={chevronDarkImg} style={styles.recordChevron} contentFit="contain" />
        </View>

        <View style={styles.findingRow}>
          {completed ? (
            <StatusMark color={Palette.inkOverlay} status={result.grade} />
          ) : (
            <StateChip status={result.status} />
          )}
          <Text selectable numberOfLines={2} style={styles.recordSummary}>
            {completed
              ? normal
                ? AppCopy.tank.normalSummary
                : result.evidenceSummary
              : result.status === 'pending'
                ? AppCopy.tank.pendingSummary
                : result.evidenceSummary}
          </Text>
        </View>

        {completed && (normal || result.diseases.length > 0) ? (
          <View style={styles.diagnosisRow}>
            <View style={styles.diagnosisLabel}>
              <SearchGlyph />
              <Text selectable style={styles.recordLabel}>
                {AppCopy.tank.diagnosis}
              </Text>
            </View>
            {normal ? (
              <Text selectable style={styles.diagnosisEmpty}>
                {AppCopy.tank.normalDiagnosis}
              </Text>
            ) : (
              <View style={styles.tagRow}>
                {result.diseases.map((disease) => (
                  <View key={disease} style={styles.tag}>
                    <Text selectable style={styles.tagText}>
                      {disease}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </GlassCard>
    </Pressable>
  );
}

function StatusMark({ color, hero = false, status }: { color: string; hero?: boolean; status: TankStatus }) {
  const isWarning = status === 'suspicious';

  return (
    <View style={styles.statusMark}>
      <View style={styles.statusIconSlot}>
        <Image
          accessible={false}
          source={statusIcons[status]}
          style={isWarning ? styles.warningIcon : styles.statusIcon}
          contentFit="contain"
        />
      </View>
      <Text selectable style={[hero ? styles.heroStatusLabel : styles.recordLabel, { color }]}>
        {statusLabel[status]}
      </Text>
    </View>
  );
}

function StatusFlounder({ status }: { status: TankStatus }) {
  if (status === 'suspicious') {
    return (
      <Image
        accessible={false}
        contentFit="contain"
        source={flounderWarnImg}
        style={styles.flounder}
      />
    );
  }

  if (status === 'caution') {
    return (
      <View style={styles.flounderVisual}>
        <Image
          accessible={false}
          contentFit="cover"
          source={flounderGoodBaseImg}
          style={styles.flounderLayer}
        />
        <Image
          accessible={false}
          contentFit="cover"
          source={flounderGoodOverlayImg}
          style={styles.flounderLayer}
        />
        <Image
          accessible={false}
          contentFit="fill"
          source={flounderSuspectImg}
          style={styles.flounderLayer}
        />
      </View>
    );
  }

  return (
    <View style={styles.flounderVisual}>
      <Image
        accessible={false}
        contentFit="cover"
        source={flounderGoodBaseImg}
        style={styles.flounderLayer}
      />
      <Image
        accessible={false}
        contentFit="cover"
        source={flounderGoodOverlayImg}
        style={styles.flounderLayer}
      />
    </View>
  );
}

function SearchGlyph() {
  return (
    <View style={styles.searchGlyph}>
      <View style={styles.searchLens} />
      <View style={styles.searchHandle} />
    </View>
  );
}

function formatInspectionDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    gap: Space.xxl + Space.xs,
    maxWidth: 520,
    width: '100%',
  },
  heroCard: {
    borderRadius: Radius.heroCard,
    gap: Space.lg + Space.xs,
    padding: Space.lg,
  },
  heroTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Space.md,
    justifyContent: 'space-between',
    minHeight: 97,
  },
  heroCopy: {
    alignItems: 'flex-start',
    flex: 1,
    gap: Space.sm,
    minWidth: 0,
  },
  tankTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.sm,
  },
  tankId: {
    color: Palette.text,
    ...Type.display,
  },
  heroStatus: {
    borderRadius: Radius.pill,
    paddingLeft: Space.xs + 1,
    paddingRight: Space.sm + 1,
    paddingVertical: Space.xxs + 1,
  },
  heroStatusLabel: {
    ...Type.label2,
  },
  groupText: {
    color: Palette.textMuted,
    ...Type.body1,
  },
  stockedText: {
    color: Palette.textMuted,
    ...Type.body1,
    fontWeight: Type.body2.fontWeight,
  },
  flounder: {
    height: 97,
    width: 97,
  },
  flounderVisual: {
    height: 97,
    position: 'relative',
    width: 97,
  },
  flounderLayer: {
    height: 97,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 97,
  },
  heroActions: {
    flexDirection: 'row',
    gap: Space.md - Space.xs,
  },
  captureButton: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: Radius.button,
    flex: 1,
    flexDirection: 'row',
    gap: Space.sm,
    height: 56,
    justifyContent: 'center',
  },
  cameraIcon: {
    height: 20,
    width: 20,
  },
  captureButtonText: {
    color: Palette.white,
    ...Type.button,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.button,
    height: 56,
    justifyContent: 'center',
    width: 68,
  },
  editButtonText: {
    color: Palette.text,
    ...Type.button,
  },
  historySection: {
    gap: Space.md,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.sm - Space.xxs,
  },
  sectionTitle: {
    color: Palette.text,
    ...Type.heading2,
  },
  sectionCount: {
    color: Palette.detailCount,
    ...Type.heading2,
  },
  list: {
    gap: Space.md - Space.xs,
  },
  recordPressable: {
    borderRadius: Radius.card,
  },
  recordCard: {
    gap: Space.md,
    padding: Space.lg,
  },
  recordHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.xs,
  },
  recordDate: {
    color: Palette.text,
    ...Type.body1,
  },
  recordChevron: {
    height: 20,
    width: 20,
  },
  findingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Space.md - Space.xxs,
  },
  statusMark: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: Space.xxs,
  },
  statusIconSlot: {
    alignItems: 'center',
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  warningIcon: {
    height: 16,
    width: 16,
  },
  statusIcon: {
    height: 14,
    width: 14,
  },
  recordLabel: {
    color: Palette.inkOverlay,
    ...Type.fieldLabel,
  },
  recordSummary: {
    color: Palette.textMuted,
    flex: 1,
    ...Type.body2,
  },
  diagnosisRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.md - Space.xxs,
  },
  diagnosisLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: Space.xxs,
  },
  diagnosisEmpty: {
    color: Palette.textMuted,
    flex: 1,
    ...Type.body2,
  },
  searchGlyph: {
    height: 16,
    position: 'relative',
    width: 16,
  },
  searchLens: {
    borderColor: Palette.textSubtle,
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: 8,
    left: 2,
    position: 'absolute',
    top: 2,
    width: 8,
  },
  searchHandle: {
    backgroundColor: Palette.textSubtle,
    borderRadius: Radius.pill,
    bottom: 3,
    height: 1,
    position: 'absolute',
    right: 2,
    transform: [{ rotate: '45deg' }],
    width: 5,
  },
  tagRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.xs,
  },
  tag: {
    backgroundColor: Palette.diagnosisTag,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
  },
  tagText: {
    color: Palette.inkOverlay,
    ...Type.label2,
  },
  emptyCard: {
    padding: Space.xl,
  },
  emptyBody: {
    color: Palette.textMuted,
    ...Type.body2,
  },
  panel: {
    alignSelf: 'center',
    gap: Space.md,
    maxWidth: 520,
    padding: Space.lg,
    width: '100%',
  },
  panelTitle: {
    color: Palette.text,
    ...Type.title,
  },
  pressed: {
    opacity: 0.82,
  },
});
