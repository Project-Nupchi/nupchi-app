import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ActionButton } from '@/components/action-button';
import { Palette, Radius, Space } from '@/constants/aqua-theme';
import { useAquaculture } from '@/state/aquaculture-store';

export default function AddTankSheet() {
  const { addTank } = useAquaculture();
  const [tankId, setTankId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [stockedInfo, setStockedInfo] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    const result = addTank(tankId, groupId, stockedInfo);
    if (!result.ok) {
      setError(result.message);
      return;
    }
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
            autoFocus
            onChangeText={(value) => {
              setTankId(value);
              setError('');
            }}
            placeholder="예: D-02"
            placeholderTextColor={Palette.textSubtle}
            style={styles.input}
            value={tankId}
          />
        </View>

        <View style={styles.field}>
          <Text selectable style={styles.label}>
            입식 정보
          </Text>
          <TextInput
            multiline
            onChangeText={setStockedInfo}
            placeholder="광어 수량, 입식일 등"
            placeholderTextColor={Palette.textSubtle}
            style={[styles.input, styles.textArea]}
            value={stockedInfo}
          />
        </View>

        <View style={styles.field}>
          <Text selectable style={styles.label}>
            수조군
          </Text>
          <TextInput
            onChangeText={setGroupId}
            placeholder="예: 1계통"
            placeholderTextColor={Palette.textSubtle}
            style={styles.input}
            value={groupId}
          />
        </View>

        {error ? (
          <Text selectable style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <ActionButton label="취소" variant="secondary" onPress={() => router.back()} style={styles.footerButton} />
        <ActionButton label="저장" icon="checkmark" onPress={save} style={styles.footerButton} />
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
    color: Palette.text,
    fontSize: 15,
    fontWeight: '900',
  },
  input: {
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    borderWidth: 1,
    color: Palette.text,
    fontSize: 18,
    fontWeight: '700',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  error: {
    color: Palette.suspicious,
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    borderTopColor: Palette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: Space.md,
    padding: Space.lg,
  },
  footerButton: {
    flex: 1,
  },
});
