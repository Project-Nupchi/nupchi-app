import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Shadow } from '@/constants/aqua-theme';
import { InspectionResult } from '@/domain/aquaculture';

export function PhotoAnalysisStage({ result }: { result: InspectionResult }) {
  const hasPhoto = Boolean(result.photoUri && !result.photoUri.startsWith('mock://'));

  return (
    <View style={styles.frame}>
      {hasPhoto ? (
        <Image source={{ uri: result.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={styles.placeholder}>
          <View style={styles.fishShape} />
          <Text selectable style={styles.placeholderText}>
            촬영 이미지
          </Text>
        </View>
      )}

      {result.status === 'completed'
        ? result.lesions.map((box) => (
            <View
              key={box.id}
              style={[
                styles.box,
                {
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                },
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
    backgroundColor: Palette.ink,
    borderRadius: Radius.card,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.card,
  },
  placeholder: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
    backgroundColor: '#DCE7E4',
    justifyContent: 'center',
    gap: 12,
  },
  fishShape: {
    width: '70%',
    height: 52,
    borderRadius: 999,
    backgroundColor: '#8CA39B',
    transform: [{ rotate: '-5deg' }],
  },
  placeholderText: {
    color: Palette.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  box: {
    position: 'absolute',
    borderColor: Palette.suspicious,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: 'rgba(192, 54, 44, 0.12)',
  },
  boxLabel: {
    position: 'absolute',
    left: -2,
    top: -26,
    backgroundColor: Palette.suspicious,
    borderRadius: 5,
    color: Palette.white,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
