import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius } from '@/constants/aqua-theme';
import { TankStatus, statusLabel } from '@/domain/aquaculture';

const colors: Record<TankStatus, { bg: string; text: string }> = {
  normal: { bg: Palette.surfaceMuted, text: Palette.normal },
  caution: { bg: Palette.cautionBg, text: Palette.caution },
  suspicious: { bg: Palette.suspiciousBg, text: Palette.suspicious },
};

export function StatusBadge({ status, compact = false }: { status: TankStatus; compact?: boolean }) {
  const color = colors[status];

  return (
    <View style={[styles.badge, { backgroundColor: color.bg }, compact && styles.compact]}>
      <Text selectable style={[styles.text, { color: color.text }, compact && styles.compactText]}>
        {statusLabel[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  compact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
  },
  compactText: {
    fontSize: 13,
  },
});
