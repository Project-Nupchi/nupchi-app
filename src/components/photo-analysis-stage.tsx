import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { FlounderMark } from '@/components/tank-decor';
import { Palette, Radius, Shadow, Water } from '@/constants/aqua-theme';
import { InspectionResult } from '@/domain/aquaculture';

export function PhotoAnalysisStage({ result }: { result: InspectionResult }) {
  const hasPhoto = Boolean(result.photoUri && !result.photoUri.startsWith('mock://'));
  const completed = result.status === 'completed';

  return (
    <View style={styles.frame}>
      {hasPhoto ? (
        <Image source={{ uri: result.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={styles.placeholder}>
          <View style={styles.sandBed} />
          <FlounderMark width={200} showLesion={completed && result.lesions.length > 0} />
        </View>
      )}

      {/* 실제 사진일 때만 좌표 기반 병변 박스를 그린다 */}
      {hasPhoto && completed
        ? result.lesions.map((box) => (
            <View
              key={box.id}
              style={[
                styles.box,
                { left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%` },
              ]}
            >
              <Text selectable style={styles.boxLabel}>
                {box.label}
              </Text>
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 4 / 3,
    backgroundColor: '#EAF1F8',
    borderColor: Palette.glassLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.card,
  },
  placeholder: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sandBed: {
    backgroundColor: Water.sandBed,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 50,
    bottom: 0,
    height: '22%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  box: {
    backgroundColor: 'rgba(210, 69, 58, 0.12)',
    borderColor: Water.lesion,
    borderRadius: 4,
    borderStyle: 'dashed',
    borderWidth: 2,
    position: 'absolute',
  },
  boxLabel: {
    backgroundColor: Water.lesion,
    borderRadius: 5,
    color: Palette.white,
    fontSize: 12,
    fontWeight: '800',
    left: -2,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
    top: -26,
  },
});
