import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { Palette, Radius, Shadow } from '@/constants/aqua-theme';

type ActionButtonProps = {
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'regular' | 'compact';
  disabled?: boolean;
  style?: ViewStyle;
  onPress: () => void;
};

const textColors = {
  primary: Palette.onPrimary,
  secondary: '#1E2A45',
  danger: Palette.white,
  ghost: Palette.primary,
} as const;

export function ActionButton({
  label,
  icon,
  variant = 'primary',
  size = 'regular',
  disabled = false,
  style,
  onPress,
}: ActionButtonProps) {
  const textColor = textColors[variant];
  const shouldRenderSfIcon = Boolean(icon && process.env.EXPO_OS !== 'web');
  const hasShadow = variant === 'primary' || variant === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        hasShadow && !disabled && Shadow.card,
        size === 'compact' && styles.compact,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {shouldRenderSfIcon ? (
        <Image source={`sf:${icon}`} tintColor={textColor} style={styles.icon} contentFit="contain" />
      ) : null}
      <Text selectable={false} style={[styles.text, size === 'compact' && styles.compactText, { color: textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: Radius.button,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 20,
  },
  compact: {
    minHeight: 42,
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: Palette.primary,
  },
  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: Palette.glassLine,
    borderWidth: 1,
    ...Shadow.card,
  },
  danger: {
    backgroundColor: Palette.suspicious,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  icon: {
    width: 18,
    height: 18,
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  compactText: {
    fontSize: 15,
  },
});
