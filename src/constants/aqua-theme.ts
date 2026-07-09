import type { ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// "Tide Glass" — 제주 광어 양식 iOS 아이덴티티.
// 물빛 파란 그라디언트 배경 위에 프로스티드 글래스 카드 + 큰 볼드 타이포.
// 등급 색 규칙: 정상=초록, 주의=주황(앰버), 의심=적색.
// ---------------------------------------------------------------------------

// 배경 그라디언트 (위: 짙은 물빛 → 아래: 옅은 하늘빛)
export const Gradient = {
  colors: ['#2F7FC6', '#6FA9DE', '#DCEAF7'] as const,
  locations: [0, 0.42, 1] as const,
};

export const Palette = {
  // 그라디언트 위 텍스트
  onGradient: '#FFFFFF',
  onGradientMuted: 'rgba(255, 255, 255, 0.82)',
  onGradientFaint: 'rgba(255, 255, 255, 0.6)',

  // 카드 안 텍스트 (딥 네이비 잉크)
  text: '#12314C',
  textMuted: '#4B6379',
  textSubtle: '#7189A0',

  // 유리 표면
  glass: 'rgba(255, 255, 255, 0.60)',
  glassStrong: 'rgba(255, 255, 255, 0.80)',
  glassMuted: 'rgba(255, 255, 255, 0.38)',
  glassLine: 'rgba(255, 255, 255, 0.75)',
  glassHairline: 'rgba(18, 49, 76, 0.08)',

  // 솔리드 표면 (입력창 등)
  surface: '#FFFFFF',
  canvas: '#DCEAF7',

  // 브랜드/액션
  primary: '#1668B0',
  primaryPressed: '#12558F',
  onPrimary: '#FFFFFF',
  primarySoft: 'rgba(22, 104, 176, 0.12)',
  accent: '#1668B0',

  // FAB·카메라 등 어두운 요소
  ink: '#122A3D',
  inkStrong: '#0C1E2C',
  inkMuted: 'rgba(255, 255, 255, 0.72)',

  // 상태색
  normal: '#1E8F5E',
  normalBg: 'rgba(30, 143, 94, 0.14)',
  normalLine: 'rgba(30, 143, 94, 0.34)',
  caution: '#BE7A10',
  cautionBg: 'rgba(190, 122, 16, 0.15)',
  cautionLine: 'rgba(190, 122, 16, 0.36)',
  suspicious: '#D2453A',
  suspiciousBg: 'rgba(210, 69, 58, 0.14)',
  suspiciousLine: 'rgba(210, 69, 58, 0.36)',

  // 정보(동기화 등)
  blue: '#1668B0',
  blueBg: 'rgba(22, 104, 176, 0.12)',
  blueLine: 'rgba(22, 104, 176, 0.3)',

  white: '#FFFFFF',
} as const;

// 넙치 실루엣·병변 연출 색
export const Water = {
  sand: '#E4C79A',
  sandDeep: '#CBA871',
  sandBed: 'rgba(220, 199, 154, 0.22)',
  speckle: 'rgba(80, 58, 28, 0.5)',
  lesion: '#D2453A',
} as const;

export const Radius = {
  card: 26,
  button: 16,
  input: 16,
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

export const Shadow = {
  card: {
    shadowColor: '#0B2740',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
  } satisfies ViewStyle,
  raised: {
    shadowColor: '#0B2740',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 8,
  } satisfies ViewStyle,
} as const;
