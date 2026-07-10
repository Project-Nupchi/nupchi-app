import { useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette, Radius, Shadow, Space } from '@/constants/aqua-theme';
import { TankStatus, getTankGroupStatus, sortTanksByRisk, statusLabel } from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

// Figma 홈 디자인 에셋 (넙치 일러스트 · 물결 링 · 상태/탭 아이콘)
const flounderImg = require('../../assets/images/home/flounder.png');
const rippleImg = require('../../assets/images/home/ripple.svg');
const mapPinImg = require('../../assets/images/home/map-pin.svg');
const chevronBlueImg = require('../../assets/images/home/chevron-blue.svg');
const chevronDarkImg = require('../../assets/images/home/chevron-dark.svg');
const cameraImg = require('../../assets/images/home/camera.svg');
const tabHomeImg = require('../../assets/images/home/tab-home.svg');
const tabListImg = require('../../assets/images/home/tab-list.svg');

const statusIcons: Record<TankStatus, number> = {
  suspicious: require('../../assets/images/home/status-warn.svg'),
  caution: require('../../assets/images/home/status-suspect.svg'),
  normal: require('../../assets/images/home/status-good.svg'),
};

// 웹 전용 프로스티드 블러 (네이티브는 반투명 배경으로 대체)
const webBlur =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)' } as unknown as ViewStyle)
    : null;

export default function HomeScreen() {
  const { session, tanks, results } = useAquaculture();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [tanksSectionY, setTanksSectionY] = useState(0);

  const sorted = useMemo(() => sortTanksByRisk(tanks, results), [results, tanks]);
  const counts = { normal: 0, caution: 0, suspicious: 0 };
  for (const tank of tanks) counts[getTankGroupStatus(tanks, results, tank)] += 1;

  // 헤드라인: 가장 높은 위험 단계 기준
  const headline =
    counts.suspicious > 0
      ? { grade: '경고', count: counts.suspicious }
      : counts.caution > 0
        ? { grade: '의심', count: counts.caution }
        : null;

  const worstTankId = sorted[0]?.id;

  // 반응형: 히어로 넙치는 화면 폭 비례(상한), 콘텐츠는 최대 폭 제한
  const flounderSize = Math.min(width * 0.68, 300);
  const rippleSize = flounderSize * 1.72;
  // 카드 가로 스크롤을 중앙 컨테이너(최대 520)와 좌측 정렬
  const cardInset = Math.max((width - 520) / 2, 0) + Space.lg;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#4B9AE9', '#78B3EF', '#A5CCF4', '#D2E6FA', '#FFFFFF']}
        locations={[0, 0.2, 0.4, 0.62, 0.88]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Space.md, paddingBottom: insets.bottom + 140 }]}
      >
        <View style={styles.container}>
          {/* 위치 헤더 */}
          <View style={styles.locationRow}>
            <Image source={mapPinImg} style={styles.mapPin} contentFit="contain" />
            <Text selectable style={styles.locationText}>
              {session.farmName}
            </Text>
          </View>

          {/* 헤드라인 + CTA */}
          <View style={styles.headlineBlock}>
            <Text selectable style={styles.headlineSub}>
              오늘의 수조 상태
            </Text>
            {headline ? (
              <Text selectable style={styles.headline}>
                {headline.grade} 단계의 수조가{'\n'}
                {headline.count}개 발견됐어요
              </Text>
            ) : (
              <Text selectable style={styles.headline}>
                모든 수조가{'\n'}양호한 상태예요
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={!worstTankId}
              onPress={() => router.push({ pathname: '/tank/[tankId]', params: { tankId: worstTankId } })}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <Text selectable={false} style={styles.ctaText}>
                수조 바로 확인하기
              </Text>
              <Image source={chevronBlueImg} style={styles.ctaIcon} contentFit="contain" />
            </Pressable>
          </View>

          {/* 히어로: 물결 링 + 넙치 일러스트 */}
          <View style={[styles.hero, { height: flounderSize * 0.94 }]}>
            <Image
              source={rippleImg}
              style={[styles.ripple, { width: rippleSize, height: rippleSize }]}
              contentFit="contain"
            />
            <Image
              source={flounderImg}
              style={{ width: flounderSize, height: flounderSize }}
              contentFit="contain"
            />
          </View>

          {/* 수조 현황 */}
          <View style={styles.tanksSection} onLayout={(e) => setTanksSectionY(e.nativeEvent.layout.y)}>
            <View style={styles.sectionHeader}>
              <Text selectable style={styles.sectionTitle}>
                수조 현황
              </Text>
              <Image source={chevronDarkImg} style={styles.sectionChevron} contentFit="contain" />
            </View>
          </View>
        </View>

        {/* 수조 카드 가로 스크롤 (풀블리드) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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
          {/* 수조 추가 */}
          <Pressable
            accessibilityLabel="수조 추가"
            accessibilityRole="button"
            onPress={() => router.push('/add-tank')}
            style={({ pressed }) => [styles.card, styles.addCard, pressed && styles.pressed]}
          >
            <View style={styles.addPlus}>
              <View style={styles.addPlusH} />
              <View style={styles.addPlusV} />
            </View>
            <Text selectable={false} style={styles.addLabel}>
              추가
            </Text>
          </Pressable>
        </ScrollView>
      </ScrollView>

      {/* 하단 탭바 (다크 글래스) */}
      <View style={[styles.tabBar, webBlur, { bottom: insets.bottom + Space.lg }]}>
        <Pressable accessibilityRole="button" style={[styles.tabItem, styles.tabItemActive]}>
          <Image source={tabHomeImg} style={styles.tabIcon} contentFit="contain" />
          <Text selectable={false} style={styles.tabLabelActive}>
            홈
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => scrollRef.current?.scrollTo({ y: Math.max(tanksSectionY - 80, 0), animated: true })}
          style={styles.tabItem}
        >
          <Image source={tabListImg} style={styles.tabIcon} contentFit="contain" />
          <Text selectable={false} style={styles.tabLabel}>
            수조 현황
          </Text>
        </Pressable>
      </View>

      {/* 카메라 FAB (다크 글래스) */}
      <Pressable
        accessibilityLabel="촬영"
        accessibilityRole="button"
        onPress={() => router.push('/camera')}
        style={({ pressed }) => [styles.fab, webBlur, { bottom: insets.bottom + Space.lg }, pressed && styles.fabPressed]}
      >
        <Image source={cameraImg} style={styles.fabIcon} contentFit="contain" />
      </Pressable>
    </View>
  );
}

