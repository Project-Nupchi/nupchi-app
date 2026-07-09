import { useEffect, useRef } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlounderMark } from '@/components/tank-decor';
import { Palette, Radius, Space } from '@/constants/aqua-theme';
import { sortTanksByRisk } from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

// 카메라 — 프레임 오버레이로 촬영 후 분석 결과로 이동
export default function CameraScreen() {
  const { tankId } = useLocalSearchParams<{ tankId?: string }>();
  const { tanks, results, createInspection } = useAquaculture();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const isWeb = process.env.EXPO_OS === 'web';

  // 선택 수조: 파라미터 우선, 없으면 위험도 상단 수조
  const selectedTankId = tankId ?? sortTanksByRisk(tanks, results)[0]?.id;
  const tank = tanks.find((item) => item.id === selectedTankId);

  useEffect(() => {
    if (!isWeb && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [isWeb, permission, requestPermission]);

  const submit = (photoUri?: string) => {
    if (!selectedTankId) {
      router.replace('/add-tank');
      return;
    }
    const resultId = createInspection({ tankId: selectedTankId, photoUri, clues: [] });
    router.replace({ pathname: '/result/[resultId]', params: { resultId } });
  };

  const takePhoto = async () => {
    if (isWeb) {
      submit('mock://capture-preview');
      return;
    }
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.82 });
    submit(photo?.uri);
  };

  const permissionDenied = !isWeb && permission && !permission.granted && !permission.canAskAgain;

  return (
    <View style={styles.root}>
      {permissionDenied ? (
        <View style={styles.permissionBox}>
          <Text selectable style={styles.permissionTitle}>
            카메라 권한이 필요합니다
          </Text>
          <Text selectable style={styles.permissionBody}>
            설정에서 카메라 접근을 허용한 뒤 다시 촬영하세요.
          </Text>
        </View>
      ) : isWeb ? (
        <View style={styles.mockPreview}>
          <FlounderMark width={240} color="rgba(228, 199, 154, 0.9)" />
        </View>
      ) : (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      )}

      {/* 촬영 프레임 오버레이 */}
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <View style={styles.guideChip}>
          <Text selectable={false} style={styles.guideText}>
            광어 한 마리를 프레임 안에 근접·전체로
          </Text>
        </View>
      </View>

      {/* 상단바 */}
      <View style={[styles.topBar, { paddingTop: insets.top + Space.sm }]}>
        <Pressable accessibilityLabel="닫기" accessibilityRole="button" onPress={() => router.back()} style={styles.closeButton}>
          <View style={styles.closeX1} />
          <View style={styles.closeX2} />
        </Pressable>
        <View style={styles.tankPill}>
          <Text selectable style={styles.tankPillText}>
            {selectedTankId ?? '수조 없음'} · {tank?.groupId ?? '수조군'}
          </Text>
        </View>
      </View>

      {/* 셔터 */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Space.xl }]}>
        <Pressable
          accessibilityLabel="촬영"
          accessibilityRole="button"
          onPress={takePhoto}
          style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <Text selectable style={styles.shutterHint}>
          {isWeb ? '샘플 촬영 (웹 미리보기)' : '탭하여 촬영'}
        </Text>
      </View>
    </View>
  );
}

const CORNER = 28;

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.inkStrong,
    flex: 1,
  },
  mockPreview: {
    alignItems: 'center',
    backgroundColor: '#0F2A3C',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: Space.xl,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  frame: {
    aspectRatio: 1.4,
    width: '88%',
  },
  corner: {
    borderColor: Palette.white,
    height: CORNER,
    position: 'absolute',
    width: CORNER,
  },
  cornerTL: { borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 8, left: 0, top: 0 },
  cornerTR: { borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 8, right: 0, top: 0 },
  cornerBL: { borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8, bottom: 0, left: 0 },
  cornerBR: { borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8, bottom: 0, right: 0 },
  guideChip: {
    backgroundColor: 'rgba(12, 30, 44, 0.66)',
    borderRadius: Radius.pill,
    marginTop: Space.lg,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  guideText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: Space.lg,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 30, 44, 0.55)',
    borderRadius: Radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeX1: {
    backgroundColor: Palette.white,
    borderRadius: 2,
    height: 2.5,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: 18,
  },
  closeX2: {
    backgroundColor: Palette.white,
    borderRadius: 2,
    height: 2.5,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    width: 18,
  },
  tankPill: {
    backgroundColor: 'rgba(12, 30, 44, 0.55)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tankPillText: {
    color: Palette.white,
    fontSize: 14,
    fontWeight: '700',
  },
  bottomBar: {
    alignItems: 'center',
    bottom: 0,
    gap: Space.sm,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  shutter: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: Palette.white,
    borderRadius: Radius.pill,
    borderWidth: 4,
    height: 78,
    justifyContent: 'center',
    width: 78,
  },
  shutterPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  shutterInner: {
    backgroundColor: Palette.white,
    borderRadius: Radius.pill,
    height: 58,
    width: 58,
  },
  shutterHint: {
    color: Palette.inkMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  permissionBox: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: Space.xl,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  permissionTitle: {
    color: Palette.white,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionBody: {
    color: Palette.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: Space.sm,
    textAlign: 'center',
  },
});
