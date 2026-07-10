import type { PropsWithChildren } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

type KeyboardStickyFooterProps = PropsWithChildren<{
  closedBottom: number;
  keyboardGap: number;
  style?: StyleProp<ViewStyle>;
}>;

// Android는 기본 adjustResize에 맞춰 줄어든 window 하단에 footer를 고정한다.
export function KeyboardStickyFooter({
  children,
  closedBottom,
  style,
}: KeyboardStickyFooterProps) {
  return <View style={[style, { bottom: closedBottom }]}>{children}</View>;
}
