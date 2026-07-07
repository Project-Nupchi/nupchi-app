import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { Palette, Radius, Shadow } from '@/constants/aqua-theme';

type ActionButtonProps = {
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  onPress: () => void;
};

export function ActionButton({
  label,
  icon,
  variant = 'primary',
  disabled = false,
  style,
  onPress,
}: ActionButtonProps) {
  const variantStyle = styles[variant];
  const textStyle = variant === 'primary' || variant === 'danger' ? styles.textOnDark : styles.textOnLight;
  const shouldRenderSfIcon = Boolean(icon && process.env.EXPO_OS !== 'web');
  const hasShadow = !disabled && (variant === 'primary' || variant === 'danger');

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        hasShadow && Shadow.card,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {shouldRenderSfIcon ? (
        <Image
          source={`sf:${icon}`}
          style={[styles.icon, { tintColor: textStyle.color }]}
          contentFit="contain"
        />
      ) : null}
      <Text selectable={false} style={[styles.text, textStyle]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radius.button,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primary: {
    backgroundColor: Palette.accent,
  },
  secondary: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  danger: {
    backgroundColor: Palette.suspicious,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  icon: {
    width: 17,
    height: 17,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  textOnDark: {
    color: Palette.white,
  },
  textOnLight: {
    color: Palette.text,
  },
});
