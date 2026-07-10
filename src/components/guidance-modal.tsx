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

import { Palette, Radius, Shadow, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';

type GuidanceModalProps = {
  groupId: string;
  visible: boolean;
  onClose: () => void;
};

const MODAL_HEIGHT = 554;
const MODAL_WIDTH = 353;

const webBackdropBlur =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' } as unknown as ViewStyle)
    : null;

export function GuidanceModal({ groupId, onClose, visible }: GuidanceModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const modalHeight = Math.min(MODAL_HEIGHT, Math.max(320, windowHeight - Space.lg * 2));
  const modalOffset = windowHeight >= MODAL_HEIGHT + Space.xxl * 2 ? Space.xl - Space.xxs : 0;

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
            <View style={styles.mainContent}>
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Text accessibilityElementsHidden selectable={false} style={styles.siren}>
                    🚨
                  </Text>
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
                  <View style={styles.closeIcon}>
                    <View style={[styles.closeLine, styles.closeLineForward]} />
                    <View style={[styles.closeLine, styles.closeLineBackward]} />
                  </View>
                </Pressable>
              </View>

              <View style={styles.procedureContent}>
                <View style={styles.steps}>
                  <ProcedureStep
                    body={AppCopy.guidance.recaptureBody}
                    index="1"
                    title={AppCopy.guidance.recaptureTitle}
                  />
                  <ProcedureStep
                    body={AppCopy.guidance.blockGroupBody(groupId)}
                    footnote="1)"
                    index="2"
                    title={AppCopy.guidance.blockGroupTitle}
                  />
                  <ProcedureStep
                    body={AppCopy.guidance.expertModalBody(groupId)}
                    footnote="2)"
                    index="3"
                    title={AppCopy.guidance.expertTitle}
                  />
                </View>

                <View style={styles.citations}>
                  {AppCopy.guidance.manualCitations.map((citation, index) => (
                    <Text key={citation} selectable style={styles.citationText}>
                      <Text style={styles.footnote}>{index + 1})</Text>
                      {citation}
                    </Text>
                  ))}
                </View>
              </View>
            </View>

            <Text selectable style={styles.disclaimer}>
              {AppCopy.guidance.modalDisclaimer}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ProcedureStep({
  body,
  footnote,
  index,
  title,
}: {
  body: string;
  footnote?: string;
  index: string;
  title: string;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text selectable={false} style={styles.stepNumberText}>
          {index}
        </Text>
      </View>
      <View style={styles.stepCopy}>
        <View style={styles.stepTitleRow}>
          <Text selectable style={styles.stepTitle}>
            {title}
          </Text>
        </View>
        <Text selectable style={styles.stepBody}>
          {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
          {body}
        </Text>
      </View>
    </View>
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
    gap: Space.xxl + Space.xs,
    justifyContent: 'space-between',
    paddingBottom: Space.xl,
    paddingHorizontal: Space.lg,
    paddingTop: Space.xl,
  },
  mainContent: {
    gap: Space.lg + Space.xs,
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
  siren: {
    fontSize: 22,
    height: 24,
    lineHeight: 24,
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
    position: 'relative',
    width: 24,
  },
  closeLine: {
    backgroundColor: Palette.textMuted,
    borderRadius: Radius.pill,
    height: 2,
    left: 3,
    position: 'absolute',
    top: 11,
    width: 18,
  },
  closeLineForward: {
    transform: [{ rotate: '45deg' }],
  },
  closeLineBackward: {
    transform: [{ rotate: '-45deg' }],
  },
  procedureContent: {
    gap: Space.lg,
  },
  steps: {
    gap: Space.md,
  },
  step: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Space.md,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: Palette.glassHairline,
    borderRadius: Radius.pill,
    height: Space.xl,
    justifyContent: 'center',
    width: Space.xl,
  },
  stepNumberText: {
    color: Palette.inkOverlay,
    ...Type.label2,
  },
  stepCopy: {
    flex: 1,
    gap: Space.xs,
    minWidth: 0,
  },
  stepTitleRow: {
    justifyContent: 'center',
    minHeight: Space.xl,
  },
  stepTitle: {
    color: Palette.text,
    ...Type.body1,
  },
  stepBody: {
    color: Palette.textMuted,
    ...Type.body2,
  },
  footnote: {
    fontSize: 9,
    lineHeight: Type.body2.lineHeight,
  },
  citations: {
    backgroundColor: Palette.surfaceMuted,
    borderRadius: Radius.image,
    gap: Space.xs,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + Space.xs,
  },
  citationText: {
    color: Palette.textMuted,
    ...Type.caption,
  },
  disclaimer: {
    color: Palette.textSubtle,
    paddingHorizontal: Space.xl - Space.xxs,
    textAlign: 'center',
    ...Type.caption,
  },
  pressed: {
    opacity: 0.7,
  },
});
