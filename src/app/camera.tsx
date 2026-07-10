import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Asset } from 'expo-asset';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoReviewScreen } from '@/components/photo-review-screen';
import { FigmaTokens, Palette, Radius, Shadow, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import { WEB_TEST_IMAGES, type WebTestImage } from '@/constants/web-test-images';
import {
  prepareImageForUpload,
  type PreparedImage,
} from '@/services/image-upload';
import { useAquaculture } from '@/state/aquaculture-store';

// Figma camera design assets (node 202:253)
const closeImg = require('../../assets/images/camera/close.png');
const galleryImg = require('../../assets/images/camera/gallery.png');
const guideFrameImg = require('../../assets/images/camera/guide-frame.png');

type CaptureMode = 'capture' | 'review';

// 카메라 FAB에서 바로 촬영 화면으로 진입한다. 촬영 또는 갤러리 선택을 마친 뒤
// 실제 사진을 확인하고 수조를 선택한 시점에만 분석을 시작한다.
export default function CameraScreen() {
  const isWeb = Platform.OS === 'web';
  const { tankId } = useLocalSearchParams<{ tankId?: string }>();
  const { tanks, createInspection } = useAquaculture();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const permissionRequestedRef = useRef(false);
  const permissionRequestInFlightRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mode, setMode] = useState<CaptureMode>('capture');
  const [preparedImage, setPreparedImage] = useState<PreparedImage | null>(null);
  const [selectedTankId, setSelectedTankId] = useState<string | undefined>(tankId);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestCameraPermissionSafely = useCallback(async () => {
    if (permissionRequestInFlightRef.current) return undefined;
    permissionRequestInFlightRef.current = true;
    try {
      return await requestCameraPermission();
    } catch {
      setMessage(AppCopy.camera.errors.cameraPermissionRequest);
      return undefined;
    } finally {
      permissionRequestInFlightRef.current = false;
    }
  }, [requestCameraPermission]);

  useEffect(() => {
    if (isWeb) return;
    if (mode !== 'capture') return;
    if (
      cameraPermission &&
      !cameraPermission.granted &&
      cameraPermission.canAskAgain &&
      !permissionRequestedRef.current
    ) {
      permissionRequestedRef.current = true;
      void requestCameraPermissionSafely();
    }
  }, [cameraPermission, isWeb, mode, requestCameraPermissionSafely]);

  const startInspection = async () => {
    if (!preparedImage || !selectedTankId || !tanks.some((tank) => tank.id === selectedTankId && tank.active)) return;

    setMessage(null);
    setIsSubmitting(true);

    try {
      const created = await createInspection({ tankId: selectedTankId, image: preparedImage });
      if (!created.ok) {
        setMessage(created.message);
        return;
      }

      router.replace({ pathname: '/result/[resultId]', params: { resultId: created.id } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickFromGallery = async () => {
    if (isSubmitting) return;

    setMessage(null);
    setIsSubmitting(true);
    setCameraActive(false);

    try {
      // The system photo picker does not require full photo-library permission. Requesting it
      // here can terminate iOS builds whose native Info.plist has not yet been regenerated.
      // Give iOS one frame to pause the active camera before presenting another native screen.
      if (Platform.OS === 'ios') {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
        quality: 1,
        selectionLimit: 1,
        shouldDownloadFromNetwork: true,
      });

      if (picked.canceled) {
        setCameraActive(true);
        return;
      }

      const asset = picked.assets?.[0];
      if (!asset?.uri) {
        setCameraActive(true);
        setMessage(AppCopy.camera.errors.selectedPhoto);
        return;
      }

      setPreparedImage(await prepareImageForUpload(asset, { source: 'library' }));
      setMode('review');
    } catch (reason) {
      setCameraActive(true);
      setMessage(getImageErrorMessage(reason, AppCopy.camera.errors.gallery));
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
        const permission = await requestCameraPermissionSafely();
        if (!permission?.granted) {
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

      const fileName = `nupchi-camera-${Date.now()}.${photo.format}`;
      const mimeType = photo.format === 'png' ? 'image/png' : 'image/jpeg';
      const file = Platform.OS === 'web' ? await createWebCameraFile(photo.uri, fileName, mimeType) : undefined;
      setPreparedImage(
        await prepareImageForUpload(
          {
            uri: photo.uri,
            width: photo.width,
            height: photo.height,
            type: 'image',
            fileName,
            mimeType,
            file,
          },
          { source: 'camera' }
        )
      );
      setMode('review');
    } catch (reason) {
      setMessage(getImageErrorMessage(reason, AppCopy.camera.errors.savePhoto));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 웹 데모 전용: 실제 촬영 대신 미리 번들된 샘플 사진을 선택해 리뷰 단계로 넘긴다.
  const selectTestImage = async (image: WebTestImage) => {
    if (isSubmitting) return;

    setMessage(null);
    setIsSubmitting(true);

    try {
      const asset = Asset.fromModule(image.source);
      if (!asset.uri) {
        setMessage(AppCopy.camera.errors.selectedPhoto);
        return;
      }

      const extension = image.mimeType === 'image/png' ? 'png' : 'jpg';
      const fileName = `nupchi-${image.id}.${extension}`;
      const file = await createWebCameraFile(asset.uri, fileName, image.mimeType);
      setPreparedImage(
        await prepareImageForUpload(
          {
            uri: asset.uri,
            width: asset.width ?? 0,
            height: asset.height ?? 0,
            type: 'image',
            fileName,
            mimeType: image.mimeType,
            file,
          },
          { source: 'camera' }
        )
      );
      setMode('review');
    } catch (reason) {
      setMessage(getImageErrorMessage(reason, AppCopy.camera.errors.selectedPhoto));
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnToCapture = () => {
    if (isSubmitting) return;
    setMessage(null);
    setPreparedImage(null);
    setCameraReady(false);
    setCameraActive(true);
    setMode('capture');
  };

  if (mode === 'review' && preparedImage) {
    return (
      <PhotoReviewScreen
        bottomInset={insets.bottom}
        isSubmitting={isSubmitting}
        message={message}
        onBack={returnToCapture}
        onNext={startInspection}
        onSelectTank={setSelectedTankId}
        photoUri={preparedImage.uri}
        selectedTankId={selectedTankId}
        tanks={tanks}
        topInset={insets.top}
      />
    );
  }

  if (isWeb) {
    return (
      <WebCaptureView
        bottomInset={insets.bottom}
        isSubmitting={isSubmitting}
        message={message}
        onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        onSelectImage={selectTestImage}
        testImages={WEB_TEST_IMAGES}
        topInset={insets.top}
      />
    );
  }

  return (
    <CameraCaptureView
      bottomInset={insets.bottom}
      cameraActive={cameraActive}
      cameraReady={cameraReady}
      isSubmitting={isSubmitting}
      message={message}
      onCameraReady={() => setCameraReady(true)}
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onMountError={() => setMessage(AppCopy.camera.errors.mountCamera)}
      onPickFromGallery={pickFromGallery}
      onRequestPermission={requestCameraPermissionSafely}
      onTakePhoto={takePhoto}
      permission={cameraPermission}
      refObject={cameraRef}
      topInset={insets.top}
    />
  );
}

function CameraCaptureView({
  bottomInset,
  cameraActive,
  cameraReady,
  isSubmitting,
  message,
  onCameraReady,
  onClose,
  onMountError,
  onPickFromGallery,
  onRequestPermission,
  onTakePhoto,
  permission,
  refObject,
  topInset,
}: {
  bottomInset: number;
  cameraActive: boolean;
  cameraReady: boolean;
  isSubmitting: boolean;
  message: string | null;
  onCameraReady: () => void;
  onClose: () => void;
  onMountError: () => void;
  onPickFromGallery: () => void;
  onRequestPermission: () => Promise<unknown>;
  onTakePhoto: () => void;
  permission: ReturnType<typeof useCameraPermissions>[0];
  refObject: RefObject<CameraView | null>;
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
        <PermissionState
          body={AppCopy.camera.permissionDeniedBody}
          buttonLabel={AppCopy.camera.gallery}
          onPress={onPickFromGallery}
        />
      );
    }

    if (permissionNeedsAction) {
      return (
        <PermissionState
          body={AppCopy.camera.permissionBody}
          buttonLabel={AppCopy.camera.requestPermission}
          onPress={onRequestPermission}
        />
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
        active={cameraActive}
        ref={refObject}
        facing="back"
        onCameraReady={onCameraReady}
        onMountError={onMountError}
        style={StyleSheet.absoluteFill}
      />
    );
  };

  return (
    <View style={styles.cameraRoot}>
      {renderCameraState()}

      <View style={[styles.cameraTopBar, { top: topInset }]}>
        <Pressable
          accessibilityLabel={AppCopy.camera.close}
          accessibilityRole="button"
          disabled={isSubmitting}
          hitSlop={Space.sm}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.controlPressed]}
        >
          <Image contentFit="contain" source={closeImg} style={styles.closeIcon} />
        </Pressable>
      </View>

      {message ? (
        <View
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={[styles.cameraMessageBanner, { top: topInset + CAMERA_APP_BAR_HEIGHT + Space.sm }]}
        >
          <Text selectable style={styles.cameraMessageText}>
            {message}
          </Text>
        </View>
      ) : null}

      <View pointerEvents="none" style={styles.guideOverlay}>
        <Image contentFit="contain" source={guideFrameImg} style={styles.guideFrame} />
        <View style={[styles.guideChip, guideBlur]}>
          <Text selectable={false} style={styles.guideText}>
            {AppCopy.camera.framingGuide}
          </Text>
        </View>
      </View>

      <View style={[styles.bottomBar, { bottom: bottomInset + Space.sm }]}>
        <Pressable
          accessibilityLabel={AppCopy.camera.gallery}
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onPickFromGallery}
          style={({ pressed }) => [
            styles.galleryButton,
            isSubmitting && styles.disabled,
            pressed && !isSubmitting && styles.controlPressed,
          ]}
        >
          <Image contentFit="contain" source={galleryImg} style={styles.galleryIcon} />
        </Pressable>

        <View style={styles.shutterBlock}>
          <Pressable
            accessibilityLabel={AppCopy.navigation.capture}
            accessibilityRole="button"
            disabled={!canCapture}
            onPress={onTakePhoto}
            style={({ pressed }) => [
              styles.shutter,
              !canCapture && styles.disabled,
              pressed && canCapture && styles.shutterPressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Palette.inkStrong} />
            ) : (
              <View style={styles.shutterInner} />
            )}
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

// 웹 데모 화면: 실제 카메라 대신 하단에서 준비된 샘플 사진 5장을 선택한다.
function WebCaptureView({
  bottomInset,
  isSubmitting,
  message,
  onClose,
  onSelectImage,
  testImages,
  topInset,
}: {
  bottomInset: number;
  isSubmitting: boolean;
  message: string | null;
  onClose: () => void;
  onSelectImage: (image: WebTestImage) => void;
  testImages: WebTestImage[];
  topInset: number;
}) {
  return (
    <View style={styles.cameraRoot}>
      <View style={[styles.cameraTopBar, { top: topInset }]}>
        <Pressable
          accessibilityLabel={AppCopy.camera.close}
          accessibilityRole="button"
          disabled={isSubmitting}
          hitSlop={Space.sm}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.controlPressed]}
        >
          <Image contentFit="contain" source={closeImg} style={styles.closeIcon} />
        </Pressable>
      </View>

      {message ? (
        <View
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={[styles.cameraMessageBanner, { top: topInset + CAMERA_APP_BAR_HEIGHT + Space.sm }]}
        >
          <Text selectable style={styles.cameraMessageText}>
            {message}
          </Text>
        </View>
      ) : null}

      <View style={[styles.webStack, { top: topInset + CAMERA_APP_BAR_HEIGHT, bottom: bottomInset + Space.lg }]}>
        <Image contentFit="contain" source={guideFrameImg} style={styles.webGuideFrame} />
        <View style={[styles.guideChip, guideBlur]}>
          <Text selectable={false} style={styles.guideText}>
            {AppCopy.camera.framingGuide}
          </Text>
        </View>

        <View style={styles.webThumbRow}>
          {testImages.map((image) => (
            <Pressable
              accessibilityLabel={AppCopy.camera.webTest.imageLabel(image.label)}
              accessibilityRole="button"
              disabled={isSubmitting}
              key={image.id}
              onPress={() => onSelectImage(image)}
              style={({ pressed }) => [
                styles.webThumb,
                isSubmitting && styles.disabled,
                pressed && !isSubmitting && styles.controlPressed,
              ]}
            >
              <Image contentFit="cover" source={image.source} style={styles.webThumbImage} />
              <Text selectable={false} style={styles.webThumbLabel}>
                {image.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.webNotice}>
          <Text selectable={false} style={styles.webNoticeTitle}>
            {AppCopy.camera.webTest.title}
          </Text>
          <Text selectable={false} style={styles.webNoticeSubtitle}>
            {AppCopy.camera.webTest.subtitle}
          </Text>
        </View>

        {isSubmitting ? <ActivityIndicator color={Palette.white} /> : null}
      </View>
    </View>
  );
}

function PermissionState({
  body,
  buttonLabel,
  onPress,
}: {
  body: string;
  buttonLabel: string;
  onPress: () => void | Promise<unknown>;
}) {
  return (
    <View style={styles.permissionBox}>
      <Text selectable style={styles.permissionTitle}>
        {AppCopy.camera.permissionTitle}
      </Text>
      <Text selectable style={styles.permissionBody}>
        {body}
      </Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.cameraFallbackButton}>
        <Text selectable={false} style={styles.cameraFallbackButtonText}>
          {buttonLabel}
        </Text>
      </Pressable>
    </View>
  );
}

async function createWebCameraFile(uri: string, fileName: string, mimeType: string) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(AppCopy.camera.errors.capturedPhoto);
  return new File([await response.blob()], fileName, { type: mimeType });
}

function getImageErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

const CAMERA_APP_BAR_HEIGHT = Space.lg * 3;
const GUIDE_ASPECT_RATIO = 275 / 168;
const SHUTTER_SIZE = 78;
const SHUTTER_INNER_SIZE = 56;
const GALLERY_BUTTON_SIZE = 64;
// 모바일 화면을 기준으로 한 줄에 3개가 들어가도록 크기와 행 최대 폭을 맞춘다(위 3개·아래 2개).
const WEB_THUMB_SIZE = 88;
const WEB_THUMB_GAP = Space.sm + Space.xs;
const WEB_THUMBS_PER_ROW = 3;
const WEB_THUMB_ROW_MAX_WIDTH = WEB_THUMBS_PER_ROW * WEB_THUMB_SIZE + (WEB_THUMBS_PER_ROW - 1) * WEB_THUMB_GAP;

const guideBlur =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' } as unknown as ViewStyle)
    : null;

const styles = StyleSheet.create({
  cameraRoot: {
    backgroundColor: Palette.inkStrong,
    flex: 1,
    overflow: 'hidden',
  },
  cameraTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: CAMERA_APP_BAR_HEIGHT,
    left: 0,
    paddingHorizontal: Space.sm + Space.xxs,
    position: 'absolute',
    right: 0,
    zIndex: 5,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeIcon: {
    height: 24,
    width: 24,
  },
  cameraMessageBanner: {
    backgroundColor: FigmaTokens.color.gray[900],
    borderColor: FigmaTokens.color.white[20],
    borderRadius: Radius.button,
    borderWidth: 1,
    left: Space.lg,
    paddingHorizontal: Space.sm + Space.xs,
    paddingVertical: Space.sm,
    position: 'absolute',
    right: Space.lg,
    zIndex: 6,
  },
  cameraMessageText: {
    color: Palette.white,
    textAlign: 'center',
    ...Type.body2,
  },
  guideOverlay: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: '36.7%',
    zIndex: 2,
  },
  guideFrame: {
    aspectRatio: GUIDE_ASPECT_RATIO,
    maxWidth: 275,
    width: '70%',
  },
  guideChip: {
    alignItems: 'center',
    backgroundColor: FigmaTokens.color.gray[500],
    borderRadius: Radius.button,
    justifyContent: 'center',
    marginTop: Space.md + Space.sm,
    maxWidth: '90%',
    paddingHorizontal: Space.sm + Space.xs,
    paddingVertical: Space.sm,
  },
  guideText: {
    color: Palette.white,
    textAlign: 'center',
    ...Type.body2,
  },
  bottomBar: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: Space.lg,
    position: 'absolute',
    right: 0,
    zIndex: 5,
  },
  galleryButton: {
    alignItems: 'center',
    backgroundColor: FigmaTokens.color.white[20],
    borderColor: FigmaTokens.color.white[30],
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: GALLERY_BUTTON_SIZE,
    justifyContent: 'center',
    marginBottom: Space.lg,
    width: GALLERY_BUTTON_SIZE,
    ...Shadow.navigation,
  },
  galleryIcon: {
    height: 28,
    width: 28,
  },
  galleryButtonPlaceholder: {
    height: GALLERY_BUTTON_SIZE,
    marginBottom: Space.lg,
    width: GALLERY_BUTTON_SIZE,
  },
  shutterBlock: {
    alignItems: 'center',
    gap: Space.sm - Space.xxs,
    width: SHUTTER_SIZE,
  },
  shutter: {
    alignItems: 'center',
    backgroundColor: FigmaTokens.color.white[20],
    borderColor: Palette.white,
    borderRadius: Radius.pill,
    borderWidth: 5,
    height: SHUTTER_SIZE,
    justifyContent: 'center',
    width: SHUTTER_SIZE,
  },
  shutterPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  shutterInner: {
    backgroundColor: Palette.white,
    borderRadius: Radius.pill,
    height: SHUTTER_INNER_SIZE,
    width: SHUTTER_INNER_SIZE,
  },
  shutterHint: {
    color: Palette.white,
    textAlign: 'center',
    width: SHUTTER_SIZE,
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
    zIndex: 3,
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
  controlPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  webStack: {
    alignItems: 'center',
    gap: Space.lg,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: Space.md,
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
  webGuideFrame: {
    aspectRatio: GUIDE_ASPECT_RATIO,
    maxWidth: 220,
    width: '55%',
  },
  webThumbRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: WEB_THUMB_GAP,
    justifyContent: 'center',
    maxWidth: WEB_THUMB_ROW_MAX_WIDTH,
  },
  webThumb: {
    alignItems: 'center',
    gap: Space.xs,
    width: WEB_THUMB_SIZE,
  },
  webNotice: {
    alignItems: 'center',
    gap: Space.xxs,
  },
  webNoticeTitle: {
    color: Palette.white,
    textAlign: 'center',
    ...Type.body2,
  },
  webNoticeSubtitle: {
    color: Palette.inkMuted,
    textAlign: 'center',
    ...Type.caption,
  },
  webThumbImage: {
    backgroundColor: FigmaTokens.color.gray[500],
    borderColor: FigmaTokens.color.white[20],
    borderRadius: Radius.image,
    borderWidth: 1,
    height: WEB_THUMB_SIZE,
    width: WEB_THUMB_SIZE,
  },
  webThumbLabel: {
    color: Palette.inkMuted,
    textAlign: 'center',
    ...Type.caption,
  },
});
