import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ActionButton } from '@/components/action-button';
import { Palette, Radius, Space } from '@/constants/aqua-theme';
import { useAquaculture } from '@/state/aquaculture-store';

// 수조 추가·편집 (editId 있으면 편집)
export default function AddTankSheet() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { tanks, addTank, updateTank, setTankActive } = useAquaculture();
  const editing = tanks.find((tank) => tank.id === editId);

  const [tankId, setTankId] = useState(editing?.id ?? '');
  const [groupId, setGroupId] = useState(editing?.groupId ?? '');
  const [stockedInfo, setStockedInfo] = useState(editing?.stockedInfo ?? '');
  const [active, setActive] = useState(editing?.active ?? true);
  const [error, setError] = useState('');

  const save = () => {
    if (editing) {
      const res = updateTank(editing.id, groupId, stockedInfo);
      if (!res.ok) return setError(res.message);
      if (active !== editing.active) setTankActive(editing.id, active);
      router.back();
      return;
    }
    const res = addTank(tankId, groupId, stockedInfo);
    if (!res.ok) return setError(res.message);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      <View style={styles.content}>
        <View style={styles.field}>
          <Text selectable style={styles.label}>
            수조 ID
          </Text>
          <TextInput
            autoCapitalize="characters"
            autoFocus={!editing}
            editable={!editing}
            onChangeText={(v) => {
              setTankId(v);
              setError('');
            }}
            placeholder="예: D-02"
            placeholderTextColor={Palette.textSubtle}
            style={[styles.input, Boolean(editing) && styles.inputLocked]}
            value={tankId}
          />
        </View>

        <View style={styles.field}>
          <Text selectable style={styles.label}>
            수조군 (취수·배수 계통)
          </Text>
          <TextInput
            onChangeText={setGroupId}
            placeholder="예: 1계통"
            placeholderTextColor={Palette.textSubtle}
            style={styles.input}
            value={groupId}
          />
        </View>

        <View style={styles.field}>
          <Text selectable style={styles.label}>
            입식 정보
          </Text>
          <TextInput
            multiline
            onChangeText={setStockedInfo}
            placeholder="입식일 · 마릿수 · 크기 등"
            placeholderTextColor={Palette.textSubtle}
            style={[styles.input, styles.textArea]}
            value={stockedInfo}
          />
        </View>

        {editing ? (
          <Pressable style={styles.activeRow} onPress={() => setActive((p) => !p)}>
            <View style={styles.activeText}>
              <Text selectable style={styles.activeLabel}>
                수조 활성
              </Text>
              <Text selectable style={styles.hint}>
                출하 완료 시 비활성 처리합니다. 이력은 보존됩니다.
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
        <ActionButton label="취소" variant="secondary" onPress={() => router.back()} style={styles.grow} />
        <ActionButton label="저장" icon="checkmark" onPress={save} style={styles.grow} />
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
    backgroundColor: Palette.surface,
    borderColor: Palette.glassHairline,
    borderRadius: Radius.input,
    borderWidth: 1,
    color: Palette.text,
    fontSize: 17,
    fontWeight: '600',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  inputLocked: {
    backgroundColor: 'rgba(18, 49, 76, 0.05)',
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
    backgroundColor: Palette.surface,
    borderColor: Palette.glassHairline,
    borderRadius: Radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Space.md,
    padding: Space.md,
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
