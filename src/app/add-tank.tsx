import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardStickyFooter } from '@/components/keyboard-sticky-footer';
import { ChevronBackButton } from '@/components/chevron-back-button';
import { FigmaTokens, Gradient, Palette, Radius, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import { useAquaculture } from '@/state/aquaculture-store';

const FORM_BUTTON_HEIGHT = 56;
const KEYBOARD_FOOTER_GAP = Space.md;

type TankFieldProps = Omit<TextInputProps, 'multiline' | 'placeholderTextColor' | 'style'> & {
  label: string;
  multiline?: boolean;
};

type FormButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary';
};

type FormActionsProps = {
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled: boolean;
};

// Figma의 수조 추가·편집 화면은 같은 폼 구조를 공유하며 editId로 모드를 구분한다.
export default function TankFormScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { tanks, addTank, updateTank } = useAquaculture();
  const insets = useSafeAreaInsets();
  const isEditMode = Boolean(editId);
  const editing = tanks.find((tank) => tank.id === editId);
  const missingEditingTank = isEditMode && !editing;

  const [tankId, setTankId] = useState(editing?.id ?? '');
  const [groupId, setGroupId] = useState(editing?.groupId ?? '');
  const [stockedInfo, setStockedInfo] = useState(editing?.stockedInfo ?? '');
  const [active, setActive] = useState(editing?.active ?? true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const title = isEditMode ? AppCopy.navigation.editTank : AppCopy.navigation.addTank;
  const saveDisabled = isSaving || missingEditingTank;
  const footerBottom = Math.max(insets.bottom + Space.md - Space.xxs, Space.lg);
  const footerReservedSpace = Space.lg + FORM_BUTTON_HEIGHT + footerBottom;

  const clearError = () => setError('');

  const save = async () => {
    if (isSaving) return;
    if (isEditMode && !editing) {
      setError(AppCopy.validation.tankNotFound);
      return;
    }

    setIsSaving(true);
    setError('');

    const result = editing
      ? await updateTank(editing.id, groupId, stockedInfo, active)
      : await addTank(tankId, groupId, stockedInfo);

    if (!result.ok) {
      setIsSaving(false);
      setError(result.message);
      return;
    }

    router.back();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[...Gradient.colors]}
        locations={[...Gradient.locations]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.gradientWash]} />

      <View style={{ height: insets.top }} />
      <AppBar title={title} />

      <ScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerReservedSpace }]}
      >
        <View style={styles.form}>
          <TankField
            accessibilityState={{ disabled: isEditMode }}
            autoCapitalize="characters"
            editable={!isEditMode}
            label={AppCopy.addTank.tankId}
            onChangeText={(value) => {
              setTankId(value);
              clearError();
            }}
            placeholder={AppCopy.addTank.tankIdPlaceholder}
            returnKeyType="next"
            value={tankId}
          />

          <TankField
            label={AppCopy.addTank.groupId}
            onChangeText={(value) => {
              setGroupId(value);
              clearError();
            }}
            placeholder={AppCopy.addTank.groupIdPlaceholder}
            returnKeyType="next"
            value={groupId}
          />

          <TankField
            label={AppCopy.addTank.stockedInfo}
            multiline
            onChangeText={(value) => {
              setStockedInfo(value);
              clearError();
            }}
            placeholder={AppCopy.addTank.stockedInfoPlaceholder}
            value={stockedInfo}
          />

          {isEditMode ? (
            <View style={styles.activeRow}>
              <View style={styles.activeCopy}>
                <Text selectable style={styles.activeLabel}>
                  {AppCopy.addTank.active}
                </Text>
                <Text selectable style={styles.activeHint}>
                  {AppCopy.addTank.activeHint}
                </Text>
              </View>
              <TankSwitch
                disabled={missingEditingTank}
                onChange={(value) => {
                  setActive(value);
                  clearError();
                }}
                value={active}
              />
            </View>
          ) : null}

          {error || missingEditingTank ? (
            <Text accessibilityLiveRegion="polite" selectable style={styles.error}>
              {error || AppCopy.validation.tankNotFound}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <KeyboardStickyFooter
        closedBottom={footerBottom}
        keyboardGap={KEYBOARD_FOOTER_GAP}
        style={styles.footer}
      >
        <FormActions
          isSaving={isSaving}
          onCancel={() => router.back()}
          onSave={save}
          saveDisabled={saveDisabled}
        />
      </KeyboardStickyFooter>
    </View>
  );
}

function AppBar({ title }: { title: string }) {
  return (
    <View style={styles.appBar}>
      <ChevronBackButton onPress={() => router.back()} />
      <Text selectable style={styles.appBarTitle}>
        {title}
      </Text>
      <View style={styles.appBarTrailing} />
    </View>
  );
}

