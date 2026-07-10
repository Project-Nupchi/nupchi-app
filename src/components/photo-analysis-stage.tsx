import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Palette, Radius } from '@/constants/aqua-theme';
import { InspectionResult, LesionBox } from '@/domain/aquaculture';

const analysisPhoto = require('../../assets/images/results/flounder-analysis.png');

export function PhotoAnalysisStage({ result }: { result: InspectionResult }) {
  const usesDemoPhoto = !result.photoUri || result.photoUri.startsWith('mock://');
  const source = usesDemoPhoto ? analysisPhoto : { uri: result.photoUri };

  return (
    <View style={styles.frame}>
      <Image
        accessibilityLabel="분석 대상 광어 사진"
        contentFit={usesDemoPhoto ? "fill" : "cover"}
        source={source}
        style={usesDemoPhoto ? styles.demoPhoto : StyleSheet.absoluteFill}
      />

      {result.status === 'completed'
        ? result.lesions.map((box, index) => (
            <View
              accessibilityLabel={`${box.label} 감지 영역`}
              accessible
              key={box.id}
              style={[styles.box, getBoxStyle(box, usesDemoPhoto, index)]}
            />
          ))
        : null}
    </View>
  );
}

function getBoxStyle(box: LesionBox, usesDemoPhoto: boolean, index: number) {
  if (usesDemoPhoto) {
    // Figma 데모 사진의 확대 크롭 좌표. 여러 병변은 겹치지 않도록 미세하게 이동한다.
    return {
      height: '21.7%',
      left: `${41.6 + index * 13}%`,
      top: `${43.3 + index * 8}%`,
      width: '21%',
    } as const;
  }

  return {
    height: `${box.height}%`,
    left: `${box.x}%`,
    top: `${box.y}%`,
    width: `${box.width}%`,
  } as const;
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 353 / 217,
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.analysisImage,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  demoPhoto: {
    aspectRatio: 1734 / 974,
    left: '-24%',
    position: 'absolute',
    top: '-69%',
    width: '246%',
  },
  box: {
    backgroundColor: Palette.suspiciousBg,
    borderColor: Palette.suspicious,
    borderRadius: Radius.image - 4,
    borderWidth: 1,
    position: 'absolute',
  },
});
