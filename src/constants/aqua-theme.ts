import type { TextStyle, ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// Figma source:
// https://www.figma.com/design/mby1o9uMiY4tYstDx81vp5?node-id=46-450
//
// Keep implementations mapped to these primitives first. The semantic aliases
// below exist so screens can stay readable without drifting from Figma.
// ---------------------------------------------------------------------------

export const FigmaTokens = {
  color: {
    white: {
      0: '#FFFFFF00',
      10: '#FFFFFF1A',
      20: '#FFFFFF33',
      30: '#FFFFFF4D',
      40: '#FFFFFF66',
      50: '#FFFFFF80',
      60: '#FFFFFF99',
      70: '#FFFFFFB2',
      80: '#FFFFFFCC',
      90: '#FFFFFFE5',
      100: '#FFFFFF',
    },
    gray: {
      50: '#1E2A450D',
      100: '#1E2A451A',
      200: '#1E2A4533',
      300: '#1E2A454D',
      400: '#1E2A4566',
      500: '#1E2A4580',
      600: '#1E2A4599',
      700: '#1E2A45B2',
      800: '#1E2A45CC',
      900: '#1E2A45E5',
      950: '#1E2A45',
    },
    blue: {
      100: '#E9F2FC',
      200: '#C9E0F7',
      300: '#9DC7F1',
      400: '#4B9AE9',
      500: '#3689DD',
      600: '#1D75CD',
      700: '#1861AA',
      800: '#12477D',
      900: '#0B2E50',
    },
    status: {
      dangerText: '#EE2C1D',
      dangerBackground: '#F7534626',
      warningText: '#F78009',
      warningBackground: '#F7800926',
      successText: '#0CB26A',
      successBackground: '#2CB77A26',
    },
  },
  gradient: {
    screen: ['#4B9AE9', '#78B3EF', '#A5CCF4', '#D2E6FA', '#FFFFFF'] as const,
    locations: [0, 0.2, 0.4, 0.62, 0.88] as const,
  },
  radius: {
    card: 20,
    image: 12,
    roundButton: 40,
    control: 16,
    pill: 999,
  },
  space: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 36,
  },
  typography: {
    display: { fontFamily: 'Pretendard', fontSize: 28, fontWeight: '700', lineHeight: 39, letterSpacing: -0.84 },
    title: { fontFamily: 'Pretendard', fontSize: 20, fontWeight: '600', lineHeight: 28, letterSpacing: -0.4 },
    heading1: { fontFamily: 'Pretendard', fontSize: 20, fontWeight: '700', lineHeight: 26, letterSpacing: -0.2 },
    heading2: { fontFamily: 'Pretendard', fontSize: 18, fontWeight: '600', lineHeight: 25, letterSpacing: -0.36 },
    body1: { fontFamily: 'Pretendard', fontSize: 16, fontWeight: '600', lineHeight: 22, letterSpacing: -0.32 },
    body2: { fontFamily: 'Pretendard', fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: -0.14 },
    button: { fontFamily: 'Pretendard', fontSize: 16, fontWeight: '700', lineHeight: 22, letterSpacing: -0.32 },
    fieldLabel: { fontFamily: 'Pretendard', fontSize: 14, fontWeight: '600', lineHeight: 20, letterSpacing: 0 },
    label1: { fontFamily: 'Pretendard', fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: -0.28 },
    label2: { fontFamily: 'Pretendard', fontSize: 13, fontWeight: '600', lineHeight: 18, letterSpacing: -0.26 },
    label3: { fontFamily: 'Pretendard', fontSize: 11, fontWeight: '500', lineHeight: 15, letterSpacing: -0.22 },
    caption: { fontFamily: 'Pretendard', fontSize: 13, fontWeight: '400', lineHeight: 18, letterSpacing: 0 },
  } satisfies Record<string, TextStyle>,
  effect: {
    card: {
      shadowColor: '#0B2740',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 2,
    } satisfies ViewStyle,
    navigation: {
      shadowColor: '#0B2740',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    } satisfies ViewStyle,
  },
} as const;

