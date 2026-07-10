import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AnalysisResult, Palette, Radius } from '@/constants/aqua-theme';
import { InspectionResult, LesionBox } from '@/domain/aquaculture';

const analysisPhoto = require('../../assets/images/results/flounder-analysis.png');
const DEFAULT_ASPECT_RATIO = 353 / 217;

// 데모 사진 위 병변 표시 위치 (좌표 %). 병변 수가 많아도 프레임 안에서 순환한다.
const DEMO_LESION_POSITIONS = [
  { left: 41.6, top: 43.3 },
  { left: 54.6, top: 51.3 },
  { left: 28.6, top: 35.3 },
] as const;

export function PhotoAnalysisStage({ result }: { result: InspectionResult }) {
  const usesDemoPhoto = !result.photoUri || result.photoUri.startsWith('mock://');
  const source = usesDemoPhoto ? analysisPhoto : { uri: result.photoUri };
  const [loadedImage, setLoadedImage] = useState<{
    aspectRatio: number;
    uri?: string;
  }>({ aspectRatio: DEFAULT_ASPECT_RATIO });
  const [frameWidth, setFrameWidth] = useState(0);
  const imageAspectRatio = loadedImage.uri === result.photoUri
    ? loadedImage.aspectRatio
    : DEFAULT_ASPECT_RATIO;
  const frameHeight = frameWidth > 0
    ? Math.min(frameWidth / imageAspectRatio, AnalysisResult.imageMaxHeight)
    : undefined;
  const boxes = result.status === 'completed' ? result.lesions : [];

  return (
    <View
      onLayout={({ nativeEvent }) => {
        const nextWidth = Math.round(nativeEvent.layout.width);
        if (nextWidth > 0 && nextWidth !== frameWidth) setFrameWidth(nextWidth);
      }}
      style={[
        styles.frame,
        usesDemoPhoto || frameHeight === undefined
          ? styles.defaultFrame
          : { height: frameHeight },
      ]}
    >
      {usesDemoPhoto ? (
        <>
          <Image
            accessibilityLabel="분석 대상 광어 사진"
            contentFit="fill"
            source={source}
            style={styles.demoPhoto}
          />
          <DetectionBoxes boxes={boxes} usesDemoPhoto />
        </>
      ) : (
        <View style={[styles.imagePlane, { aspectRatio: imageAspectRatio }]}>
          <Image
            accessibilityLabel="개체 분석 이미지"
            contentFit="fill"
            onLoad={({ source: loadedSource }) => {
              if (loadedSource.width <= 0 || loadedSource.height <= 0) return;
              setLoadedImage({
                aspectRatio: loadedSource.width / loadedSource.height,
                uri: result.photoUri,
              });
            }}
            recyclingKey={result.photoUri}
            source={source}
            style={StyleSheet.absoluteFill}
          />
          <DetectionBoxes boxes={boxes} usesDemoPhoto={false} />
        </View>
      )}
    </View>
  );
}

function DetectionBoxes({
  boxes,
  usesDemoPhoto,
}: {
  boxes: LesionBox[];
  usesDemoPhoto: boolean;
}) {
  return boxes.map((box, index) => (
    <View
      accessibilityLabel={`${box.label} 감지 영역`}
      accessible
      key={box.id}
      style={[styles.box, getBoxStyle(box, usesDemoPhoto, index)]}
    />
  ));
}

function getBoxStyle(box: LesionBox, usesDemoPhoto: boolean, index: number) {
  if (usesDemoPhoto) {
    // Figma 데모 사진의 확대 크롭 좌표. 여러 병변은 겹치지 않도록 미리 정의한 위치를 순환한다.
    const demoPosition = DEMO_LESION_POSITIONS[index % DEMO_LESION_POSITIONS.length];
    return {
      height: '21.7%',
      left: `${demoPosition.left}%`,
      top: `${demoPosition.top}%`,
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
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.analysisImage,
    justifyContent: 'center',
    maxHeight: AnalysisResult.imageMaxHeight,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  defaultFrame: {
    aspectRatio: DEFAULT_ASPECT_RATIO,
  },
  imagePlane: {
    height: '100%',
    maxWidth: '100%',
    position: 'relative',
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
