import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { GlassCard } from '@/components/glass-card';
import { PhotoAnalysisStage } from '@/components/photo-analysis-stage';
import { ScreenShell } from '@/components/screen-shell';
import { StatusBadge } from '@/components/status-badge';
import { Palette, Radius, Shadow, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import { InspectionObject, InspectionResult, LesionBox, ObjectInspectionStatus, formatDateTime } from '@/domain/aquaculture';
import { buildPrototypeInspectionVerdict } from '@/services/inspection-server';
import { useAquaculture } from '@/state/aquaculture-store';

type ObjectStatus = ObjectInspectionStatus;
type ObjectFilter = 'all' | ObjectStatus;

type ObjectAnalysis = {
  id: string;
  status: ObjectStatus;
  result: InspectionResult;
};

type TankResponse = {
  status: ObjectStatus;
  totalCount: number;
  suspiciousCount: number;
  normalCount: number;
  title: string;
  diseaseLabels: string[];
  affectedParts: string[];
  summaryAction: string;
  steps: { index: string; title: string; body: string }[];
};

const filters: { key: ObjectFilter; label: string }[] = [
  { key: 'all', label: AppCopy.result.filters.all },
  { key: 'normal', label: AppCopy.result.filters.normal },
  { key: 'suspicious', label: AppCopy.result.filters.suspicious },
];

// 분석 결과 — 촬영 후 서버 판정을 대기/완료/실패로 표시
export default function ResultScreen() {
  const { resultId } = useLocalSearchParams<{ resultId: string }>();
  const { results, tanks, apiMode, analyzeInspection, applyInspectionVerdict, retryInspection } = useAquaculture();
  const insets = useSafeAreaInsets();
  const carouselRef = useRef<ScrollView>(null);
  const [filter, setFilter] = useState<ObjectFilter>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const result = results.find((item) => item.id === resultId);
  const tank = result ? tanks.find((item) => item.id === result.tankId) : undefined;

  useEffect(() => {
    if (result?.status !== 'pending') return;
    analyzeInspection(result.id);
  }, [analyzeInspection, result]);

  const applyPrototypeFallback = () => {
    if (!result) return;
    applyInspectionVerdict(buildPrototypeInspectionVerdict(result));
  };

  const objectAnalyses = useMemo(() => buildObjectAnalyses(result), [result]);
  const filteredAnalyses = useMemo(
    () => objectAnalyses.filter((item) => filter === 'all' || item.status === filter),
    [filter, objectAnalyses]
  );
  const activeAnalysis = filteredAnalyses[activeIndex] ?? filteredAnalyses[0];
  const tankResponse = useMemo(
    () => buildTankResponse(result, objectAnalyses, tank?.groupId),
    [objectAnalyses, result, tank?.groupId]
  );

  const selectFilter = (nextFilter: ObjectFilter) => {
    setActiveIndex(0);
    carouselRef.current?.scrollTo({ x: 0, animated: false });
    setFilter(nextFilter);
  };

  const onCarouselEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (carouselWidth <= 0) return;
    setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / carouselWidth));
  };

  if (!result) {
    return (
      <ScreenShell contentStyle={styles.content}>
        <GlassCard style={styles.panel}>
          <Text selectable style={styles.title}>
            {AppCopy.result.notFound}
          </Text>
          <ActionButton label={AppCopy.common.home} icon="house" onPress={() => router.replace('/')} />
        </GlassCard>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell contentStyle={styles.content} topInset={insets.top + 60}>
      <View style={styles.captureHeader}>
        <Text selectable style={styles.captureTitle}>
          {tank?.id ?? result.tankId}
        </Text>
        <Text selectable style={styles.captureTime}>
          {tank?.groupId ?? AppCopy.common.tankGroupFallback} · {formatDateTime(result.capturedAt)}
        </Text>
      </View>

      {result.status === 'completed' ? (
        <TankResponseCard response={tankResponse} reportTitle={AppCopy.result.reportTitle(tank?.id ?? result.tankId)} />
      ) : null}

      <View style={styles.objectSectionHeader}>
        <Text selectable style={styles.objectSectionTitle}>
          {AppCopy.result.objectDetails}
        </Text>
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            onPress={() => selectFilter(item.key)}
            style={({ pressed }) => [
              styles.filterChip,
              filter === item.key && styles.filterChipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text selectable={false} style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={styles.carouselShell}
        onLayout={(event) => setCarouselWidth(event.nativeEvent.layout.width)}
      >
        {filteredAnalyses.length > 0 && carouselWidth > 0 ? (
          <ScrollView
            ref={carouselRef}
            horizontal
            onMomentumScrollEnd={onCarouselEnd}
            pagingEnabled
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
          >
            {filteredAnalyses.map((analysis) => (
              <View key={analysis.id} style={[styles.carouselItem, { width: carouselWidth }]}>
                <PhotoAnalysisStage result={analysis.result} />
                <View style={styles.photoStatus}>
                  <StatusBadge status={analysis.status} compact binary />
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyStage}>
            <Text selectable style={styles.emptyStageText}>
              {AppCopy.result.emptyFilter}
            </Text>
          </View>
        )}
      </View>

      {filteredAnalyses.length > 1 ? (
        <View style={styles.dots}>
          {filteredAnalyses.map((analysis, index) => (
            <View key={analysis.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      ) : null}

      {result.status === 'pending' ? (
        <GlassCard style={styles.pending}>
          <ActivityIndicator color={Palette.primary} />
          <Text selectable style={styles.pendingTitle}>
            {AppCopy.result.pendingTitle}
          </Text>
          <Text selectable style={styles.body}>
            {AppCopy.result.pendingBody}
          </Text>
        </GlassCard>
      ) : null}

      {result.status === 'failed' ? (
        <GlassCard style={styles.panel}>
          <Text selectable style={styles.title}>
            {AppCopy.result.failedTitle}
          </Text>
          <Text selectable style={styles.body}>
            {result.evidenceSummary}
          </Text>
          <View style={styles.failedActions}>
            <ActionButton label={AppCopy.common.retry} icon="arrow.clockwise" onPress={() => retryInspection(result.id)} style={styles.grow} />
            {apiMode === 'mock' ? (
              <ActionButton label={AppCopy.result.sampleFallback} variant="secondary" onPress={applyPrototypeFallback} style={styles.grow} />
            ) : null}
          </View>
        </GlassCard>
      ) : null}

      {result.status === 'completed' ? (
        <>
          {activeAnalysis ? (
            <GlassCard style={styles.detailCard}>
              <Text selectable style={styles.detailTitle}>
                {AppCopy.result.selectedObject}
              </Text>
              <DetailRow label={AppCopy.result.symptom} value={getSymptomSummary(activeAnalysis.result)} />
              <DetailRow label={AppCopy.result.suspectedDisease} value={activeAnalysis.result.diseases.join(', ') || AppCopy.result.noDisease} />
              <DetailRow label={AppCopy.result.observedPart} value={activeAnalysis.result.bodyParts.join(', ') || AppCopy.result.notDetected} />
            </GlassCard>
          ) : null}

          <View style={styles.notice}>
            <Text selectable style={styles.noticeText}>
              {AppCopy.result.disclaimer}
            </Text>
          </View>
        </>
      ) : null}

    </ScreenShell>
  );
}

function TankResponseCard({ response, reportTitle }: { response: TankResponse; reportTitle: string }) {
  const isSuspicious = response.status === 'suspicious';
  const totalCount = Math.max(response.totalCount, 1);

  return (
    <GlassCard emphasis="strong" style={styles.responseCard}>
      <View style={styles.responseHeader}>
        <View style={styles.responseTitleBlock}>
          <Text selectable style={styles.responseTitle}>
            {reportTitle}
          </Text>
        </View>
        <StatusBadge status={response.status} compact binary />
      </View>

      <View style={styles.responseStats}>
        <ResponseMetric label={AppCopy.result.suspicious} value={`${response.suspiciousCount}/${totalCount}`} emphasized={isSuspicious} />
        <ResponseMetric label={AppCopy.result.normal} value={`${response.normalCount}/${totalCount}`} />
        <ResponseMetric label={AppCopy.result.diseaseCandidate} value={response.diseaseLabels.join(', ') || AppCopy.result.none} />
      </View>

      <View style={styles.stepList}>
        {response.steps.map((step) => (
          <Step key={step.index} status={response.status} {...step} />
        ))}
      </View>

      <View style={styles.summaryAction}>
        <Text selectable style={styles.summaryActionLabel}>
          {AppCopy.result.overallAction}
        </Text>
        <Text selectable style={styles.summaryActionText}>
          {response.summaryAction}
        </Text>
      </View>
    </GlassCard>
  );
}

function ResponseMetric({
  label,
  value,
  emphasized = false,
  wide = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  wide?: boolean;
}) {
  return (
    <View style={[styles.responseMetric, wide && styles.responseMetricWide, emphasized && styles.responseMetricEmphasized]}>
      <Text selectable style={styles.responseMetricLabel}>
        {label}
      </Text>
      <Text selectable style={[styles.responseMetricValue, emphasized && styles.responseMetricValueEmphasized]}>
        {value}
      </Text>
    </View>
  );
}

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

function buildObjectAnalyses(result?: InspectionResult): ObjectAnalysis[] {
  if (!result) return [];

  const status = result.grade === 'normal' ? 'normal' : 'suspicious';
  if (result.status !== 'completed') {
    return [{ id: `${result.id}-pending`, status, result }];
  }

  if (result.objects && result.objects.length > 0) {
    return result.objects.map((object) => ({
      id: `${result.id}-${object.id}`,
      status: object.grade,
      result: buildResultForObject(result, object),
    }));
  }

  if (status === 'normal' || result.lesions.length === 0) {
    return [{ id: `${result.id}-object-1`, status, result: { ...result, grade: status } }];
  }

  return result.lesions.map((lesion, index) => {
    const bodyParts = inferBodyPartsForLesion(result.bodyParts, lesion);
    return {
      id: `${result.id}-${lesion.id}`,
      status,
      result: {
        ...result,
        grade: status,
        lesions: [lesion],
        bodyParts,
        evidenceSummary: AppCopy.result.objectEvidence(index + 1, lesion.label, result.evidenceSummary),
      },
    };
  });
}

function buildResultForObject(result: InspectionResult, object: InspectionObject): InspectionResult {
  return {
    ...result,
    grade: object.grade,
    photoUri: object.photoUri ?? result.photoUri,
    bodyParts: object.bodyParts,
    diseases: object.diseases,
    evidenceSummary: object.evidenceSummary,
    lesions: object.lesions,
  };
}

function buildTankResponse(result: InspectionResult | undefined, analyses: ObjectAnalysis[], groupId?: string): TankResponse {
  const totalCount = analyses.length;
  const suspiciousAnalyses = analyses.filter((analysis) => analysis.status === 'suspicious');
  const suspiciousCount = suspiciousAnalyses.length;
  const normalCount = Math.max(totalCount - suspiciousCount, 0);
  const status: ObjectStatus = suspiciousCount > 0 ? 'suspicious' : 'normal';
  const diseaseLabels = unique(suspiciousAnalyses.flatMap((analysis) => analysis.result.diseases));
  const affectedParts = unique(suspiciousAnalyses.flatMap((analysis) => analysis.result.bodyParts));
  const groupName = groupId ?? AppCopy.common.sharedGroupFallback;

  if (!result || status === 'normal') {
    return {
      status: 'normal',
      totalCount,
      suspiciousCount,
      normalCount,
      title: AppCopy.result.normalResponseTitle,
      diseaseLabels,
      affectedParts,
      summaryAction: AppCopy.result.normalResponseAction,
      steps: [
        { index: '1', title: AppCopy.result.regularCaptureTitle, body: AppCopy.result.regularCaptureBody },
        { index: '2', title: AppCopy.result.preserveRecordsTitle, body: AppCopy.result.preserveRecordsBody(groupName) },
      ],
    };
  }

  return {
    status,
    totalCount,
    suspiciousCount,
    normalCount,
    title: AppCopy.result.suspiciousResponseTitle,
    diseaseLabels,
    affectedParts,
    summaryAction: AppCopy.result.suspiciousResponseAction(groupName),
    steps: [
      { index: '1', title: AppCopy.result.separateRouteTitle, body: AppCopy.result.separateRouteBody(groupName) },
      { index: '2', title: AppCopy.result.recaptureTitle, body: AppCopy.result.recaptureBody(suspiciousCount) },
      { index: '3', title: AppCopy.result.expertReviewTitle, body: AppCopy.result.expertReviewBody },
    ],
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function inferBodyPartsForLesion(bodyParts: string[], lesion: LesionBox) {
  if (bodyParts.length <= 1) return bodyParts;
  const normalized = lesion.label.replace(/\s/g, '');
  const matched = bodyParts.find((part) => normalized.includes(part.replace(/\s/g, '')));
  return matched ? [matched] : [bodyParts[0]];
}

function getSymptomSummary(result: InspectionResult) {
  return result.lesions.map((lesion) => lesion.label).join(', ') || result.bodyParts.join(', ') || AppCopy.result.noFinding;
}

function Step({ index, title, body, status }: { index: string; title: string; body: string; status: ObjectStatus }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepNum, status === 'normal' && styles.stepNumNormal]}>
        <Text selectable={false} style={[styles.stepNumText, status === 'normal' && styles.stepNumTextNormal]}>
          {index}
        </Text>
      </View>
      <View style={styles.stepText}>
        <Text selectable style={styles.stepTitle}>
          {title}
        </Text>
        <Text selectable style={styles.stepBody}>
          {body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Space.md,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 0,
  },
  captureHeader: {
    alignItems: 'flex-start',
    gap: Space.xs,
    marginBottom: Space.sm,
  },
  captureTitle: {
    color: Palette.onGradient,
    ...Type.display,
  },
  captureTime: {
    color: Palette.onGradientMuted,
    textAlign: 'left',
    ...Type.label2,
  },
  responseCard: {
    gap: Space.lg,
    padding: Space.lg,
  },
  responseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.md,
    justifyContent: 'space-between',
  },
  responseTitleBlock: {
    flex: 1,
    gap: Space.xs,
  },
  responseTitle: {
    color: Palette.text,
    ...Type.heading1,
  },
  responseStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  responseMetric: {
    backgroundColor: Palette.glassMuted,
    borderRadius: Radius.button,
    flex: 1,
    gap: Space.xs,
    minWidth: 0,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },
  responseMetricWide: {
    flexBasis: '100%',
  },
  responseMetricEmphasized: {
    backgroundColor: Palette.suspiciousBg,
  },
  responseMetricLabel: {
    color: Palette.textSubtle,
    ...Type.label3,
  },
  responseMetricValue: {
    color: Palette.text,
    ...Type.label2,
  },
  responseMetricValueEmphasized: {
    color: Palette.suspicious,
  },
  summaryAction: {
    backgroundColor: Palette.glassMuted,
    borderRadius: Radius.button,
    gap: Space.xs,
    padding: Space.md,
  },
  summaryActionLabel: {
    color: Palette.textSubtle,
    ...Type.label3,
  },
  summaryActionText: {
    color: Palette.text,
    ...Type.body2,
  },
  objectSectionHeader: {
    marginTop: Space.sm,
  },
  objectSectionTitle: {
    color: 'rgba(20, 23, 30, 0.8)',
    ...Type.heading2,
  },
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.sm,
  },
  filterChip: {
    backgroundColor: Palette.glass,
    borderColor: Palette.glassLine,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    ...Shadow.card,
  },
  filterChipActive: {
    backgroundColor: Palette.white,
    borderColor: Palette.white,
  },
  filterText: {
    color: Palette.textMuted,
    ...Type.label2,
  },
  filterTextActive: {
    color: Palette.primary,
  },
  carouselShell: {
    minHeight: 260,
  },
  carouselItem: {
    position: 'relative',
  },
  photoStatus: {
    position: 'absolute',
    right: Space.md,
    top: Space.md,
  },
  emptyStage: {
    alignItems: 'center',
    aspectRatio: 4 / 3,
    backgroundColor: Palette.glass,
    borderColor: Palette.glassLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    justifyContent: 'center',
    ...Shadow.card,
  },
  emptyStageText: {
    color: Palette.textMuted,
    ...Type.body2,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.xs,
    justifyContent: 'center',
    marginTop: -Space.xs,
  },
  dot: {
    backgroundColor: Palette.glassLine,
    borderRadius: Radius.pill,
    height: 6,
    width: 6,
  },
  dotActive: {
    backgroundColor: Palette.primary,
    width: 18,
  },
  pending: {
    alignItems: 'center',
    gap: Space.sm,
    padding: Space.xl,
  },
  pendingTitle: {
    color: Palette.text,
    ...Type.heading1,
  },
  panel: {
    gap: Space.md,
    padding: Space.lg,
  },
  failedActions: {
    flexDirection: 'row',
    gap: Space.md,
  },
  title: {
    color: Palette.text,
    ...Type.heading1,
  },
  body: {
    color: Palette.textMuted,
    ...Type.body2,
    textAlign: 'center',
  },
  gradeKicker: {
    color: Palette.textSubtle,
    ...Type.label3,
    textTransform: 'uppercase',
  },
  detailCard: {
    gap: Space.md,
    padding: Space.lg,
  },
  detailTitle: {
    color: Palette.text,
    ...Type.heading1,
  },
  detailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Space.md,
  },
  detailLabel: {
    color: Palette.textSubtle,
    ...Type.label2,
    width: 72,
  },
  detailValue: {
    color: Palette.text,
    flex: 1,
    ...Type.body1,
  },
  stepList: {
    gap: Space.md,
  },
  step: {
    flexDirection: 'row',
    gap: Space.md,
  },
  stepNum: {
    alignItems: 'center',
    backgroundColor: Palette.suspiciousBg,
    borderRadius: Radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepNumNormal: {
    backgroundColor: Palette.normalBg,
  },
  stepNumText: {
    color: Palette.suspicious,
    ...Type.label2,
  },
  stepNumTextNormal: {
    color: Palette.normal,
  },
  stepText: {
    flex: 1,
    gap: Space.xs,
  },
  stepTitle: {
    color: Palette.text,
    ...Type.body1,
  },
  stepBody: {
    color: Palette.textMuted,
    ...Type.body2,
  },
  notice: {
    backgroundColor: Palette.glassMuted,
    borderRadius: Radius.button,
    padding: Space.md,
  },
  noticeText: {
    color: Palette.text,
    ...Type.caption,
    opacity: 0.9,
  },
  grow: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
