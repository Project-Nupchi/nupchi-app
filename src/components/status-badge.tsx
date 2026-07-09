import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius } from '@/constants/aqua-theme';
import { TankStatus, statusLabel } from '@/domain/aquaculture';

const colors: Record<TankStatus, { bg: string; line: string; text: string }> = {
  normal: { bg: Palette.normalBg, line: Palette.normalLine, text: Palette.normal },
  caution: { bg: Palette.cautionBg, line: Palette.cautionLine, text: Palette.caution },
  suspicious: { bg: Palette.suspiciousBg, line: Palette.suspiciousLine, text: Palette.suspicious },
};

export function StatusBadge({ status, compact = false }: { status: TankStatus; compact?: boolean }) {
  const color = colors[status];

  return (
    <View style={[styles.badge, { backgroundColor: color.bg, borderColor: color.line }, compact && styles.compact]}>
      <View style={[styles.dot, { backgroundColor: color.text }]} />
      <Text selectable style={[styles.text, { color: color.text }, compact && styles.compactText]}>
        {statusLabel[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  compact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: {
    borderRadius: Radius.pill,
    height: 7,
    width: 7,
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
  },
  compactText: {
    fontSize: 13,
  },
});
