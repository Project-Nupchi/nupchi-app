import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChevronBackButton } from '@/components/chevron-back-button';
import { FigmaTokens, Gradient, Palette, Radius, Shadow, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import type { Tank } from '@/domain/aquaculture';

const chevronDarkImg = require('../../assets/images/home/chevron-dark.png');

const APP_BAR_HEIGHT = Space.lg * 3;
const CONTENT_TOP_GAP = Space.lg;
const CONTROL_HEIGHT = 56;
const OPTION_HEIGHT = 52;
const MAX_VISIBLE_OPTIONS = 4;
const DROPDOWN_TOP = Type.fieldLabel.lineHeight + Space.sm + CONTROL_HEIGHT + Space.sm;
const PHOTO_ASPECT_RATIO = 353 / 255;

type PhotoReviewScreenProps = {
  bottomInset: number;
  isSubmitting: boolean;
  message: string | null;
  onBack: () => void;
  onNext: () => void;
  onSelectTank: (tankId: string) => void;
  photoUri: string;
  selectedTankId?: string;
  tanks: Tank[];
  topInset: number;
};

export function PhotoReviewScreen({
  bottomInset,
  isSubmitting,
  message,
  onBack,
  onNext,
  onSelectTank,
  photoUri,
  selectedTankId,
  tanks,
  topInset,
}: PhotoReviewScreenProps) {
  const [isTankListOpen, setIsTankListOpen] = useState(false);
  const selectableTanks = useMemo(
    () =>
      tanks
        .filter((tank) => tank.active)
        .sort((a, b) => a.code.localeCompare(b.code, 'ko-KR', { numeric: true })),
    [tanks]
  );
  const selectedTank = selectableTanks.find((tank) => tank.id === selectedTankId);
  const canContinue = Boolean(selectedTank && !isSubmitting);
  const selectorDisabled = isSubmitting || selectableTanks.length === 0;
  const selectorAction = isTankListOpen
    ? AppCopy.camera.review.closeTankList
    : AppCopy.camera.review.openTankList;
  const selectorValue = selectedTank
    ? `${selectedTank.code}, ${selectedTank.groupName}`
    : selectableTanks.length > 0
      ? AppCopy.camera.review.selectTankPlaceholder
      : AppCopy.camera.review.noTanks;

  const closeTankList = () => setIsTankListOpen(false);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[...Gradient.photoReviewColors]}
        end={{ x: 0.5, y: 1 }}
        locations={[...Gradient.photoReviewLocations]}
        start={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.backgroundWash} />

      <View style={[styles.appBar, { top: topInset }]}>
        <ChevronBackButton onPress={onBack} />
      </View>

      <ScrollView
        bounces={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingBottom: bottomInset + CONTROL_HEIGHT + Space.xxl * 2,
          paddingTop: topInset + APP_BAR_HEIGHT + CONTENT_TOP_GAP,
        }}
        onScrollBeginDrag={closeTankList}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.content}>
          <View style={styles.tankSection}>
            <Text selectable style={styles.sectionTitle}>
              {AppCopy.camera.review.selectTank}
            </Text>

            <View style={styles.selectorField}>
              <Text selectable style={styles.fieldLabel}>
                {AppCopy.camera.review.tankId}
              </Text>

              <Pressable
                accessibilityLabel={`${selectorValue}. ${selectorAction}`}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: selectorDisabled,
                  expanded: isTankListOpen,
                }}
                disabled={selectorDisabled}
                onPress={() => setIsTankListOpen((open) => !open)}
                style={({ pressed }) => [
                  styles.selectorTrigger,
                  selectorDisabled && styles.actionDisabled,
                  pressed && styles.pressed,
                ]}
              >
                {selectedTank ? (
                  <TankIdentity tank={selectedTank} />
                ) : (
                  <Text numberOfLines={1} style={styles.placeholderText}>
                    {selectableTanks.length > 0
                      ? AppCopy.camera.review.selectTankPlaceholder
                      : AppCopy.camera.review.noTanks}
                  </Text>
                )}
                <Image accessible={false} contentFit="contain" source={chevronDarkImg} style={styles.chevronDown} />
              </Pressable>

              {isTankListOpen && !isSubmitting ? (
                <View style={styles.dropdownShadow}>
                  <View style={styles.dropdownSurface}>
                    <ScrollView
                      bounces={false}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={selectableTanks.length > MAX_VISIBLE_OPTIONS}
                    >
                      {selectableTanks.map((tank, index) => {
                        const selected = tank.id === selectedTankId;

                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ disabled: isSubmitting, selected }}
                            disabled={isSubmitting}
                            key={tank.id}
                            onPress={() => {
                              onSelectTank(tank.id);
                              closeTankList();
                            }}
                            style={({ pressed }) => [
                              styles.option,
                              index > 0 && styles.optionDivider,
                              selected && styles.optionSelected,
                              pressed && styles.optionPressed,
                            ]}
                          >
                            <TankIdentity tank={tank} />
                            {selected ? <CheckIcon /> : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          <View onTouchStart={closeTankList} style={styles.photoSection}>
            <Text selectable style={styles.sectionTitle}>
              {AppCopy.camera.review.checkPhoto}
            </Text>
            <View style={styles.photoFrame}>
              <Image
                accessibilityLabel={AppCopy.camera.review.photoAccessibilityLabel}
                accessible
                contentFit="cover"
                source={{ uri: photoUri }}
                style={StyleSheet.absoluteFill}
                transition={150}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {message ? (
        <View
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          pointerEvents="none"
          style={[styles.messageBanner, { top: topInset + APP_BAR_HEIGHT }]}
        >
          <Text selectable style={styles.messageText}>
            {message}
          </Text>
        </View>
      ) : null}

      <View style={[styles.actionsDock, { bottom: bottomInset + Space.md }]}>
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={onBack}
            style={({ pressed }) => [
              styles.actionButton,
              styles.secondaryButton,
              isSubmitting && styles.actionDisabled,
              pressed && !isSubmitting && styles.pressed,
            ]}
          >
            <Text selectable={false} style={styles.secondaryButtonText}>
              {AppCopy.camera.review.previous}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canContinue }}
            disabled={!canContinue}
            onPress={() => {
              closeTankList();
              onNext();
            }}
            style={({ pressed }) => [
              styles.actionButton,
              styles.primaryButton,
              !canContinue && styles.primaryButtonDisabled,
              pressed && canContinue && styles.pressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Palette.onPrimary} />
            ) : (
              <Text selectable={false} style={styles.primaryButtonText}>
                {AppCopy.camera.review.next}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function TankIdentity({ tank }: { tank: Tank }) {
  return (
    <View style={styles.tankIdentity}>
      <Text numberOfLines={1} style={styles.tankId}>
        {tank.code}
      </Text>
      <Text numberOfLines={1} style={styles.tankGroup}>
        {tank.groupName}
      </Text>
    </View>
  );
}

function CheckIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.checkIcon}>
      <View style={styles.checkMark} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.canvas,
    flex: 1,
  },
  backgroundWash: {
    backgroundColor: FigmaTokens.color.white[80],
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  appBar: {
    alignItems: 'flex-start',
    height: APP_BAR_HEIGHT,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: Space.lg,
    position: 'absolute',
    right: 0,
    zIndex: 30,
  },
  scroll: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: Space.lg * 2,
    maxWidth: 560,
    paddingHorizontal: Space.lg,
    width: '100%',
  },
  tankSection: {
    gap: Space.md,
    position: 'relative',
    zIndex: 20,
  },
  sectionTitle: {
    color: Palette.text,
    ...Type.heading2,
  },
  selectorField: {
    gap: Space.sm,
    position: 'relative',
    zIndex: 20,
  },
  fieldLabel: {
    color: FigmaTokens.color.gray[800],
    ...Type.fieldLabel,
  },
  selectorTrigger: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderColor: FigmaTokens.color.gray[100],
    borderRadius: Radius.input,
    borderWidth: 1,
    flexDirection: 'row',
    height: CONTROL_HEIGHT,
    justifyContent: 'space-between',
    paddingHorizontal: Space.md,
  },
  placeholderText: {
    color: FigmaTokens.color.gray[300],
    flex: 1,
    ...Type.body1,
  },
  chevronDown: {
    height: Space.lg,
    opacity: 0.72,
    transform: [{ rotate: '90deg' }],
    width: Space.lg,
  },
  tankIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.sm,
  },
  tankId: {
    color: Palette.text,
    ...Type.body1,
  },
  tankGroup: {
    color: FigmaTokens.color.gray[500],
    ...Type.body1Medium,
  },
  dropdownShadow: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.input,
    left: 0,
    maxHeight: OPTION_HEIGHT * MAX_VISIBLE_OPTIONS + 2,
    position: 'absolute',
    right: 0,
    top: DROPDOWN_TOP,
    zIndex: 40,
    ...Shadow.navigation,
  },
  dropdownSurface: {
    backgroundColor: Palette.surface,
    borderColor: FigmaTokens.color.gray[100],
    borderRadius: Radius.input,
    borderWidth: 1,
    maxHeight: OPTION_HEIGHT * MAX_VISIBLE_OPTIONS + 2,
    overflow: 'hidden',
  },
  option: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    flexDirection: 'row',
    height: OPTION_HEIGHT,
    justifyContent: 'space-between',
    paddingHorizontal: Space.md,
  },
  optionDivider: {
    borderColor: FigmaTokens.color.gray[50],
    borderTopWidth: 1,
  },
  optionSelected: {
    backgroundColor: Palette.detailAccentTint,
  },
  optionPressed: {
    backgroundColor: Palette.detailAccentSoft,
  },
  checkIcon: {
    alignItems: 'center',
    height: Space.md,
    justifyContent: 'center',
    width: Space.md,
  },
  checkMark: {
    borderBottomColor: Palette.detailAccent,
    borderBottomWidth: Space.xxs,
    borderLeftColor: Palette.detailAccent,
    borderLeftWidth: Space.xxs,
    height: Space.xs + Space.xxs,
    transform: [{ rotate: '-45deg' }],
    width: Space.sm + Space.xxs,
  },
  photoSection: {
    gap: Space.md,
    position: 'relative',
    zIndex: 1,
  },
  photoFrame: {
    aspectRatio: PHOTO_ASPECT_RATIO,
    borderRadius: Radius.analysisImage,
    overflow: 'hidden',
    width: '100%',
  },
  messageBanner: {
    alignSelf: 'center',
    backgroundColor: Palette.suspiciousBg,
    borderColor: Palette.suspiciousLine,
    borderRadius: Radius.button,
    borderWidth: 1,
    left: Space.lg,
    maxWidth: 560,
    padding: Space.sm,
    position: 'absolute',
    right: Space.lg,
    zIndex: 50,
    ...Shadow.card,
  },
  messageText: {
    color: Palette.suspicious,
    textAlign: 'center',
    ...Type.body2,
  },
  actionsDock: {
    left: 0,
    paddingHorizontal: Space.lg,
    position: 'absolute',
    right: 0,
    zIndex: 30,
  },
  actionsRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Space.sm + Space.xs,
    maxWidth: 560,
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: Radius.button,
    flex: 1,
    height: CONTROL_HEIGHT,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  secondaryButton: {
    backgroundColor: FigmaTokens.color.gray[50],
    borderColor: FigmaTokens.color.white[80],
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: Palette.text,
    ...Type.button,
  },
  primaryButton: {
    backgroundColor: Palette.detailAccent,
  },
  primaryButtonDisabled: {
    backgroundColor: Palette.detailAccentDisabled,
  },
  primaryButtonText: {
    color: Palette.onPrimary,
    ...Type.button,
  },
  actionDisabled: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.76,
  },
});