function TankField({ label, multiline = false, ...inputProps }: TankFieldProps) {
  return (
    <View style={styles.field}>
      <Text selectable style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        cursorColor={Palette.primary}
        multiline={multiline}
        placeholderTextColor={FigmaTokens.color.gray[300]}
        selectionColor={Palette.primary}
        style={[styles.input, multiline && styles.textArea]}
      />
    </View>
  );
}

function FormActions({ isSaving, onCancel, onSave, saveDisabled }: FormActionsProps) {
  return (
    <View style={styles.footerActions}>
      <FormButton
        disabled={isSaving}
        label={AppCopy.common.cancel}
        onPress={onCancel}
        variant="secondary"
      />
      <FormButton
        disabled={saveDisabled}
        label={AppCopy.common.save}
        onPress={onSave}
        variant="primary"
      />
    </View>
  );
}

function TankSwitch({ disabled, onChange, value }: { disabled?: boolean; onChange: (value: boolean) => void; value: boolean }) {
  return (
    <Pressable
      accessibilityLabel={AppCopy.addTank.active}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.switchTrack,
        value ? styles.switchTrackActive : styles.switchTrackInactive,
        { justifyContent: value ? 'flex-end' : 'flex-start' },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.switchThumb} />
    </Pressable>
  );
}

function FormButton({ disabled = false, label, onPress, variant }: FormButtonProps) {
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.formButton,
        primary ? styles.primaryButton : styles.secondaryButton,
        disabled && primary && styles.primaryButtonDisabled,
        disabled && !primary && styles.secondaryButtonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text selectable={false} style={[styles.buttonLabel, primary && styles.primaryButtonLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.canvas,
    flex: 1,
  },
  gradientWash: {
    backgroundColor: FigmaTokens.color.white[80],
    pointerEvents: 'none',
  },
  appBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 60,
    justifyContent: 'space-between',
    paddingHorizontal: Space.lg,
    position: 'relative',
  },
  appBarTitle: {
    color: FigmaTokens.color.gray[950],
    left: Space.lg + Space.xl,
    pointerEvents: 'none',
    position: 'absolute',
    right: Space.lg + Space.xl,
    textAlign: 'center',
    ...Type.title,
  },
  appBarTrailing: {
    height: Space.xl,
    width: Space.xl,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: Space.lg,
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
  },
  form: {
    gap: Space.lg + Space.xs,
    maxWidth: 520,
    width: '100%',
  },
  field: {
    gap: Space.sm,
    width: '100%',
  },
  fieldLabel: {
    color: FigmaTokens.color.gray[800],
    ...Type.fieldLabel,
  },
  input: {
    backgroundColor: FigmaTokens.color.white[100],
    borderColor: FigmaTokens.color.gray[100],
    borderRadius: Radius.input,
    borderWidth: 1,
    color: FigmaTokens.color.gray[950],
    height: 56,
    paddingHorizontal: Space.md,
    paddingVertical: 0,
    ...Type.body1,
  },
  textArea: {
    height: 104,
    paddingBottom: Space.md,
    paddingTop: Space.md,
    textAlignVertical: 'top',
  },
  activeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Space.sm + Space.xxs,
    width: '100%',
  },
  activeCopy: {
    flex: 1,
    gap: Space.xs,
  },
  activeLabel: {
    color: FigmaTokens.color.gray[950],
    ...Type.body1,
  },
  activeHint: {
    color: FigmaTokens.color.gray[500],
    ...Type.caption,
  },
  switchTrack: {
    borderRadius: Radius.pill,
    flexDirection: 'row',
    height: 28,
    padding: Space.xxs,
    width: 48,
  },
  switchTrackActive: {
    backgroundColor: FigmaTokens.color.blue[500],
  },
  switchTrackInactive: {
    backgroundColor: FigmaTokens.color.gray[200],
  },
  switchThumb: {
    backgroundColor: FigmaTokens.color.white[100],
    borderRadius: Radius.pill,
    height: 24,
    width: 24,
  },
  error: {
    color: FigmaTokens.color.status.dangerText,
    ...Type.caption,
  },
  footer: {
    alignItems: 'center',
    left: 0,
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
    position: 'absolute',
    right: 0,
  },
  footerActions: {
    flexDirection: 'row',
    gap: Space.sm + Space.xs,
    maxWidth: 520,
    width: '100%',
  },
  formButton: {
    alignItems: 'center',
    borderRadius: Radius.button,
    flex: 1,
    height: FORM_BUTTON_HEIGHT,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primaryButton: {
    backgroundColor: FigmaTokens.color.blue[500],
  },
  primaryButtonDisabled: {
    backgroundColor: FigmaTokens.color.blue[300],
  },
  secondaryButton: {
    backgroundColor: FigmaTokens.color.gray[50],
    borderColor: FigmaTokens.color.white[80],
    borderWidth: 1,
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: FigmaTokens.color.gray[950],
    textAlign: 'center',
    ...Type.button,
  },
  primaryButtonLabel: {
    color: FigmaTokens.color.white[100],
  },
  pressed: {
    opacity: 0.72,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