const GLASS_DARK = 'rgba(30, 42, 69, 0.7)';
const CARD_SHADOW = {
  shadowColor: '#0B2740',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 20,
  elevation: 4,
} satisfies ViewStyle;

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  scroll: {
    gap: Space.lg,
  },
  container: {
    alignSelf: 'center',
    gap: Space.lg,
    maxWidth: 520,
    paddingHorizontal: Space.lg,
    width: '100%',
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
  },
  mapPin: {
    height: 20,
    width: 20,
  },
  locationText: {
    color: Palette.white,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  headlineBlock: {
    alignItems: 'flex-start',
    gap: Space.md,
    marginTop: Space.xs,
  },
  headlineSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.36,
  },
  headline: {
    color: Palette.white,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.84,
    lineHeight: 39,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 40,
    flexDirection: 'row',
    gap: 2,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    ...CARD_SHADOW,
  },
  ctaText: {
    color: '#3689DD',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.32,
  },
  ctaIcon: {
    height: 16,
    width: 16,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Space.xs,
  },
  ripple: {
    position: 'absolute',
  },
  tanksSection: {
    gap: Space.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  sectionTitle: {
    color: 'rgba(20, 23, 30, 0.8)',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.36,
  },
  sectionChevron: {
    height: 20,
    width: 20,
  },
  cardRow: {
    gap: 8,
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    minWidth: 94,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...CARD_SHADOW,
  },
  cardId: {
    color: 'rgba(20, 23, 30, 0.7)',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.32,
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
    color: 'rgba(20, 23, 30, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.28,
  },
  addCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  addPlus: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  addPlusH: {
    backgroundColor: 'rgba(20, 23, 30, 0.55)',
    borderRadius: 2,
    height: 2.5,
    position: 'absolute',
    width: 16,
  },
  addPlusV: {
    backgroundColor: 'rgba(20, 23, 30, 0.55)',
    borderRadius: 2,
    height: 16,
    position: 'absolute',
    width: 2.5,
  },
  addLabel: {
    color: 'rgba(20, 23, 30, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: GLASS_DARK,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: 4,
    height: 64,
    left: Space.lg,
    paddingHorizontal: 4,
    position: 'absolute',
    ...Shadow.raised,
  },
  tabItem: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    gap: 2,
    height: 56,
    justifyContent: 'center',
    width: 80,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabIcon: {
    height: 24,
    width: 24,
  },
  tabLabelActive: {
    color: Palette.white,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.22,
  },
  tabLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.22,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: GLASS_DARK,
    borderRadius: Radius.pill,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    right: Space.lg,
    width: 64,
    ...Shadow.raised,
  },
  fabIcon: {
    height: 28,
    width: 28,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  pressed: {
    opacity: 0.85,
  },
});
