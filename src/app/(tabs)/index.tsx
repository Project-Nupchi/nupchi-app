import { useMemo } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Gradient, Palette, Radius, Shadow, Space, Type, Water } from '@/constants/aqua-theme';
import { AppCopy, StatusCopy } from '@/constants/copy';
import { TankStatus, getTankGroupStatus, sortTanksByRisk, statusLabel } from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

// Figma 홈 디자인 에셋 (넙치 일러스트 · 상태/탭 아이콘)
// SVG 원본은 CSS 변수·blur 필터를 포함해 네이티브에서 렌더링되지 않으므로 PNG(3x)를 사용
const flounderImg = require('../../../assets/images/home/flounder.png');
const flounderWarnImg = require('../../../assets/images/home/flounder-warn.png');
const mapPinImg = require('../../../assets/images/home/map-pin.png');
const chevronBlueImg = require('../../../assets/images/home/chevron-blue.png');
const chevronDarkImg = require('../../../assets/images/home/chevron-dark.png');

const statusIcons: Record<TankStatus, number> = {
  suspicious: require('../../../assets/images/home/status-warn.png'),
  caution: require('../../../assets/images/home/status-suspect.png'),
  normal: require('../../../assets/images/home/status-good.png'),
};

const APP_BAR_HEIGHT = Space.lg * 3;

