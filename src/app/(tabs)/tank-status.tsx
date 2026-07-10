import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FigmaTokens, Gradient, Palette, Radius, Shadow, Space, Type } from '@/constants/aqua-theme';
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

const plusImg = require('../../../assets/images/home/plus.png');
const tankThumbnailImg = require('../../../assets/images/home/tank-thumbnail.png');
const statusIcons: Record<TankStatus, number> = {
  suspicious: require('../../../assets/images/home/status-warn.png'),
  caution: require('../../../assets/images/home/status-suspect.png'),
  normal: require('../../../assets/images/home/status-good.png'),
};

const APP_BAR_HEIGHT = Space.lg * 3;

const webBlur =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)' } as unknown as ViewStyle)
    : null;

export default function TankStatusScreen() {
  const { error, isHydrating, refresh, tanks, results } = useAquaculture();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const activeTanks = tanks.filter((tank) => tank.active);
  const sortedTanks = sortTanksByRisk(activeTanks, results);
  const contentWidth = Math.min(width - Space.lg * 2, 520);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...Gradient.colors]} locations={[...Gradient.locations]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[FigmaTokens.color.white[0], Palette.white]}
        locations={[0, 1]}
        pointerEvents="none"
        style={styles.backgroundFade}
      />

      <View style={[styles.appBar, { height: insets.top + APP_BAR_HEIGHT, paddingTop: insets.top }]}>
        <Text selectable style={styles.title}>
          {AppCopy.navigation.tankStatus}
        </Text>
        <Pressable
          accessibilityLabel={AppCopy.navigation.addTank}
          accessibilityRole="button"
          hitSlop={Space.xs}
          onPress={() => router.push('/add-tank')}
          style={({ pressed }) => [styles.addButton, webBlur, pressed && styles.pressed]}
        >
          <Image source={plusImg} style={styles.plusIcon} contentFit="contain" />
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={isHydrating}
            tintColor={Palette.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Space.xl,
            paddingTop: insets.top + APP_BAR_HEIGHT + Space.md,
          },
        ]}
      >
        <View style={[styles.list, { width: contentWidth }]}>
          {isHydrating && sortedTanks.length === 0 ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={Palette.primary} />
              <Text selectable style={styles.stateText}>{AppCopy.home.loading.replace('\n', ' ')}</Text>
            </View>
          ) : error && sortedTanks.length === 0 ? (
            <View style={styles.stateCard}>
              <Text selectable style={styles.stateText}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void refresh()}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <Text selectable={false} style={styles.retryText}>{AppCopy.common.retry}</Text>
              </Pressable>
            </View>
          ) : sortedTanks.length === 0 ? (
            <View style={styles.stateCard}>
              <Text selectable style={styles.stateText}>{AppCopy.camera.noTanksBody}</Text>
            </View>
          ) : (
            sortedTanks.map((tank) => {
              const status = getTankGroupStatus(activeTanks, results, tank);
              return <TankListCard key={tank.id} status={status} tank={tank} />;
            })
          )}
        </View>
      </ScrollView>
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
      <Image source={tankThumbnailImg} style={styles.tankImage} contentFit="cover" />
      <View style={styles.cardText}>
        <View style={styles.cardTitleRow}>
          <Text selectable style={styles.tankId}>
            {tank.code}
          </Text>
          <TankStatusBadge status={status} />
        </View>
        <Text selectable numberOfLines={1} style={styles.meta}>
          {tank.groupName} · {tank.stockedInfo}
        </Text>
        <Text selectable numberOfLines={1} style={styles.captured}>
          {AppCopy.tank.lastCapture(lastCaptured)}
        </Text>
      </View>
      <View style={styles.cardBorder} />
    </Pressable>
  );
}

function formatCapturedAt(value: string) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('month')}.${values.get('day')}. ${values.get('hour')}:${values.get('minute')}`;
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
    ...Type.appBarTitle,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: Palette.glassStrong,
    borderRadius: Radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  plusIcon: {
    height: 24,
    width: 24,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Space.lg,
  },
  list: {
    gap: Space.sm + Space.xs,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: Palette.glass,
    borderColor: Palette.glassLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.md,
    padding: Space.xl,
    ...Shadow.card,
  },
  stateText: {
    color: Palette.textMuted,
    textAlign: 'center',
    ...Type.body2,
  },
  retryButton: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  retryText: {
    color: Palette.onPrimary,
    ...Type.label2,
  },
  card: {
    alignItems: 'center',
    backgroundColor: Palette.glass,
    borderRadius: Radius.card,
    flexDirection: 'row',
    gap: Space.md,
    minHeight: 104,
    padding: Space.md,
    ...Shadow.card,
  },
  cardBorder: {
    bottom: 0,
    borderColor: Palette.glassLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  tankImage: {
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
  pressed: {
    opacity: 0.85,
  },
});
