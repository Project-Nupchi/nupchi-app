import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius } from '@/constants/aqua-theme';
import { TankStatus, statusLabel } from '@/domain/aquaculture';

const colors: Record<TankStatus, { bg: string; text: string; dot: string }> = {
  normal: { bg: Palette.surfaceMuted, text: Palette.normal, dot: Palette.normal },
  caution: { bg: Palette.cautionBg, text: Palette.caution, dot: Palette.caution },
  suspicious: { bg: Palette.suspiciousBg, text: Palette.suspicious, dot: Palette.suspicious },
};

export function StatusBadge({ status, compact = false }: { status: TankStatus; compact?: boolean }) {
  const color = colors[status];

  return (
    <View style={[styles.badge, { backgroundColor: color.bg }, compact && styles.compact]}>
      <View style={[styles.dot, { backgroundColor: color.dot }]} />
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
    height: 6,
    width: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 13,
  },
});
