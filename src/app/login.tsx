import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ActionButton } from '@/components/action-button';
import { FlounderMark } from '@/components/tank-decor';
import { Gradient, Palette, Radius, Space } from '@/constants/aqua-theme';
import { useAquaculture } from '@/state/aquaculture-store';

// 온보딩 · 로그인 — 인증 후 어가 컨텍스트 진입
export default function LoginScreen() {
  const { login } = useAquaculture();
  const [farmName, setFarmName] = useState('제주 성산 광어양식장');
  const [isLoading, setIsLoading] = useState(false);

  const submit = () => {
    if (!farmName.trim()) return;
    setIsLoading(true);
    setTimeout(() => login(farmName), 350);
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...Gradient.colors]} locations={[...Gradient.locations]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior="padding" style={styles.kav}>
        <View style={styles.brand}>
          <FlounderMark width={180} />
          <Text selectable style={styles.title}>
            제주 바이오 AX
          </Text>
          <Text selectable style={styles.subtitle}>
            광어 수조의 유병 신호를 촬영 한 장으로 기록하고 추적합니다.
          </Text>
        </View>

        <View style={styles.form}>
          <Text selectable style={styles.label}>
            어가 이름
          </Text>
          <TextInput
            editable={!isLoading}
            onChangeText={setFarmName}
            placeholder="예: 제주 성산 광어양식장"
            placeholderTextColor={Palette.onGradientFaint}
            style={styles.input}
            value={farmName}
          />
          <ActionButton
            label={isLoading ? '어가 정보 불러오는 중…' : '로그인'}
            disabled={isLoading || !farmName.trim()}
            onPress={submit}
          />
          <Text selectable style={styles.caption}>
            촬영과 수조 등록은 로그인 후 오프라인에서도 동작합니다. 로그인에는 네트워크 연결이 필요합니다.
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
});
