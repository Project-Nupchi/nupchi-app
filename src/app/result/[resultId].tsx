import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { GlassCard } from '@/components/glass-card';
import { PhotoAnalysisStage } from '@/components/photo-analysis-stage';
import { ScreenShell } from '@/components/screen-shell';
import { StateChip } from '@/components/state-chip';
import { StatusBadge } from '@/components/status-badge';
import { Palette, Radius, Space } from '@/constants/aqua-theme';
import { formatDateTime, statusLabel } from '@/domain/aquaculture';
import { useAquaculture } from '@/state/aquaculture-store';

// 분석 결과 — 촬영 후 서버 판정을 대기/완료/실패로 표시
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
        if (isCurrent) applyInspectionVerdict(verdict);
      })
      .catch(() => {
        if (isCurrent) failInspection(result.id);
      });
    return () => {
      isCurrent = false;
    };
  }, [applyInspectionVerdict, failInspection, result]);

  if (!result) {
    return (
      <ScreenShell>
        <GlassCard style={styles.panel}>
          <Text selectable style={styles.title}>
            분석 결과를 찾을 수 없습니다
          </Text>
          <ActionButton label="홈으로" icon="house" onPress={() => router.replace('/')} />
        </GlassCard>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell contentStyle={styles.content}>
      <View style={styles.metaRow}>
        <Text selectable style={styles.metaText}>
          {tank?.id ?? result.tankId} · {tank?.groupId ?? '수조군'} · {formatDateTime(result.capturedAt)}
        </Text>
        <StateChip status={result.status} />
      </View>

      <PhotoAnalysisStage result={result} />

      {result.status === 'pending' ? (
        <GlassCard style={styles.pending}>
          <ActivityIndicator color={Palette.primary} />
          <Text selectable style={styles.pendingTitle}>
            AI가 분석 중이에요
          </Text>
          <Text selectable style={styles.body}>
            촬영본은 이미 저장됐어요. 서버가 어체·병변 부위를 검출하고 질병 후보를 판정하고 있어요.
          </Text>
        </GlassCard>
      ) : null}

      {result.status === 'failed' ? (
        <GlassCard style={styles.panel}>
          <Text selectable style={styles.title}>
            분석 실패
          </Text>
          <Text selectable style={styles.body}>
            {result.evidenceSummary}
          </Text>
          <ActionButton label="재시도" icon="arrow.clockwise" onPress={() => retryInspection(result.id)} />
        </GlassCard>
      ) : null}

      {result.status === 'completed' ? (
        <>
          <GlassCard emphasis="strong" style={[styles.gradeCard, gradeTint[result.grade]]}>
            <View style={styles.gradeText}>
              <Text selectable style={styles.gradeKicker}>
                분석 상태
              </Text>
              <Text selectable style={[styles.gradeWord, { color: gradeColor[result.grade] }]}>
                {statusLabel[result.grade]}
              </Text>
            </View>
            <StatusBadge status={result.grade} />
          </GlassCard>

          <GlassCard style={styles.detailCard}>
            <DetailRow label="증상" value={result.lesions.map((l) => l.label).join(', ') || result.bodyParts.join(', ') || '특이 소견 없음'} />
            <DetailRow label="의심 질병" value={result.diseases.join(', ') || '의심 질병 없음'} />
            <DetailRow label="관찰 부위" value={result.bodyParts.join(', ') || '감지 없음'} />
            <View style={styles.divider} />
            <Text selectable style={styles.summary}>
              {result.evidenceSummary}
            </Text>
          </GlassCard>

          {result.grade !== 'normal' ? (
            <ActionButton
              label="AI 대응 제안 보기"
              icon="sparkles"
              variant={result.grade === 'suspicious' ? 'danger' : 'primary'}
              onPress={() => router.push({ pathname: '/guidance/[resultId]', params: { resultId: result.id } })}
            />
          ) : null}

          <View style={styles.notice}>
            <Text selectable style={styles.noticeText}>
              이 결과는 확률적 참고치이며 확진이 아닙니다. 격리·투약·신고 등 최종 판단은 관리자와 전문가 확인을 거쳐야 합니다.
            </Text>
          </View>
        </>
      ) : null}

      <View style={styles.bottomActions}>
        <ActionButton label="홈으로" variant="secondary" onPress={() => router.replace('/')} style={styles.grow} />
        <ActionButton
          label="다시 촬영"
          variant="secondary"
          onPress={() => router.replace({ pathname: '/camera', params: { tankId: result.tankId } })}
          style={styles.grow}
        />
      </View>
    </ScreenShell>
  );
}

const gradeTint = {
  normal: { borderColor: Palette.normalLine },
  caution: { borderColor: Palette.cautionLine },
  suspicious: { borderColor: Palette.suspiciousLine },
} as const;

const gradeColor = {
  normal: Palette.normal,
  caution: Palette.caution,
  suspicious: Palette.suspicious,
} as const;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text selectable style={styles.detailLabel}>
        {label}
      </Text>
      <Text selectable style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Space.md,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.md,
    justifyContent: 'space-between',
    marginTop: Space.xl,
  },
  metaText: {
    color: Palette.onGradient,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  pending: {
    alignItems: 'center',
    gap: Space.sm,
    padding: Space.xl,
  },
  pendingTitle: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  panel: {
    gap: Space.md,
    padding: Space.lg,
  },
  title: {
    color: Palette.text,
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    color: Palette.textMuted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  gradeCard: {
    alignItems: 'center',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: Space.md,
    justifyContent: 'space-between',
    padding: Space.lg,
  },
  gradeText: {
    gap: 2,
  },
  gradeKicker: {
    color: Palette.textSubtle,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  gradeWord: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  detailCard: {
    gap: Space.md,
    padding: Space.lg,
  },
  detailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Space.md,
  },
  detailLabel: {
    color: Palette.textSubtle,
    fontSize: 14,
    fontWeight: '800',
    width: 72,
  },
  detailValue: {
    color: Palette.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  divider: {
    backgroundColor: Palette.glassHairline,
    height: 1,
  },
  summary: {
    color: Palette.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  notice: {
    backgroundColor: Palette.glassMuted,
    borderRadius: Radius.button,
    padding: Space.md,
  },
  noticeText: {
    color: Palette.text,
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.9,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: Space.md,
    marginTop: Space.xs,
  },
  grow: {
    flex: 1,
  },
});