export default function HomeScreen() {
  const { session, tanks, results } = useAquaculture();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const sorted = useMemo(() => sortTanksByRisk(tanks, results), [results, tanks]);
  const counts = { normal: 0, caution: 0, suspicious: 0 };
  for (const tank of tanks) counts[getTankGroupStatus(tanks, results, tank)] += 1;

  // 헤드라인: 가장 높은 위험 단계 기준
  const headline =
    counts.suspicious > 0
      ? { grade: StatusCopy.suspicious, count: counts.suspicious }
      : counts.caution > 0
        ? { grade: StatusCopy.caution, count: counts.caution }
        : null;

  const worstTankId = sorted[0]?.id;

  // 반응형: 히어로 넙치는 화면 폭 비례(상한), 콘텐츠는 최대 폭 제한
  const flounderSize = Math.min(width * 0.68, 300);
  const rippleSize = flounderSize * (455 / 265);
  const heroFlounderImg = headline?.grade === StatusCopy.suspicious ? flounderWarnImg : flounderImg;
  // 카드 가로 스크롤을 중앙 컨테이너(최대 520)와 좌측 정렬
  const cardInset = Math.max((width - 520) / 2, 0) + Space.lg;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...Gradient.colors]}
        locations={[...Gradient.locations]}
        style={StyleSheet.absoluteFill}
      />

      <View
        accessibilityLabel={`현재 양식장 ${session.farmName}`}
        accessible
        style={[
          styles.appBar,
          { height: insets.top + APP_BAR_HEIGHT, paddingTop: insets.top + Space.md },
        ]}
      >
        <View style={styles.locationRow}>
          <View style={styles.mapPinSlot}>
            <Image source={mapPinImg} style={styles.mapPin} contentFit="contain" />
          </View>
          <Text numberOfLines={1} selectable style={styles.locationText}>
            {session.farmName}
          </Text>
        </View>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Space.xl, paddingTop: insets.top + APP_BAR_HEIGHT + Space.md },
        ]}
      >
        <View style={styles.container}>
          {/* 헤드라인 + CTA */}
          <View style={styles.headlineBlock}>
            <View style={styles.headlineCopy}>
              <Text selectable style={styles.headlineSub}>
                {AppCopy.home.todayStatus}
              </Text>
              {headline ? (
                <Text selectable style={styles.headline}>
                  {AppCopy.home.alertHeadline(headline.grade, headline.count)}
                </Text>
              ) : (
                <Text selectable style={styles.headline}>
                  {AppCopy.home.allNormal}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!worstTankId}
              onPress={() => router.push({ pathname: '/tank/[tankId]', params: { tankId: worstTankId } })}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <Text selectable={false} style={styles.ctaText}>
                {AppCopy.home.inspectNow}
              </Text>
              <Image source={chevronBlueImg} style={styles.ctaIcon} contentFit="contain" />
            </Pressable>
          </View>

          {/* 히어로: 물결 링 + 넙치 일러스트 */}
          <View style={[styles.hero, { height: flounderSize * 0.86 }]}>
            <WarningRipple size={rippleSize} />
            <Image source={heroFlounderImg} style={[styles.flounder, { height: flounderSize, width: flounderSize }]} contentFit="contain" />
          </View>

          {/* 수조 현황 */}
          <View style={styles.tanksSection}>
            <View style={styles.sectionHeader}>
              <Text selectable style={styles.sectionTitle}>
                {AppCopy.navigation.tankStatus}
              </Text>
              <Image source={chevronDarkImg} style={styles.sectionChevron} contentFit="contain" />
            </View>
          </View>
        </View>

        {/* 수조 카드 가로 스크롤 (풀블리드) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cardScroller}
          contentContainerStyle={[styles.cardRow, { paddingHorizontal: cardInset }]}
        >
          {sorted.map((tank) => {
            const status = getTankGroupStatus(tanks, results, tank);
            return (
              <Pressable
                key={tank.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/tank/[tankId]', params: { tankId: tank.id } })}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <Text selectable style={styles.cardId}>
                  {tank.id}
                </Text>
                <View style={styles.cardStatusRow}>
                  <Image source={statusIcons[status]} style={styles.cardStatusIcon} contentFit="contain" />
                  <Text selectable style={styles.cardStatusText}>
                    {statusLabel[status]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

function WarningRipple({ size }: { size: number }) {
  return (
    <View style={[styles.ripple, { height: size, pointerEvents: 'none', width: size }]}>
      <View style={[styles.rippleCircle, styles.rippleOuter]} />
      <View style={[styles.rippleCircle, styles.rippleMiddle]} />
      <View style={[styles.rippleCircle, styles.rippleInner]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.canvas,
    flex: 1,
  },
  scroll: {
    gap: 0,
  },
  container: {
    alignSelf: 'center',
    gap: Space.lg,
    maxWidth: 520,
    paddingHorizontal: Space.lg,
    width: '100%',
  },
  appBar: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    left: 0,
    paddingHorizontal: Space.lg,
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 4,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    maxWidth: 520,
  },
  mapPinSlot: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  mapPin: {
    height: 16,
    width: 16,
  },
  locationText: {
    color: Palette.onGradient,
    flexShrink: 1,
    ...Type.body1,
  },
  headlineBlock: {
    alignItems: 'flex-start',
    gap: Space.md,
    position: 'relative',
    zIndex: 3,
  },
  headlineCopy: {
    alignItems: 'flex-start',
    gap: Space.xs,
  },
  headlineSub: {
    color: Palette.onGradientMuted,
    ...Type.heading2,
  },
  headline: {
    color: Palette.white,
    ...Type.display,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: Palette.glassStrong,
    borderRadius: Radius.roundButton,
    flexDirection: 'row',
    gap: Space.xxs,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: Space.md,
    ...Shadow.card,
  },
  ctaText: {
    color: Palette.primary,
    ...Type.button,
  },
  ctaIcon: {
    height: 16,
    width: 16,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
    overflow: 'visible',
    position: 'relative',
    zIndex: 1,
  },
  flounder: {
    zIndex: 2,
  },
  ripple: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 1,
  },
  rippleCircle: {
    borderColor: Palette.onGradientTrace,
    borderRadius: Radius.pill,
    borderWidth: 1,
    position: 'absolute',
  },
  rippleOuter: {
    backgroundColor: Water.lesionGlowOuter,
    height: '100%',
    width: '100%',
  },
  rippleMiddle: {
    backgroundColor: Water.lesionGlowInner,
    height: '81%',
    width: '81%',
  },
  rippleInner: {
    backgroundColor: Water.lesionGlowInner,
    height: '60%',
    width: '60%',
  },
  tanksSection: {
    gap: Space.md,
    position: 'relative',
    zIndex: 3,
  },
  cardScroller: {
    position: 'relative',
    zIndex: 3,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  sectionTitle: {
    color: Palette.textMuted,
    ...Type.heading2,
  },
  sectionChevron: {
    height: 20,
    width: 20,
  },
  cardRow: {
    backgroundColor: 'transparent',
    gap: Space.sm,
    paddingBottom: Space.xl,
    paddingTop: Space.sm,
  },
  card: {
    alignItems: 'center',
    backgroundColor: Palette.glass,
    borderColor: Palette.glassLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 6,
    minWidth: 94,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    ...Shadow.card,
  },
  cardId: {
    color: Palette.textMuted,
    ...Type.body1,
  },
  cardStatusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  cardStatusIcon: {
    height: 15,
    width: 15,
  },
  cardStatusText: {
    color: Palette.text,
    ...Type.label1,
  },
  pressed: {
    opacity: 0.85,
  },
});
