import type { ViewStyle } from 'react-native';

export const Palette = {
  canvas: '#F4F7F6',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF3F1',
  line: '#E3EBE8',
  text: '#0D1B18',
  textMuted: '#54645F',
  // 흰 배경 기준 4.5:1 이상 확보 (작은 보조 텍스트용)
  textSubtle: '#6B7975',
  normal: '#3D5A54',
  caution: '#8F5600',
  cautionBg: '#FCF3E2',
  cautionLine: '#EFDDB8',
  suspicious: '#C0362C',
  suspiciousBg: '#FCECEA',
  suspiciousLine: '#F2C6C1',
  accent: '#0A6C5E',
  accentBg: '#E2F1ED',
  blue: '#1C5D99',
  blueBg: '#EAF2FA',
  blueLine: '#CCDFEF',
  ink: '#0B1614',
  inkMint: '#8FD8CB',
  inkMuted: '#AFC2BD',
  white: '#FFFFFF',
  // 촬영·분석 화면의 어두운 배경 전용
  black: '#0B1614',
} as const;

export const Radius = {
  card: 18,
  button: 14,
  input: 14,
  pill: 999,
} as const;

export const Space = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

// 카드류에 공통 적용하는 은은한 그림자 (iOS/Android 겸용)
export const Shadow = {
  card: {
    shadowColor: '#0D1B18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  } satisfies ViewStyle,
  raised: {
    shadowColor: '#0D1B18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 5,
  } satisfies ViewStyle,
} as const;
