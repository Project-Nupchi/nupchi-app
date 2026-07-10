import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FigmaTokens, Gradient, Palette, Radius, Shadow, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import { Tank, TankStatus, formatDateTime, getLatestResult, getTankGroupStatus, sortTanksByRisk, statusLabel } from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

const cameraImg = require('../../assets/images/home/camera.png');
const chevronDarkImg = require('../../assets/images/home/chevron-dark.png');

type CaptureMode = 'select' | 'camera';

const statusTone: Record<TankStatus, { backgroundColor: string; color: string; borderColor: string }> = {
  normal: {
    backgroundColor: Palette.normalBg,
    borderColor: Palette.normalLine,
    color: Palette.normal,
  },
  caution: {
    backgroundColor: Palette.cautionBg,
    borderColor: Palette.cautionLine,
    color: Palette.caution,
  },
  suspicious: {
    backgroundColor: Palette.suspiciousBg,
    borderColor: Palette.suspiciousLine,
    color: Palette.suspicious,
  },
};

// 촬영/업로드 — 수조를 먼저 선택한 뒤 카메라 또는 갤러리 사진으로 분석을 시작
export default function CameraScreen() {
  const { tankId } = useLocalSearchParams<{ tankId?: string }>();
  const { tanks, results, createInspection } = useAquaculture();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const permissionRequestedRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const sortedTanks = useMemo(() => sortTanksByRisk(tanks, results), [results, tanks]);
  const initialTankId = tankId && tanks.some((tank) => tank.id === tankId) ? tankId : undefined;
  const [selectedTankId, setSelectedTankId] = useState<string | undefined>(initialTankId);
  const [mode, setMode] = useState<CaptureMode>('select');
  const [cameraReady, setCameraReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveSelectedTankId =
    selectedTankId && tanks.some((tank) => tank.id === selectedTankId) ? selectedTankId : sortedTanks[0]?.id;
  const selectedTank = tanks.find((tank) => tank.id === effectiveSelectedTankId);
  const canContinue = Boolean(effectiveSelectedTankId && !isSubmitting);

  useEffect(() => {
    if (mode !== 'camera') return;
    if (cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain && !permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      requestCameraPermission().catch(() => {
        setMessage(AppCopy.camera.errors.cameraPermissionRequest);
      });
    }
  }, [cameraPermission, mode, requestCameraPermission]);

  const startInspection = async (photoUri?: string) => {
    if (!effectiveSelectedTankId) {
      router.replace('/add-tank');
      return;
    }
    const created = await createInspection({ tankId: effectiveSelectedTankId, photoUri, clues: [] });
    if (!created.ok) {
      setMessage(created.message);
      return;
    }
    router.replace({ pathname: '/result/[resultId]', params: { resultId: created.id } });
  };

  const openCamera = async () => {
    if (!canContinue) return;
    setMessage(null);
    setCameraReady(false);
    setMode('camera');
  };

  const pickFromGallery = async () => {
    if (!canContinue) return;

    setMessage(null);
    setIsSubmitting(true);

    try {
      const permission = await requestMediaPermission();
      if (!permission.granted) {
        setMessage(AppCopy.camera.errors.mediaPermission);
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        quality: 0.82,
        selectionLimit: 1,
      });

      if (picked.canceled) return;

      const photoUri = picked.assets?.[0]?.uri;
      if (!photoUri) {
        setMessage(AppCopy.camera.errors.selectedPhoto);
        return;
      }

      await startInspection(photoUri);
    } catch {
      setMessage(AppCopy.camera.errors.gallery);
    } finally {
      setIsSubmitting(false);
    }
  };

  const takePhoto = async () => {
    if (isSubmitting) return;

    setMessage(null);
    setIsSubmitting(true);

    try {
      if (!cameraPermission?.granted) {
        const permission = await requestCameraPermission();
        if (!permission.granted) {
          setMessage(AppCopy.camera.errors.cameraPermission);
          return;
        }
      }

      if (!cameraRef.current || !cameraReady) {
        setMessage(AppCopy.camera.errors.cameraNotReady);
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.82 });
      if (!photo?.uri) {
        setMessage(AppCopy.camera.errors.capturedPhoto);
        return;
      }

      await startInspection(photo.uri);
    } catch {
      setMessage(AppCopy.camera.errors.savePhoto);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (mode === 'camera') {
      return (
        <CameraCaptureView
          cameraReady={cameraReady}
          isSubmitting={isSubmitting}
          message={message}
          onBack={() => {
            setMode('select');
            setMessage(null);
          }}
          onCameraReady={() => setCameraReady(true)}
          onMountError={() => setMessage(AppCopy.camera.errors.mountCamera)}
          onPickFromGallery={pickFromGallery}
          onRequestPermission={requestCameraPermission}
          onTakePhoto={takePhoto}
          permission={cameraPermission}
          refObject={cameraRef}
          selectedTank={selectedTank}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      );
    }

    return (
      <View style={styles.selectRoot}>
        <LinearGradient colors={[...Gradient.colors]} locations={[...Gradient.locations]} style={StyleSheet.absoluteFill} />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.selectScroll, { paddingTop: insets.top + Space.lg, paddingBottom: insets.bottom + Space.xxl }]}
        >
          <View style={styles.selectContainer}>
            <View style={styles.selectHeader}>
              <Pressable accessibilityLabel={AppCopy.camera.close} accessibilityRole="button" onPress={() => router.back()} style={styles.lightIconButton}>
                <Text selectable={false} style={styles.closeGlyph}>
                  x
                </Text>
              </Pressable>
              <View style={styles.headerCopy}>
                <Text selectable style={styles.eyebrow}>
                  {AppCopy.camera.title}
                </Text>
                <Text selectable style={styles.title}>
                  {AppCopy.camera.selectTank}
                </Text>
              </View>
            </View>

            {message ? (
              <View style={styles.messageBanner}>
                <Text selectable style={styles.messageText}>
                  {message}
                </Text>
              </View>
            ) : null}

            {sortedTanks.length > 0 ? (
              <View style={styles.tankList}>
                {sortedTanks.map((tank) => (
                  <TankSelectCard
                    key={tank.id}
                    onPress={() => setSelectedTankId(tank.id)}
                    resultCapturedAt={getLatestResult(results, tank.id)?.capturedAt}
                    selected={tank.id === selectedTankId}
                    status={getTankGroupStatus(tanks, results, tank)}
                    tank={tank}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text selectable style={styles.emptyTitle}>
                  {AppCopy.camera.noTanks}
                </Text>
                <Text selectable style={styles.emptyBody}>
                  {AppCopy.camera.noTanksBody}
                </Text>
                <Pressable accessibilityRole="button" onPress={() => router.replace('/add-tank')} style={styles.primaryButton}>
                  <Text selectable={false} style={styles.primaryButtonText}>
                    {AppCopy.camera.addTank}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        {sortedTanks.length > 0 ? (
          <View style={[styles.actionDock, { paddingBottom: insets.bottom + Space.lg }]}>
            <View style={styles.selectedSummary}>
              <Text selectable style={styles.selectedLabel}>
                {AppCopy.camera.selectedTank}
              </Text>
              <Text selectable style={styles.selectedTankText}>
                {selectedTank?.id ?? effectiveSelectedTankId} · {selectedTank?.groupId ?? AppCopy.common.tankGroupFallback}
              </Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={!canContinue}
                onPress={pickFromGallery}
                style={({ pressed }) => [styles.secondaryAction, !canContinue && styles.disabled, pressed && canContinue && styles.pressed]}
              >
                <Text selectable={false} style={styles.secondaryActionText}>
                  {AppCopy.camera.gallery}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!canContinue}
                onPress={openCamera}
                style={({ pressed }) => [styles.primaryAction, !canContinue && styles.disabled, pressed && canContinue && styles.pressed]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={Palette.onPrimary} />
                ) : (
                  <>
                    <Image source={cameraImg} style={styles.actionIcon} contentFit="contain" />
                    <Text selectable={false} style={styles.primaryActionText}>
                      {AppCopy.camera.takePhoto}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return renderContent();
}

function TankSelectCard({
  onPress,
  resultCapturedAt,
  selected,
  status,
  tank,
}: {
  onPress: () => void;
  resultCapturedAt?: string;
  selected: boolean;
  status: TankStatus;
  tank: Tank;
}) {
  const tone = statusTone[status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tankCard, selected && styles.tankCardSelected, pressed && styles.pressed]}
    >
      <View style={styles.tankCardTop}>
        <View style={styles.tankCardTitleBlock}>
          <Text selectable style={styles.tankId}>
            {tank.id}
          </Text>
          <Text selectable style={styles.tankMeta}>
            {tank.groupId} · {tank.stockedInfo}
          </Text>
        </View>
        <View style={[styles.statusPill, tone]}>
          <Text selectable={false} style={[styles.statusText, { color: tone.color }]}>
            {statusLabel[status]}
          </Text>
        </View>
      </View>
      <View style={styles.tankCardBottom}>
        <Text selectable style={styles.lastCaptureText}>
          {resultCapturedAt ? AppCopy.camera.latestAnalysis(formatDateTime(resultCapturedAt)) : AppCopy.camera.noAnalysis}
        </Text>
        <Image source={chevronDarkImg} style={styles.chevron} contentFit="contain" />
      </View>
    </Pressable>
  );
}

function CameraCaptureView({
  bottomInset,
  cameraReady,
  isSubmitting,
  message,
  onBack,
  onCameraReady,
  onMountError,
  onPickFromGallery,
  onRequestPermission,
  onTakePhoto,
  permission,
  refObject,
  selectedTank,
  topInset,
}: {
  bottomInset: number;
  cameraReady: boolean;
  isSubmitting: boolean;
  message: string | null;
  onBack: () => void;
  onCameraReady: () => void;
  onMountError: () => void;
  onPickFromGallery: () => void;
  onRequestPermission: () => Promise<unknown>;
  onTakePhoto: () => void;
  permission: ReturnType<typeof useCameraPermissions>[0];
  refObject: RefObject<CameraView | null>;
  selectedTank?: Tank;
  topInset: number;
}) {
  const permissionDenied = permission && !permission.granted && !permission.canAskAgain;
  const permissionNeedsAction = permission && !permission.granted && permission.canAskAgain;
  const canUseCamera = Boolean(permission?.granted);
  const canCapture = canUseCamera && cameraReady && !isSubmitting;

  const shutterHint = (() => {
    if (isSubmitting) return AppCopy.camera.saving;
    if (!canUseCamera) return AppCopy.camera.waitingPermission;
    if (!cameraReady) return AppCopy.camera.preparing;
    return AppCopy.camera.tapToCapture;
  })();

  const renderCameraState = () => {
    if (permissionDenied) {
      return (
        <View style={styles.permissionBox}>
          <Text selectable style={styles.permissionTitle}>
            {AppCopy.camera.permissionTitle}
          </Text>
          <Text selectable style={styles.permissionBody}>
            {AppCopy.camera.permissionDeniedBody}
          </Text>
          <Pressable accessibilityRole="button" onPress={onPickFromGallery} style={styles.cameraFallbackButton}>
            <Text selectable={false} style={styles.cameraFallbackButtonText}>
              {AppCopy.camera.gallery}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (permissionNeedsAction) {
      return (
        <View style={styles.permissionBox}>
          <Text selectable style={styles.permissionTitle}>
            {AppCopy.camera.permissionTitle}
          </Text>
          <Text selectable style={styles.permissionBody}>
            {AppCopy.camera.permissionBody}
          </Text>
          <Pressable accessibilityRole="button" onPress={onRequestPermission} style={styles.cameraFallbackButton}>
            <Text selectable={false} style={styles.cameraFallbackButtonText}>
              {AppCopy.camera.requestPermission}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (!canUseCamera) {
      return (
        <View style={styles.permissionBox}>
          <ActivityIndicator color={Palette.white} />
          <Text selectable style={styles.permissionBody}>
            {AppCopy.camera.checkingPermission}
          </Text>
        </View>
      );
    }

    return (
      <CameraView
        ref={refObject}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={onCameraReady}
        onMountError={onMountError}
      />
    );
  };

  return (
    <View style={styles.cameraRoot}>
      {renderCameraState()}

      {message ? (
        <View style={[styles.cameraMessageBanner, { top: topInset + Space.xxl }]}>
          <Text selectable style={styles.cameraMessageText}>
            {message}
          </Text>
        </View>
      ) : null}

      <View style={[styles.cameraTopBar, { paddingTop: topInset + Space.sm }]}>
        <Pressable accessibilityLabel={AppCopy.camera.backToSelection} accessibilityRole="button" onPress={onBack} style={styles.darkIconButton}>
          <Text selectable={false} style={styles.backGlyph}>
            ‹
          </Text>
        </Pressable>
        <View style={styles.tankPill}>
          <Text selectable style={styles.tankPillText}>
            {selectedTank?.id ?? AppCopy.addTank.tankId} · {selectedTank?.groupId ?? AppCopy.common.tankGroupFallback}
          </Text>
        </View>
      </View>

      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <View style={styles.guideChip}>
          <Text selectable={false} style={styles.guideText}>
            {AppCopy.camera.framingGuide}
          </Text>
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + Space.xl }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onPickFromGallery}
          style={({ pressed }) => [styles.galleryButton, pressed && styles.pressed]}
        >
          <Text selectable={false} style={styles.galleryButtonText}>
            {AppCopy.camera.galleryShort}
          </Text>
        </Pressable>
        <View style={styles.shutterBlock}>
          <Pressable
            accessibilityLabel={AppCopy.navigation.capture}
            accessibilityRole="button"
            disabled={!canCapture}
            onPress={onTakePhoto}
            style={({ pressed }) => [styles.shutter, !canCapture && styles.disabled, pressed && canCapture && styles.shutterPressed]}
          >
            {isSubmitting ? <ActivityIndicator color={Palette.inkStrong} /> : <View style={styles.shutterInner} />}
          </Pressable>
          <Text selectable style={styles.shutterHint}>
            {shutterHint}
          </Text>
        </View>
        <View style={styles.galleryButtonPlaceholder} />
      </View>
    </View>
  );
}

const CORNER = 28;

const styles = StyleSheet.create({
  selectRoot: {
    backgroundColor: Palette.canvas,
    flex: 1,
  },
  selectScroll: {
    gap: Space.lg,
  },
  selectContainer: {
    alignSelf: 'center',
    gap: Space.lg,
    maxWidth: 560,
    paddingHorizontal: Space.lg,
    width: '100%',
  },
  selectHeader: {
    alignItems: 'flex-start',
    gap: Space.md,
  },
  lightIconButton: {
    alignItems: 'center',
    backgroundColor: Palette.glassStrong,
    borderRadius: Radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...Shadow.card,
  },
  closeGlyph: {
    color: Palette.primary,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 24,
  },
  headerCopy: {
    gap: Space.xs,
  },
  eyebrow: {
    color: Palette.onGradientMuted,
    ...Type.heading2,
  },
  title: {
    color: Palette.white,
    ...Type.display,
  },
  messageBanner: {
    backgroundColor: Palette.glassStrong,
    borderColor: Palette.glassLine,
    borderRadius: Radius.button,
    borderWidth: 1,
    padding: Space.md,
    ...Shadow.card,
  },
  messageText: {
    color: Palette.text,
    ...Type.body2,
  },
  tankList: {
    gap: Space.md,
    paddingBottom: 164,
  },
  tankCard: {
    backgroundColor: Palette.glassStrong,
    borderColor: Palette.glassLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.lg,
    padding: Space.lg,
    ...Shadow.card,
  },
  tankCardSelected: {
    borderColor: Palette.primary,
    borderWidth: 2,
  },
  tankCardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Space.md,
    justifyContent: 'space-between',
  },
  tankCardTitleBlock: {
    flex: 1,
    gap: Space.xs,
  },
  tankId: {
    color: Palette.text,
    ...Type.heading1,
  },
  tankMeta: {
    color: Palette.textMuted,
    ...Type.body2,
  },
  statusPill: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: Space.xs,
  },
  statusText: {
    ...Type.label2,
  },
  tankCardBottom: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lastCaptureText: {
    color: Palette.textSubtle,
    ...Type.caption,
  },
  chevron: {
    height: 18,
    opacity: 0.65,
    width: 18,
  },
  emptyCard: {
    alignItems: 'flex-start',
    backgroundColor: Palette.glassStrong,
    borderColor: Palette.glassLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.md,
    padding: Space.lg,
    ...Shadow.card,
  },
  emptyTitle: {
    color: Palette.text,
    ...Type.heading1,
  },
  emptyBody: {
    color: Palette.textMuted,
    ...Type.body2,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.primary,
    borderRadius: Radius.roundButton,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Space.lg,
  },
  primaryButtonText: {
    color: Palette.onPrimary,
    ...Type.button,
  },
  actionDock: {
    backgroundColor: Palette.glassStrong,
    borderColor: Palette.glassLine,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderWidth: 1,
    bottom: 0,
    gap: Space.md,
    left: 0,
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    position: 'absolute',
    right: 0,
    ...Shadow.navigation,
  },
  selectedSummary: {
    alignSelf: 'center',
    gap: Space.xxs,
    maxWidth: 560,
    width: '100%',
  },
  selectedLabel: {
    color: Palette.textSubtle,
    ...Type.label3,
  },
  selectedTankText: {
    color: Palette.text,
    ...Type.body1,
  },
  actionRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Space.sm,
    maxWidth: 560,
    width: '100%',
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.roundButton,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: Space.md,
  },
  secondaryActionText: {
    color: Palette.primary,
    ...Type.button,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: Palette.primary,
    borderRadius: Radius.roundButton,
    flex: 1,
    flexDirection: 'row',
    gap: Space.sm,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: Space.md,
  },
  primaryActionText: {
    color: Palette.onPrimary,
    ...Type.button,
  },
  actionIcon: {
    height: 22,
    tintColor: Palette.onPrimary,
    width: 22,
  },
  cameraRoot: {
    backgroundColor: Palette.inkStrong,
    flex: 1,
  },
  cameraTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: Space.lg,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 5,
  },
  darkIconButton: {
    alignItems: 'center',
    backgroundColor: FigmaTokens.color.gray[800],
    borderColor: FigmaTokens.color.white[20],
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backGlyph: {
    color: Palette.white,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
  },
  tankPill: {
    backgroundColor: FigmaTokens.color.gray[800],
    borderColor: FigmaTokens.color.white[20],
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Space.md,
    paddingVertical: 10,
  },
  tankPillText: {
    color: Palette.white,
    ...Type.label2,
  },
  cameraMessageBanner: {
    backgroundColor: FigmaTokens.color.gray[900],
    borderColor: FigmaTokens.color.white[20],
    borderRadius: Radius.button,
    borderWidth: 1,
    left: Space.lg,
    padding: Space.md,
    position: 'absolute',
    right: Space.lg,
    zIndex: 4,
  },
  cameraMessageText: {
    color: Palette.white,
    ...Type.body2,
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
  cornerTL: { borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: Radius.image, left: 0, top: 0 },
  cornerTR: { borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: Radius.image, right: 0, top: 0 },
  cornerBL: { borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: Radius.image, bottom: 0, left: 0 },
  cornerBR: { borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: Radius.image, bottom: 0, right: 0 },
  guideChip: {
    backgroundColor: FigmaTokens.color.gray[800],
    borderRadius: Radius.pill,
    marginTop: Space.lg,
    paddingHorizontal: Space.md,
    paddingVertical: 9,
  },
  guideText: {
    color: Palette.white,
    ...Type.label2,
  },
  bottomBar: {
    alignItems: 'flex-end',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: Space.xl,
    position: 'absolute',
    right: 0,
  },
  galleryButton: {
    alignItems: 'center',
    backgroundColor: FigmaTokens.color.gray[800],
    borderColor: FigmaTokens.color.white[20],
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    marginBottom: 20,
    width: 72,
  },
  galleryButtonText: {
    color: Palette.white,
    ...Type.label2,
  },
  galleryButtonPlaceholder: {
    height: 52,
    marginBottom: 20,
    width: 72,
  },
  shutterBlock: {
    alignItems: 'center',
    gap: Space.sm,
  },
  shutter: {
    alignItems: 'center',
    backgroundColor: FigmaTokens.color.white[30],
    borderColor: Palette.white,
    borderRadius: Radius.pill,
    borderWidth: 4,
    height: 78,
    justifyContent: 'center',
    width: 78,
  },
  shutterPressed: {
    opacity: 0.72,
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
    ...Type.caption,
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
    textAlign: 'center',
    ...Type.heading1,
  },
  permissionBody: {
    color: Palette.inkMuted,
    marginTop: Space.sm,
    textAlign: 'center',
    ...Type.body2,
  },
  cameraFallbackButton: {
    backgroundColor: Palette.white,
    borderRadius: Radius.button,
    marginTop: Space.lg,
    minHeight: 48,
    paddingHorizontal: Space.lg,
    paddingVertical: 13,
  },
  cameraFallbackButtonText: {
    color: Palette.inkStrong,
    ...Type.button,
  },
  disabled: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
