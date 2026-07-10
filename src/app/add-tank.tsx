import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ActionButton } from '@/components/action-button';
import { Gradient, Palette, Radius, Shadow, Space } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import { useAquaculture } from '@/state/aquaculture-store';

// 수조 추가·편집 (editId 있으면 편집)
export default function AddTankSheet() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { tanks, addTank, updateTank } = useAquaculture();
  const editing = tanks.find((tank) => tank.id === editId);

  const [tankId, setTankId] = useState(editing?.id ?? '');
  const [groupId, setGroupId] = useState(editing?.groupId ?? '');
  const [stockedInfo, setStockedInfo] = useState(editing?.stockedInfo ?? '');
  const [active, setActive] = useState(editing?.active ?? true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    setError('');
    if (editing) {
      const res = await updateTank(editing.id, groupId, stockedInfo, active);
      if (!res.ok) {
        setIsSaving(false);
        return setError(res.message);
      }
      router.back();
      return;
    }
    const res = await addTank(tankId, groupId, stockedInfo);
    if (!res.ok) {
      setIsSaving(false);
      return setError(res.message);
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      <LinearGradient colors={[...Gradient.colors]} locations={[...Gradient.locations]} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <View style={styles.field}>
          <Text selectable style={styles.label}>
            {AppCopy.addTank.tankId}
          </Text>
          <TextInput
            autoCapitalize="characters"
            autoFocus={!editing}
            editable={!editing}
            onChangeText={(v) => {
              setTankId(v);
              setError('');
            }}
            placeholder={AppCopy.addTank.tankIdPlaceholder}
            placeholderTextColor={Palette.textSubtle}
            style={[styles.input, Boolean(editing) && styles.inputLocked]}
            value={tankId}
          />
        </View>

        <View style={styles.field}>
          <Text selectable style={styles.label}>
            {AppCopy.addTank.groupId}
          </Text>
          <TextInput
            onChangeText={setGroupId}
            placeholder={AppCopy.addTank.groupIdPlaceholder}
            placeholderTextColor={Palette.textSubtle}
            style={styles.input}
            value={groupId}
          />
        </View>

        <View style={styles.field}>
          <Text selectable style={styles.label}>
            {AppCopy.addTank.stockedInfo}
          </Text>
          <TextInput
            multiline
            onChangeText={setStockedInfo}
            placeholder={AppCopy.addTank.stockedInfoPlaceholder}
            placeholderTextColor={Palette.textSubtle}
            style={[styles.input, styles.textArea]}
            value={stockedInfo}
          />
        </View>

        {editing ? (
          <Pressable style={styles.activeRow} onPress={() => setActive((p) => !p)}>
            <View style={styles.activeText}>
              <Text selectable style={styles.activeLabel}>
                {AppCopy.addTank.active}
              </Text>
              <Text selectable style={styles.hint}>
                {AppCopy.addTank.activeHint}
              </Text>
            </View>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: Palette.primary, false: '#C9D4DD' }} thumbColor={Palette.white} />
          </Pressable>
        ) : null}

        {error ? (
          <Text selectable style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <ActionButton label={AppCopy.common.cancel} variant="secondary" disabled={isSaving} onPress={() => router.back()} style={styles.grow} />
        <ActionButton label={AppCopy.common.save} icon="checkmark" disabled={isSaving} onPress={save} style={styles.grow} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.canvas,
    flex: 1,
  },
  content: {
    flex: 1,
    gap: Space.lg,
    padding: Space.lg,
  },
  field: {
    gap: Space.sm,
  },
  label: {
    color: Palette.textMuted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginLeft: 2,
  },
  input: {
    backgroundColor: Palette.glassStrong,
    borderColor: Palette.glassLine,
    borderRadius: Radius.input,
    borderWidth: 1,
    color: Palette.text,
    fontSize: 17,
    fontWeight: '600',
    minHeight: 54,
    paddingHorizontal: 16,
    ...Shadow.card,
  },
  inputLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    color: Palette.textMuted,
  },
  textArea: {
    minHeight: 92,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  hint: {
    color: Palette.textSubtle,
    fontSize: 13,
    lineHeight: 18,
  },
  activeRow: {
    alignItems: 'center',
    backgroundColor: Palette.glassStrong,
    borderColor: Palette.glassLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Space.md,
    padding: Space.md,
    ...Shadow.card,
  },
  activeText: {
    flex: 1,
    gap: 2,
  },
  activeLabel: {
    color: Palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  error: {
    color: Palette.suspicious,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: Space.md,
    padding: Space.lg,
  },
  grow: {
    flex: 1,
  },
});
