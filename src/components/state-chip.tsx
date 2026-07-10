import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius } from '@/constants/aqua-theme';
import { InspectionStatusCopy } from '@/constants/copy';
import { InspectionStatus } from '@/domain/aquaculture';

// 촬영·판정 상태: 대기/완료/실패
const config: Record<InspectionStatus, { label: string; bg: string; line: string; text: string }> = {
  pending: { label: InspectionStatusCopy.pending, bg: Palette.blueBg, line: Palette.blueLine, text: Palette.blue },
  completed: { label: InspectionStatusCopy.completed, bg: Palette.normalBg, line: Palette.normalLine, text: Palette.normal },
  failed: { label: InspectionStatusCopy.failed, bg: Palette.suspiciousBg, line: Palette.suspiciousLine, text: Palette.suspicious },
};

export function StateChip({ status }: { status: InspectionStatus }) {
  const { label, bg, line, text } = config[status];

  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: line }]}>
      <View style={[styles.dot, { backgroundColor: text }]} />
      <Text selectable style={[styles.text, { color: text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: {
    borderRadius: Radius.pill,
    height: 6,
    width: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '800',
  },
});