// 배경 그라디언트 (Figma 홈/수조 현황 기준: 물빛 → 흰 배경)
export const Gradient = {
  colors: FigmaTokens.gradient.screen,
  locations: FigmaTokens.gradient.locations,
};

export const Palette = {
  // 그라디언트 위 텍스트
  onGradient: FigmaTokens.color.white[100],
  onGradientMuted: FigmaTokens.color.white[80],
  onGradientFaint: FigmaTokens.color.white[60],
  onGradientTrace: FigmaTokens.color.white[10],

  // 카드 안 텍스트 (Figma gray/ink)
  text: FigmaTokens.color.gray[950],
  textMuted: FigmaTokens.color.gray[700],
  textSubtle: FigmaTokens.color.gray[500],

  // 유리 표면
  glass: FigmaTokens.color.white[70],
  glassStrong: FigmaTokens.color.white[90],
  glassMuted: FigmaTokens.color.white[40],
  glassLine: FigmaTokens.color.white[80],
  glassHairline: FigmaTokens.color.gray[100],

  // 솔리드 표면 (입력창 등)
  surface: FigmaTokens.color.white[100],
  canvas: FigmaTokens.color.white[100],

  // 브랜드/액션
  primary: FigmaTokens.color.blue[500],
  primaryPressed: FigmaTokens.color.blue[600],
  onPrimary: FigmaTokens.color.white[100],
  primarySoft: FigmaTokens.color.blue[100],
  accent: FigmaTokens.color.blue[700],

  // FAB·카메라 등 어두운 요소
  ink: FigmaTokens.color.gray[950],
  inkStrong: FigmaTokens.color.gray[950],
  inkOverlay: FigmaTokens.color.gray[900],
  inkMuted: FigmaTokens.color.white[70],

  // 상태색
  normal: FigmaTokens.color.status.successText,
  normalBg: FigmaTokens.color.status.successBackground,
  normalLine: '#2CB77A57',
  caution: FigmaTokens.color.status.warningText,
  cautionBg: FigmaTokens.color.status.warningBackground,
  cautionLine: '#F780095C',
  suspicious: FigmaTokens.color.status.dangerText,
  suspiciousBg: FigmaTokens.color.status.dangerBackground,
  suspiciousLine: '#F753465C',

  // 정보(동기화 등)
  blue: FigmaTokens.color.blue[500],
  blueBg: FigmaTokens.color.blue[100],
  blueLine: FigmaTokens.color.blue[200],

  white: FigmaTokens.color.white[100],
} as const;

// 넙치 실루엣·병변 연출 색
export const Water = {
  sand: '#E4C79A',
  sandDeep: '#CBA871',
  sandBed: 'rgba(220, 199, 154, 0.22)',
  speckle: 'rgba(80, 58, 28, 0.5)',
  lesion: '#D2453A',
  lesionGlowOuter: '#FF71710D',
  lesionGlowInner: '#FF717113',
} as const;

export const Radius = {
  card: FigmaTokens.radius.card,
  image: FigmaTokens.radius.image,
  roundButton: FigmaTokens.radius.roundButton,
  button: FigmaTokens.radius.control,
  input: FigmaTokens.radius.control,
  pill: FigmaTokens.radius.pill,
} as const;

export const Space = {
  xxs: FigmaTokens.space.xxs,
  xs: FigmaTokens.space.xs,
  sm: FigmaTokens.space.sm,
  md: FigmaTokens.space.md,
  lg: FigmaTokens.space.lg,
  xl: FigmaTokens.space.xl,
  xxl: FigmaTokens.space.xxl,
} as const;

export const Shadow = {
  card: FigmaTokens.effect.card,
  navigation: FigmaTokens.effect.navigation,
  raised: FigmaTokens.effect.navigation,
} as const;

export const Type = FigmaTokens.typography;
