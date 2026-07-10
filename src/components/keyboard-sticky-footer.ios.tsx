import type { PropsWithChildren } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

type KeyboardStickyFooterProps = PropsWithChildren<{
  closedBottom: number;
  keyboardGap: number;
  style?: StyleProp<ViewStyle>;
}>;

// 키보드 프레임을 UI thread에서 직접 따라가 버튼이 키보드보다 늦게 움직이지 않게 한다.
export function KeyboardStickyFooter({
  children,
  closedBottom,
  keyboardGap,
  style,
}: KeyboardStickyFooterProps) {
  const keyboard = useAnimatedKeyboard();
  const keyboardStyle = useAnimatedStyle(() => {
    const openBottom = keyboard.height.value + keyboardGap;
    const targetBottom = Math.max(closedBottom, openBottom);

    return {
      transform: [{ translateY: closedBottom - targetBottom }],
    };
  }, [closedBottom, keyboardGap]);

  return (
    <Animated.View style={[style, { bottom: closedBottom }, keyboardStyle]}>
      {children}
    </Animated.View>
  );
}
