import { useEffect, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { Palette, Radius, Space } from '@/constants/aqua-theme';
import { behaviorClues } from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

export default function CaptureScreen() {
  const { tankId } = useLocalSearchParams<{ tankId?: string }>();
  const { tanks, createInspection } = useAquaculture();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [selectedClues, setSelectedClues] = useState<string[]>([]);
  const [qualityHint, setQualityHint] = useState('광어 한 마리를 물 밖으로 들어 올려 어체 전체가 프레임에 들어오게 촬영하세요.');
  const selectedTankId = tankId ?? tanks[0]?.id;
  const selectedTank = tanks.find((tank) => tank.id === selectedTankId);
  const isWeb = process.env.EXPO_OS === 'web';

  useEffect(() => {
    if (!isWeb && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [isWeb, permission, requestPermission]);

  const toggleClue = (clue: string) => {
    setSelectedClues((current) =>
      current.includes(clue) ? current.filter((item) => item !== clue) : [...current, clue]
    );
  };

  const takePhoto = async () => {
    if (isWeb) {
      setPhotoUri('mock://capture-preview');
      setQualityHint('샘플 프리뷰입니다. 실제 iOS에서는 광어 근접 촬영 이미지가 표시됩니다.');
      return;
    }

    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.82 });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setQualityHint('흐림, 원거리, 어체 일부 누락, 다중 개체가 보이면 다시 찍기를 선택하세요.');
    }
  };

  const submit = () => {
    if (!selectedTankId || !photoUri) return;
    const resultId = createInspection({
      tankId: selectedTankId,
      photoUri,
      clues: selectedClues,
    });
    router.replace({ pathname: '/result/[resultId]', params: { resultId } });
  };

  if (!selectedTankId) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + Space.lg, paddingBottom: insets.bottom + Space.lg }]}>
        <Text selectable style={styles.permissionTitle}>
          촬영할 수조가 없습니다
        </Text>
        <ActionButton label="수조 추가" icon="plus" onPress={() => router.replace('/add-tank')} />
      </View>
    );
  }

  const permissionDenied = !isWeb && permission && !permission.granted && !permission.canAskAgain;

  return (
    <View style={styles.root}>
      <View style={styles.cameraArea}>
        {photoUri ? (
          photoUri.startsWith('mock://') ? (
            <View style={styles.mockPreview}>
              <View style={styles.mockFish} />
              <Text selectable style={styles.mockText}>
                촬영 미리보기
              </Text>
            </View>
          ) : (
            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )
        ) : permissionDenied ? (
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
            <View style={styles.mockFish} />
            <Text selectable style={styles.mockText}>
              iOS 카메라 뷰
            </Text>
          </View>
        ) : (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        )}

        <View pointerEvents="none" style={styles.guideLayer}>
          <View style={styles.frameGuide}>
            <Text selectable={false} style={styles.guideText}>
              광어 단일 개체 · 근접 · 어체 전체
            </Text>
          </View>
        </View>

        <View style={[styles.topBar, { paddingTop: insets.top + Space.sm }]}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.closeButton}>
            <Text selectable={false} style={styles.closeText}>
              닫기
            </Text>
          </Pressable>
          <View style={styles.tankPill}>
            <Text selectable style={styles.tankPillText}>
              {selectedTankId} · {selectedTank?.groupId ?? '수조군'}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.controlPanel, { paddingBottom: insets.bottom + Space.lg }]}>
        <View style={styles.hintBox}>
          <Text selectable style={styles.hintTitle}>
            촬영 품질 힌트
          </Text>
          <Text selectable style={styles.hintText}>
            {qualityHint}
          </Text>
        </View>

        <View style={styles.clueSection}>
          <Text selectable style={styles.clueTitle}>
            이상 행동 단서
          </Text>
          <View style={styles.clueGrid}>
            {behaviorClues.map((clue) => {
              const active = selectedClues.includes(clue);
              return (
                <Pressable
                  key={clue}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  onPress={() => toggleClue(clue)}
                  style={[styles.clueChip, active && styles.clueChipActive]}
                >
                  <Text selectable={false} style={[styles.clueChipText, active && styles.clueChipTextActive]}>
                    {clue}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          {photoUri ? (
            <>
              <ActionButton label="다시 찍기" icon="arrow.counterclockwise" variant="secondary" onPress={() => setPhotoUri(undefined)} style={styles.actionFlex} />
              <ActionButton label="전송" icon="paperplane.fill" onPress={submit} style={styles.actionFlex} />
            </>
          ) : (
            <ActionButton label={isWeb ? '샘플 촬영' : '촬영'} icon="camera.fill" onPress={takePhoto} style={styles.captureButton} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.black,
    flex: 1,
  },
  cameraArea: {
    backgroundColor: Palette.black,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
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
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    borderRadius: Radius.pill,
    minHeight: 42,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  closeText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '900',
  },
  tankPill: {
    backgroundColor: Palette.accentBg,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tankPillText: {
    color: Palette.accent,
    fontSize: 15,
    fontWeight: '900',
  },
  guideLayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
  },
  frameGuide: {
    alignItems: 'center',
    aspectRatio: 1.45,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: Radius.card,
    borderWidth: 2,
    justifyContent: 'flex-end',
    padding: Space.md,
    width: '86%',
  },
  guideText: {
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    borderRadius: Radius.pill,
    color: Palette.white,
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mockPreview: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
    backgroundColor: '#314440',
    justifyContent: 'center',
    gap: Space.md,
  },
  mockFish: {
    backgroundColor: '#A4BDB5',
    borderRadius: 999,
    height: 70,
    transform: [{ rotate: '-6deg' }],
    width: '72%',
  },
  mockText: {
    color: '#D9E5E1',
    fontSize: 17,
    fontWeight: '900',
  },
  permissionBox: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: Space.xl,
  },
  permissionTitle: {
    color: Palette.white,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  permissionBody: {
    color: '#C9D8D5',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: Space.sm,
    textAlign: 'center',
  },
  controlPanel: {
    backgroundColor: Palette.canvas,
    gap: Space.lg,
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
  },
  hintBox: {
    backgroundColor: Palette.blueBg,
    borderColor: '#BCD4EA',
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 5,
    padding: Space.md,
  },
  hintTitle: {
    color: Palette.blue,
    fontSize: 14,
    fontWeight: '900',
  },
  hintText: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  clueSection: {
    gap: Space.sm,
  },
  clueTitle: {
    color: Palette.text,
    fontSize: 16,
    fontWeight: '900',
  },
  clueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  clueChip: {
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.pill,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  clueChipActive: {
    backgroundColor: Palette.accent,
    borderColor: Palette.accent,
  },
  clueChipText: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  clueChipTextActive: {
    color: Palette.white,
  },
  actions: {
    flexDirection: 'row',
    gap: Space.md,
  },
  actionFlex: {
    flex: 1,
  },
  captureButton: {
    flex: 1,
  },
});
