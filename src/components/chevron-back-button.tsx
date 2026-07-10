import { Pressable, StyleSheet, type ColorValue, View } from 'react-native';

import { Palette, Space } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';

type ChevronBackButtonProps = {
  color?: ColorValue;
  onPress: () => void;
};

export function ChevronBackButton({ color = Palette.text, onPress }: ChevronBackButtonProps) {
  return (
    <Pressable
      accessibilityLabel={AppCopy.common.back}
      accessibilityRole="button"
      hitSlop={Space.sm}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
        <View
          style={[
            styles.chevron,
            {
              borderBottomColor: color,
              borderLeftColor: color,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    height: Space.xl,
    justifyContent: 'center',
    width: Space.xl,
    zIndex: 1,
  },
  icon: {
    alignItems: 'center',
    height: Space.xl,
    justifyContent: 'center',
    width: Space.xl,
  },
  chevron: {
    borderBottomWidth: Space.xxs,
    borderLeftWidth: Space.xxs,
    height: Space.sm + Space.xxs,
    marginLeft: Space.xs,
    transform: [{ rotate: '45deg' }],
    width: Space.sm + Space.xxs,
  },
  pressed: {
    opacity: 0.72,
  },
});
