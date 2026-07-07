import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { PhotoAnalysisStage } from '@/components/photo-analysis-stage';
import { ScreenShell } from '@/components/screen-shell';
import { Section } from '@/components/section';
import { StatusBadge } from '@/components/status-badge';
import { Palette, Radius, Shadow, Space } from '@/constants/aqua-theme';
import { flounderDiseaseLabels, formatDateTime, statusLabel } from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

export default function ResultScreen() {
  const { resultId } = useLocalSearchParams<{ resultId: string }>();
  const { results, tanks, applyInspectionVerdict, failInspection, retryInspection } = useAquaculture();
  const result = results.find((item) => item.id === resultId);
  const tank = result ? tanks.find((item) => item.id === result.tankId) : undefined;

  useEffect(() => {
    if (result?.status !== 'pending') return;
    let isCurrent = true;

    import('@/services/inspection-server')
      .then(({ requestInspectionVerdict }) => requestInspectionVerdict(result))
      .then((verdict) => {
        if (isCurrent) {
          applyInspectionVerdict(verdict);
        }
      })
      .catch(() => {
        if (isCurrent) {
          failInspection(result.id);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [applyInspectionVerdict, failInspection, result]);

  if (!result) {
    return (
      <ScreenShell>
        <View style={styles.panel}>
          <Text selectable style={styles.title}>
            점검 결과를 찾을 수 없습니다
          </Text>
          <ActionButton label="목록으로" icon="list.bullet" onPress={() => router.replace('/')} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <PhotoAnalysisStage result={result} />

      {result.status === 'pending' ? (
        <View style={styles.pendingPanel}>
          <ActivityIndicator color={Palette.accent} />
          <Text selectable style={styles.title}>
            판정 중
          </Text>
          <Text selectable style={styles.body}>
            서버가 광어 이미지에서 어체·의심 부위를 검출하고 7개 질병 후보를 병렬 판정하고 있습니다.
          </Text>
        </View>
      ) : null}

      {result.status === 'failed' ? (
        <View style={styles.panel}>
          <Text selectable style={styles.title}>
            판정 실패
          </Text>
          <Text selectable style={styles.body}>
            {result.evidenceSummary}
          </Text>
          <ActionButton label="재시도" icon="arrow.clockwise" onPress={() => retryInspection(result.id)} />
        </View>
      ) : null}

      {result.status === 'completed' ? (
        <>
          <View style={[styles.resultHead, gradePanels[result.grade]]}>
            <View style={styles.resultMeta}>
              <Text selectable style={styles.kicker}>
                {tank?.id ?? result.tankId} · {tank?.groupId ?? '수조군'} · {formatDateTime(result.capturedAt)}
              </Text>
              <Text selectable style={[styles.title, { color: gradeTitleColors[result.grade] }]}>
                {statusLabel[result.grade]} 등급
              </Text>
            </View>
            <StatusBadge status={result.grade} />
          </View>

          <Section title="AI 판정 근거">
            <InfoRow label="부위" value={result.bodyParts.join(', ') || '감지 없음'} />
            <InfoRow label="의심 질병" value={result.diseases.join(', ') || '의심 후보 없음'} />
            <InfoRow label="판정 범위" value={flounderDiseaseLabels.join(', ')} />
            <Text selectable style={styles.body}>
              {result.evidenceSummary}
            </Text>
          </Section>

          <View style={styles.notice}>
            <Text selectable style={styles.noticeTitle}>
              확진 아님
            </Text>
            <Text selectable style={styles.noticeBody}>
              이 결과는 광어 이미지 기반 선별 보조 정보입니다. 최종 진단, 격리, 투약, 신고 판단은 관리자와 전문가 확인을 거쳐야 합니다.
            </Text>
          </View>

          {result.grade === 'suspicious' ? (
            <ActionButton
              label="대응·신고 안내 보기"
              icon="exclamationmark.triangle.fill"
              variant="danger"
              onPress={() => router.push({ pathname: '/guidance/[resultId]', params: { resultId: result.id } })}
            />
          ) : null}
        </>
      ) : null}

      <View style={styles.bottomActions}>
        <ActionButton label="목록으로" icon="list.bullet" variant="secondary" onPress={() => router.replace('/')} style={styles.actionFlex} />
        <ActionButton
          label="다시 촬영"
          icon="camera"
          variant="secondary"
          onPress={() => router.push({ pathname: '/capture', params: { tankId: result.tankId } })}
          style={styles.actionFlex}
        />
      </View>
    </ScreenShell>
  );
}

// 판정 등급별 헤더 패널 배경·테두리
const gradePanels = {
  normal: { backgroundColor: Palette.surface, borderColor: Palette.line },
  caution: { backgroundColor: Palette.cautionBg, borderColor: Palette.cautionLine },
  suspicious: { backgroundColor: Palette.suspiciousBg, borderColor: Palette.suspiciousLine },
} as const;

const gradeTitleColors = {
  normal: Palette.text,
  caution: Palette.caution,
  suspicious: Palette.suspicious,
} as const;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text selectable style={styles.infoLabel}>
        {label}
      </Text>
      <Text selectable style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pendingPanel: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.md,
    padding: Space.xl,
    ...Shadow.card,
  },
  panel: {
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.md,
    padding: Space.lg,
    ...Shadow.card,
  },
  resultHead: {
    alignItems: 'flex-start',
    borderRadius: Radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Space.md,
    justifyContent: 'space-between',
    padding: Space.lg,
    ...Shadow.card,
  },
  resultMeta: {
    flex: 1,
    gap: 4,
  },
  kicker: {
    color: Palette.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: Palette.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  body: {
    color: Palette.textMuted,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 23,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    color: Palette.textSubtle,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  infoValue: {
    color: Palette.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
  },
  notice: {
    backgroundColor: Palette.cautionBg,
    borderColor: Palette.cautionLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 6,
    padding: Space.lg,
  },
  noticeTitle: {
    color: Palette.caution,
    fontSize: 15,
    fontWeight: '800',
  },
  noticeBody: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: Space.md,
  },
  actionFlex: {
    flex: 1,
  },
});
