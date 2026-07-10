import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Gradient, Palette, Radius, Shadow, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import {
  Tank,
  TankStatus,
  getLatestResult,
  getTankGroupStatus,
  sortTanksByRisk,
  statusLabel,
} from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

const cameraImg = require('../../assets/images/home/camera.png');
const flounderImg = require('../../assets/images/home/flounder.png');
const statusIcons: Record<TankStatus, number> = {
  suspicious: require('../../assets/images/home/status-warn.png'),
  caution: require('../../assets/images/home/status-suspect.png'),
  normal: require('../../assets/images/home/status-good.png'),
};
const tabHomeImg = require('../../assets/images/home/tab-home.png');
const tabListImg = require('../../assets/images/home/tab-list.png');

const webBlur =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)' } as unknown as ViewStyle)
    : null;

export default function TankStatusScreen() {
  const { tanks, results } = useAquaculture();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sortedTanks = sortTanksByRisk(tanks.filter((tank) => tank.active), results);
  const contentWidth = Math.min(width - Space.lg * 2, 520);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...Gradient.colors]} locations={[...Gradient.locations]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,255,255,0)', Palette.white]}
        locations={[0, 1]}
        pointerEvents="none"
        style={styles.backgroundFade}
      />

      <View style={[styles.appBar, { paddingTop: insets.top + 7 }]}>
        <Text selectable style={styles.title}>
          {AppCopy.navigation.tankStatus}
        </Text>
        <Pressable
          accessibilityLabel={AppCopy.navigation.addTank}
          accessibilityRole="button"
          onPress={() => router.push('/add-tank')}
          style={({ pressed }) => [styles.addButton, webBlur, pressed && styles.pressed]}
        >
          <Text selectable={false} style={styles.addButtonText}>
            +
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + 144,
            paddingTop: insets.top + 106,
          },
        ]}
      >
        <View style={[styles.list, { width: contentWidth }]}>
          {sortedTanks.map((tank) => {
            const status = getTankGroupStatus(tanks, results, tank);
            return <TankListCard key={tank.id} status={status} tank={tank} />;
          })}
        </View>
      </ScrollView>

      <View style={[styles.tabBar, webBlur, { bottom: insets.bottom + Space.lg }]}>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.tabItem}>
          <Image source={tabHomeImg} style={[styles.tabIcon, styles.tabIconInactive]} contentFit="contain" />
          <Text selectable={false} style={styles.tabLabel}>
            {AppCopy.navigation.home}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={[styles.tabItem, styles.tabItemActive]}>
          <Image source={tabListImg} style={[styles.tabIcon, styles.tabIconActive]} contentFit="contain" />
          <Text selectable={false} style={styles.tabLabelActive}>
            {AppCopy.navigation.tankStatus}
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityLabel={AppCopy.navigation.capture}
        accessibilityRole="button"
        onPress={() => router.push('/camera')}
        style={({ pressed }) => [styles.fab, webBlur, { bottom: insets.bottom + Space.lg }, pressed && styles.fabPressed]}
      >
        <Image source={cameraImg} style={styles.fabIcon} contentFit="contain" />
      </Pressable>
    </View>
  );
}

function TankListCard({ tank, status }: { tank: Tank; status: TankStatus }) {
  const { results } = useAquaculture();
  const latest = getLatestResult(results, tank.id);
  const lastCaptured = latest ? formatCapturedAt(latest.capturedAt) : AppCopy.tank.noCapture;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/tank/[tankId]', params: { tankId: tank.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image source={flounderImg} style={styles.tankImage} contentFit="cover" />
      <View style={styles.cardText}>
        <View style={styles.cardTitleRow}>
          <Text selectable style={styles.tankId}>
            {tank.id}
          </Text>
          <TankStatusBadge status={status} />
        </View>
        <Text selectable numberOfLines={1} style={styles.meta}>
          {tank.groupId} · {tank.stockedInfo}
        </Text>
        <Text selectable numberOfLines={1} style={styles.captured}>
          {AppCopy.tank.lastCapture(lastCaptured)}
        </Text>
      </View>
    </Pressable>
  );
}

function formatCapturedAt(value: string) {
  const date = new Date(value);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  return `${month}.${day}. ${hours}:${minutes}`;
}

function TankStatusBadge({ status }: { status: TankStatus }) {
  const colors = {
    normal: { background: Palette.normalBg, text: Palette.normal },
    caution: { background: Palette.cautionBg, text: Palette.caution },
    suspicious: { background: Palette.suspiciousBg, text: Palette.suspicious },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <Image source={statusIcons[status]} style={styles.badgeIcon} contentFit="contain" />
      <Text selectable={false} style={[styles.badgeText, { color: colors.text }]}>
        {statusLabel[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.canvas,
    flex: 1,
  },
  backgroundFade: {
    bottom: 0,
    height: '54%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  appBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: Space.lg,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 4,
  },
  title: {
    color: Palette.onGradient,
    ...Type.title,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: Palette.glassStrong,
    borderRadius: Radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addButtonText: {
    color: Palette.primaryPressed,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 34,
    marginTop: -2,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Space.lg,
  },
  list: {
    gap: 10,
  },
  card: {
    alignItems: 'center',
    backgroundColor: Palette.glass,
    borderColor: Palette.glassLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Space.md,
    minHeight: 102,
    padding: Space.md,
    ...Shadow.card,
  },
  tankImage: {
    backgroundColor: 'rgba(228, 199, 154, 0.34)',
    borderRadius: Radius.image,
    height: 56,
    width: 56,
  },
  cardText: {
    flex: 1,
    gap: Space.xs,
    minWidth: 0,
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tankId: {
    color: Palette.text,
    ...Type.heading1,
  },
  meta: {
    color: Palette.textMuted,
    ...Type.body2,
  },
  captured: {
    color: Palette.textSubtle,
    ...Type.caption,
  },
  badge: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: 2,
    paddingBottom: 3,
    paddingLeft: 5,
    paddingRight: 9,
    paddingTop: 3,
  },
  badgeIcon: {
    height: 16,
    width: 16,
  },
  badgeText: {
    ...Type.label2,
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: Palette.glass,
    borderColor: Palette.glassLine,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Space.xs,
    height: 64,
    left: Space.lg,
    paddingHorizontal: Space.xs,
    position: 'absolute',
    ...Shadow.navigation,
  },
  tabItem: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    gap: Space.xxs,
    height: 56,
    justifyContent: 'center',
    width: 80,
  },
  tabItemActive: {
    backgroundColor: Palette.white,
  },
  tabIcon: {
    height: 24,
    width: 24,
  },
  tabIconActive: {
    tintColor: Palette.ink,
  },
  tabIconInactive: {
    tintColor: Palette.textSubtle,
  },
  tabLabelActive: {
    color: Palette.ink,
    ...Type.label3,
  },
  tabLabel: {
    color: Palette.textSubtle,
    ...Type.label3,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: Palette.inkOverlay,
    borderColor: Palette.white,
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    right: Space.lg,
    width: 64,
    ...Shadow.navigation,
  },
  fabIcon: {
    height: 28,
    tintColor: Palette.white,
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
