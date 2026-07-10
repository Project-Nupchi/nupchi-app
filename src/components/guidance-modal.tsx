import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';

import { GuidanceReportContent } from '@/components/guidance-report-content';
import { Palette, Radius, Shadow, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';

type GuidanceModalProps = {
  /** Backend `aiResultId` returned by `/diagnose`. */
  aiResultId?: string;
  /** Compatibility alias while result routes migrate to `aiResultId`. */
  resultId?: string;
  groupId: string;
  visible: boolean;
  onClose: () => void;
};

const MODAL_HEIGHT = 554;
const MODAL_WIDTH = 353;
const guidanceSiren = require('../../assets/images/results/guidance-siren.png');
const guidanceClose = require('../../assets/images/results/guidance-close.png');

const webBackdropBlur =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' } as unknown as ViewStyle)
    : null;

export function GuidanceModal({
  aiResultId,
  onClose,
  resultId,
  visible,
}: GuidanceModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const modalHeight = Math.min(MODAL_HEIGHT, Math.max(320, windowHeight - Space.lg * 2));
  const modalOffset = windowHeight >= MODAL_HEIGHT + Space.xxl * 2 ? Space.xl - Space.xxs : 0;
  const guideResultId = aiResultId ?? resultId;

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={styles.layer}>
        <Pressable
          accessible={false}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, styles.dim, webBackdropBlur]}
        />

        <View style={[styles.card, { height: modalHeight, transform: [{ translateY: modalOffset }] }]}>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Image
                  accessibilityIgnoresInvertColors
                  accessible={false}
                  contentFit="contain"
                  source={guidanceSiren}
                  style={styles.titleIcon}
                />
                <Text accessibilityRole="header" selectable style={styles.title}>
                  {AppCopy.guidance.procedureTitle}
                </Text>
              </View>

              <Pressable
                accessibilityLabel={AppCopy.common.close}
                accessibilityRole="button"
                hitSlop={Space.sm}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Image
                  accessibilityIgnoresInvertColors
                  accessible={false}
                  contentFit="contain"
                  source={guidanceClose}
                  style={styles.closeIcon}
                />
              </Pressable>
            </View>

            <GuidanceReportContent aiResultId={guideResultId} compact enabled={visible} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Space.lg,
  },
  dim: {
    backgroundColor: Palette.modalDim,
  },
  card: {
    backgroundColor: Palette.surface,
    borderColor: Palette.glassHairline,
    borderRadius: Radius.card,
    borderWidth: 1,
    maxWidth: MODAL_WIDTH,
    overflow: 'hidden',
    width: '100%',
    ...Shadow.card,
  },
  content: {
    flexGrow: 1,
    gap: Space.lg + Space.xs,
    paddingBottom: Space.xl,
    paddingHorizontal: Space.lg,
    paddingTop: Space.xl,
  },
  header: {
    height: Space.xl,
    justifyContent: 'center',
    position: 'relative',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.sm,
  },
  titleIcon: {
    height: 24,
    width: 24,
  },
  title: {
    color: Palette.text,
    ...Type.title,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: -Space.sm - Space.xxs,
    top: -Space.sm,
    width: 44,
  },
  closeIcon: {
    height: 24,
    width: 24,
  },
  pressed: {
    opacity: 0.7,
  },
});
