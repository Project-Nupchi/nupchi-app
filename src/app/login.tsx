import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ActionButton } from '@/components/action-button';
import { FlounderMark } from '@/components/tank-decor';
import { Gradient, Palette, Radius, Space } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import { useAquaculture } from '@/state/aquaculture-store';

// 온보딩 · 로그인 — 인증 후 어가 컨텍스트 진입
export default function LoginScreen() {
  const { login, isHydrating, error, apiMode } = useAquaculture();
  const [farmName, setFarmName] = useState<string>(AppCopy.login.defaultFarmName);

  const submit = async () => {
    if (!farmName.trim()) return;
    await login(farmName);
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...Gradient.colors]} locations={[...Gradient.locations]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior="padding" style={styles.kav}>
        <View style={styles.brand}>
          <FlounderMark width={180} />
          <Text selectable style={styles.title}>
            {AppCopy.login.brand}
          </Text>
          <Text selectable style={styles.subtitle}>
            {AppCopy.login.subtitle}
          </Text>
        </View>

        <View style={styles.form}>
          <Text selectable style={styles.label}>
            {AppCopy.login.farmNameLabel}
          </Text>
          <TextInput
            editable={!isHydrating}
            onChangeText={setFarmName}
            placeholder={AppCopy.login.farmNamePlaceholder}
            placeholderTextColor={Palette.onGradientFaint}
            style={styles.input}
            value={farmName}
          />
          <ActionButton
            label={isHydrating ? AppCopy.login.submitting : AppCopy.login.submit}
            disabled={isHydrating || !farmName.trim()}
            onPress={submit}
          />
          {error ? <Text selectable style={styles.error}>{error}</Text> : null}
          <Text selectable style={styles.caption}>
            {apiMode === 'mock' ? AppCopy.login.mockCaption : AppCopy.login.remoteCaption}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.canvas,
    flex: 1,
  },
  kav: {
    flex: 1,
    gap: Space.xxl,
    justifyContent: 'center',
    padding: Space.xl,
  },
  brand: {
    alignItems: 'center',
    gap: Space.md,
  },
  title: {
    color: Palette.onGradient,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: Palette.onGradientMuted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  form: {
    gap: Space.md,
  },
  label: {
    color: Palette.onGradient,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 2,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: Palette.glassLine,
    borderRadius: Radius.input,
    borderWidth: 1,
    color: Palette.text,
    fontSize: 17,
    fontWeight: '600',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  caption: {
    color: Palette.onGradientMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  error: {
    color: Palette.onGradient,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
