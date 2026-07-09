import { StyleSheet, View, ViewStyle } from 'react-native';

import { Water } from '@/constants/aqua-theme';

// 넙치(광어)는 눈이 왼쪽에 몰려 있고 몸이 납작한 타원형이다.
// 벡터 패키지 없이 View 조합으로 그리는 정적 실루엣.

type FlounderMarkProps = {
  width?: number;
  color?: string;
  style?: ViewStyle;
  // 분석 맥락에서 붉은 점선 병변 박스를 표시
  showLesion?: boolean;
};

// 몸통 위 반점 위치 (가로·세로 비율)
const speckles = [
  { x: 0.32, y: 0.28, r: 3.5 },
  { x: 0.46, y: 0.52, r: 2.5 },
  { x: 0.55, y: 0.32, r: 3 },
  { x: 0.64, y: 0.56, r: 2.5 },
  { x: 0.4, y: 0.7, r: 2 },
  { x: 0.7, y: 0.4, r: 2 },
];

export function FlounderMark({ width = 140, color = Water.sand, style, showLesion = false }: FlounderMarkProps) {
  const height = width * 0.56;

  return (
    <View style={[styles.root, { width, height }, style]}>
      {/* 꼬리: 오른쪽 끝 부채꼴 */}
      <View
        style={{
          backgroundColor: Water.sandDeep,
          borderRadius: width * 0.04,
          height: width * 0.2,
          position: 'absolute',
          right: 0,
          top: height / 2 - width * 0.1,
          transform: [{ rotate: '45deg' }],
          width: width * 0.2,
        }}
      />
      {/* 납작한 몸통 */}
      <View
        style={{
          backgroundColor: color,
          borderRadius: height / 2,
          bottom: height * 0.05,
          left: 0,
          position: 'absolute',
          right: width * 0.12,
          top: height * 0.05,
        }}
      />
      {/* 지느러미 라인(윗변) */}
      <View
        style={{
          backgroundColor: Water.sandDeep,
          borderRadius: 2,
          height: 3,
          left: width * 0.18,
          opacity: 0.5,
          position: 'absolute',
          top: height * 0.1,
          width: width * 0.5,
        }}
      />
      {/* 왼쪽으로 몰린 두 눈 */}
      <View style={[styles.eye, { left: width * 0.1, top: height * 0.32 }]} />
      <View style={[styles.eye, { left: width * 0.19, top: height * 0.2 }]} />
      {/* 모래색 몸 위의 반점 */}
      {speckles.map((dot, index) => (
        <View
          key={index}
          style={{
            backgroundColor: Water.speckle,
            borderRadius: dot.r,
            height: dot.r * 2,
            left: width * dot.x,
            position: 'absolute',
            top: height * dot.y,
            width: dot.r * 2,
          }}
        />
      ))}
      {/* 분석 병변 박스 (붉은 점선) */}
      {showLesion ? (
        <View
          style={{
            borderColor: Water.lesion,
            borderRadius: 6,
            borderStyle: 'dashed',
            borderWidth: 2,
            height: height * 0.42,
            left: width * 0.34,
            position: 'absolute',
            top: height * 0.28,
            width: width * 0.22,
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    pointerEvents: 'none',
  },
  eye: {
    backgroundColor: Water.speckle,
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    width: 8,
  },
});
