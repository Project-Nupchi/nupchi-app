import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { AnalysisLoadingScreen } from '@/components/analysis-loading-screen';
import { GlassCard } from '@/components/glass-card';
import { GuidanceModal } from '@/components/guidance-modal';
import { PhotoAnalysisStage } from '@/components/photo-analysis-stage';
import { ScreenShell } from '@/components/screen-shell';
import { StatusBadge } from '@/components/status-badge';
import { Palette, Radius, Shadow, Space, Type } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import {
  InspectionObject,
  InspectionResult,
  LesionBox,
  ObjectInspectionStatus,
  formatDateTime,
  statusLabel,
} from '@/domain/aquaculture';
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
  totalCount: number;
  suspiciousCount: number;
  normalCount: number;
  diseaseLabels: string[];
};

const filters: { key: ObjectFilter; label: string }[] = [
  { key: 'all', label: AppCopy.result.filters.all },
  { key: 'normal', label: AppCopy.result.filters.normal },
  { key: 'suspicious', label: AppCopy.result.filters.suspicious },
];

const resultStatusIcons: Record<InspectionResult['grade'], number> = {
  suspicious: require('../../../assets/images/home/status-warn.png'),
  caution: require('../../../assets/images/home/status-suspect.png'),
  normal: require('../../../assets/images/home/status-good.png'),
};

const INFO_POPOVER_WIDTH = 217;
const APP_BAR_HEIGHT = Space.lg * 3;
const INFO_BUTTON_SIZE = Space.lg;
const INFO_BUTTON_HIT_SLOP = (Space.xxl + Space.sm - INFO_BUTTON_SIZE) / 2;

// 분석 결과 — 촬영 후 서버 판정을 대기/완료/실패로 표시
export default function ResultScreen() {
  const { resultId } = useLocalSearchParams<{ resultId: string }>();
  const { results, tanks, apiMode, analyzeInspection, applyInspectionVerdict, retryInspection } = useAquaculture();
  const insets = useSafeAreaInsets();
  const [carouselOpacity] = useState(() => new Animated.Value(1));
  const [isCarouselTransitioning, setIsCarouselTransitioning] = useState(false);
  const [filter, setFilter] = useState<ObjectFilter>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const result = results.find((item) => item.id === resultId);
  const tank = result ? tanks.find((item) => item.id === result.tankId) : undefined;
  const contentTop = Platform.OS === 'ios' ? Space.sm : insets.top + APP_BAR_HEIGHT + Space.sm;

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
  const tankResponse = useMemo(() => buildTankResponse(objectAnalyses), [objectAnalyses]);

  const selectFilter = (nextFilter: ObjectFilter) => {
    carouselOpacity.stopAnimation();
    carouselOpacity.setValue(1);
    setIsCarouselTransitioning(false);
    setActiveIndex(0);
    setFilter(nextFilter);
  };

  const showAnalysis = useCallback((index: number) => {
    if (filteredAnalyses.length === 0 || isCarouselTransitioning) return;
    const nextIndex = Math.max(0, Math.min(index, filteredAnalyses.length - 1));
    if (nextIndex === activeIndex) return;

    setIsCarouselTransitioning(true);
    Animated.timing(carouselOpacity, {
      duration: 90,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        carouselOpacity.setValue(1);
        setIsCarouselTransitioning(false);
        return;
      }

      setActiveIndex(nextIndex);
      requestAnimationFrame(() => {
        Animated.timing(carouselOpacity, {
          duration: 140,
          toValue: 1,
          useNativeDriver: true,
        }).start(() => {
          setIsCarouselTransitioning(false);
        });
      });
    });
  }, [activeIndex, carouselOpacity, filteredAnalyses.length, isCarouselTransitioning]);

  const carouselPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          filteredAnalyses.length > 1 &&
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          filteredAnalyses.length > 1 &&
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) < 48 && Math.abs(gesture.vx) < 0.45) return;
          showAnalysis(activeIndex + (gesture.dx < 0 ? 1 : -1));
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [activeIndex, filteredAnalyses.length, showAnalysis]
  );

  const activeAnalysis = filteredAnalyses[activeIndex] ?? filteredAnalyses[0];

  if (!result) {
    return (
      <ScreenShell contentStyle={styles.content} gradient="detail">
        <GlassCard style={styles.panel}>
          <Text selectable style={styles.title}>
            {AppCopy.result.notFound}
          </Text>
          <ActionButton label={AppCopy.common.home} icon="house" onPress={() => router.replace('/')} />
        </GlassCard>
      </ScreenShell>
    );
  }

  if (result.status === 'pending') {
    return <AnalysisLoadingScreen />;
  }

  return (
    <>
      <ScreenShell contentStyle={styles.content} gradient="detail" topInset={contentTop}>
      {result.status === 'completed' ? (
        <>
          <CompletedSummary
            capturedAt={result.capturedAt}
            groupId={tank?.groupId ?? AppCopy.common.tankGroupFallback}
            onOpenGuidance={() => setIsGuidanceOpen(true)}
            response={tankResponse}
            status={result.grade}
            tankId={tank?.id ?? result.tankId}
          />

          <View style={styles.completedAnalysis}>
            <ObjectFilters filter={filter} onSelect={selectFilter} />

            <View style={styles.analysisHeading}>
              <Text selectable style={styles.objectSectionTitle}>
                {AppCopy.result.objectDetails}
              </Text>
              <View style={styles.pager}>
                <PagerButton
                  accessibilityLabel="이전 개체"
                  disabled={isCarouselTransitioning || activeIndex <= 0 || filteredAnalyses.length === 0}
                  direction="previous"
                  onPress={() => showAnalysis(activeIndex - 1)}
                />
                <Text selectable style={styles.pagerText}>
                  {filteredAnalyses.length === 0 ? 0 : activeIndex + 1}/{filteredAnalyses.length}
                </Text>
                <PagerButton
                  accessibilityLabel="다음 개체"
                  disabled={
                    isCarouselTransitioning ||
                    activeIndex >= filteredAnalyses.length - 1 ||
                    filteredAnalyses.length === 0
                  }
                  direction="next"
                  onPress={() => showAnalysis(activeIndex + 1)}
                />
              </View>
            </View>

            <View style={styles.carouselShell} {...carouselPanResponder.panHandlers}>
              {activeAnalysis ? (
                <Animated.View
                  key={activeAnalysis.id}
                  style={[styles.carouselItem, { opacity: carouselOpacity }]}
                >
                  <PhotoAnalysisStage result={activeAnalysis.result} />
                  <GlassCard style={styles.detailCard}>
                    <DetailRow label={AppCopy.result.symptom} value={getSymptomSummary(activeAnalysis.result)} />
                    <DetailRow
                      label={AppCopy.result.suspectedDisease}
                      value={activeAnalysis.result.diseases.join(', ') || AppCopy.result.noDisease}
                    />
                    <DetailRow
                      label={AppCopy.result.observedPart}
                      value={activeAnalysis.result.bodyParts.join(', ') || AppCopy.result.notDetected}
                    />
                  </GlassCard>
                </Animated.View>
              ) : (
                <View style={styles.emptyStage}>
                  <Text selectable style={styles.emptyStageText}>
                    {AppCopy.result.emptyFilter}
                  </Text>
                </View>
              )}
            </View>

            {filteredAnalyses.length > 0 ? (
              <View style={styles.dots}>
                {filteredAnalyses.map((analysis, index) => (
                  <View key={analysis.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.notice}>
            <Text selectable style={styles.noticeText}>
              {AppCopy.result.disclaimer}
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.captureHeader}>
            <Text selectable style={styles.captureTitle}>
              {tank?.id ?? result.tankId}
            </Text>
            <Text selectable style={styles.captureTime}>
              {tank?.groupId ?? AppCopy.common.tankGroupFallback} · {formatDateTime(result.capturedAt)}
            </Text>
          </View>

          <View style={styles.objectSectionHeader}>
            <Text selectable style={styles.objectSectionTitle}>
              {AppCopy.result.objectDetails}
            </Text>
          </View>

          <ObjectFilters filter={filter} onSelect={selectFilter} />

          <View style={styles.carouselShell} {...carouselPanResponder.panHandlers}>
            {activeAnalysis ? (
              <Animated.View
                key={activeAnalysis.id}
                style={[styles.carouselItem, { opacity: carouselOpacity }]}
              >
                <PhotoAnalysisStage result={activeAnalysis.result} />
                <View style={styles.photoStatus}>
                  <StatusBadge status={activeAnalysis.status} compact binary />
                </View>
              </Animated.View>
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

          {result.status === 'failed' ? (
            <GlassCard style={styles.panel}>
              <Text selectable style={styles.title}>
                {AppCopy.result.failedTitle}
              </Text>
              <Text selectable style={styles.body}>
                {result.evidenceSummary}
              </Text>
              <View style={styles.failedActions}>
                <ActionButton
                  label={AppCopy.common.retry}
                  icon="arrow.clockwise"
                  onPress={() => retryInspection(result.id)}
                  style={styles.grow}
                />
                {apiMode === 'mock' ? (
                  <ActionButton
                    label={AppCopy.result.sampleFallback}
                    onPress={applyPrototypeFallback}
                    style={styles.grow}
                    variant="secondary"
                  />
                ) : null}
              </View>
            </GlassCard>
          ) : null}
        </>
      )}
      </ScreenShell>
      <GuidanceModal
        groupId={tank?.groupId ?? AppCopy.common.tankGroupFallback}
        onClose={() => setIsGuidanceOpen(false)}
        visible={isGuidanceOpen}
      />
    </>
  );
}

function CompletedSummary({
  capturedAt,
  groupId,
  onOpenGuidance,
  response,
  status,
  tankId,
}: {
  capturedAt: string;
  groupId: string;
  onOpenGuidance: () => void;
  response: TankResponse;
  status: InspectionResult['grade'];
  tankId: string;
}) {
  const infoButtonRef = useRef<View>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [infoButtonLayout, setInfoButtonLayout] = useState<{
    height: number;
    width: number;
    x: number;
    y: number;
  } | null>(null);
  const [isInfoPopoverOpen, setIsInfoPopoverOpen] = useState(false);
  const totalCount = Math.max(response.totalCount, 1);
  const infectionRiskText = AppCopy.result.infectionRisk;
  const infoButtonAccessibilityLabel = `${AppCopy.result.tankGrade} 감염 의심 안내`;
  const gradeColor =
    status === 'normal' ? Palette.normal : status === 'caution' ? Palette.caution : Palette.suspicious;
  const popoverWidth = Math.min(INFO_POPOVER_WIDTH, windowWidth - Space.md * 2);
  const popoverLeft = infoButtonLayout
    ? Math.max(
        Space.md,
        Math.min(
          infoButtonLayout.x + infoButtonLayout.width / 2 - popoverWidth / 2,
          windowWidth - popoverWidth - Space.md
        )
      )
    : Space.md;
  const arrowHalfWidth = Space.sm - Space.xxs;
  const arrowLeft = infoButtonLayout
    ? Math.max(
        Space.md - arrowHalfWidth,
        Math.min(
          infoButtonLayout.x + infoButtonLayout.width / 2 - popoverLeft - arrowHalfWidth,
          popoverWidth - Space.md - arrowHalfWidth
        )
      )
    : Space.lg;
  const infoIconTop = infoButtonLayout
    ? infoButtonLayout.y + (infoButtonLayout.height - Space.md) / 2
    : 0;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setInfoButtonLayout(null);
      setIsInfoPopoverOpen(false);
    });

    return () => subscription.remove();
  }, []);

  const closeInfoPopover = () => {
    setIsInfoPopoverOpen(false);
  };

  const toggleInfoPopover = () => {
    if (isInfoPopoverOpen) {
      closeInfoPopover();
      return;
    }

    infoButtonRef.current?.measureInWindow((x, y, width, height) => {
      setInfoButtonLayout({ height, width, x, y });
      setIsInfoPopoverOpen(true);
    });
  };

  return (
    <View style={styles.completedSummary}>
      <View style={styles.summaryTop}>
        <View style={styles.summaryMeta}>
          <View style={styles.tankNameRow}>
            <Text selectable style={styles.captureTitle}>
              {tankId}
            </Text>
            <Text selectable style={styles.tankGroup}>
              {groupId}
            </Text>
          </View>

          <MetaRow label={AppCopy.result.capturedAt} value={formatDateTime(capturedAt)} />

          <View style={styles.metaRow}>
            <Text selectable style={styles.metaLabel}>
              {AppCopy.result.tankGrade}
            </Text>
            <View style={styles.metaDivider} />
            <View style={styles.gradeValue}>
              <Image
                accessibilityIgnoresInvertColors
                accessible={false}
                source={resultStatusIcons[status]}
                style={[styles.gradeIcon, { tintColor: gradeColor }]}
                contentFit="contain"
              />
              <Text selectable style={styles.metaValue}>
                {statusLabel[status]}
              </Text>
              {response.suspiciousCount > 0 ? (
                <Pressable
                  ref={infoButtonRef}
                  accessibilityLabel={infoButtonAccessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isInfoPopoverOpen }}
                  hitSlop={INFO_BUTTON_HIT_SLOP}
                  onPress={toggleInfoPopover}
                  style={({ pressed }) => [styles.infoButton, pressed && styles.pressed]}
                >
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={styles.infoIcon}
                  >
                    <Text selectable={false} style={styles.infoIconText}>
                      i
                    </Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onOpenGuidance}
          style={({ pressed }) => [styles.guidanceButton, pressed && styles.pressed]}
        >
          <Text selectable={false} style={styles.guidanceButtonText}>
            {AppCopy.result.responsePlan}
          </Text>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.guidanceChevron}
          />
        </Pressable>
      </View>

      <View style={styles.responseStats}>
        <ResponseMetric
          label={AppCopy.result.healthyObjects}
          tone="normal"
          value={`${response.normalCount}/${totalCount}`}
        />
        <ResponseMetric
          label={AppCopy.result.suspiciousObjects}
          tone="suspicious"
          value={`${response.suspiciousCount}/${totalCount}`}
        />
        <ResponseMetric
          label={AppCopy.result.diseaseDiagnosis}
          tone="diagnosis"
          value={response.diseaseLabels.join(', ') || AppCopy.result.none}
        />
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeInfoPopover}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={isInfoPopoverOpen && infoButtonLayout !== null}
      >
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={closeInfoPopover}
          style={styles.popoverLayer}
        >
          <Pressable
            accessible={false}
            onPress={closeInfoPopover}
            style={StyleSheet.absoluteFill}
          />
          {infoButtonLayout ? (
            <>
              <Pressable
                accessibilityLabel={infoButtonAccessibilityLabel}
                accessibilityRole="button"
                accessibilityState={{ expanded: true }}
                onPress={closeInfoPopover}
                style={[
                  styles.popoverInfoButton,
                  {
                    height: infoButtonLayout.height,
                    left: infoButtonLayout.x,
                    top: infoButtonLayout.y,
                    width: infoButtonLayout.width,
                  },
                ]}
              />
              <View
                accessible
                accessibilityLabel={infectionRiskText}
                accessibilityLiveRegion="polite"
                accessibilityRole="text"
                style={[
                  styles.infectionTooltip,
                  {
                    bottom: Math.max(Space.md, windowHeight - infoIconTop + Space.xxs),
                    left: popoverLeft,
                    width: popoverWidth,
                  },
                ]}
              >
                <View style={[styles.tooltipBubble, { width: popoverWidth }]}>
                  <Text selectable style={styles.tooltipText}>
                    {infectionRiskText}
                  </Text>
                </View>
                <View style={[styles.tooltipArrow, { marginLeft: arrowLeft }]} />
              </View>
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function ResponseMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'normal' | 'suspicious' | 'diagnosis';
  value: string;
}) {
  const valueColor =
    tone === 'normal' ? Palette.normal : tone === 'suspicious' ? Palette.caution : Palette.inkOverlay;

  return (
    <View style={styles.responseMetric}>
      <Text selectable style={styles.responseMetricLabel}>
        {label}
      </Text>
      <Text
        selectable
        style={[
          styles.responseMetricValue,
          tone === 'diagnosis' && styles.responseMetricDiagnosis,
          { color: valueColor },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text selectable style={styles.metaLabel}>
        {label}
      </Text>
      <View style={styles.metaDivider} />
      <Text selectable style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

function ObjectFilters({ filter, onSelect }: { filter: ObjectFilter; onSelect: (filter: ObjectFilter) => void }) {
  return (
    <View style={styles.filterRow}>
      {filters.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityState={{ selected: filter === item.key }}
          onPress={() => onSelect(item.key)}
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
  );
}

function PagerButton({
  accessibilityLabel,
  direction,
  disabled,
  onPress,
}: {
  accessibilityLabel: string;
  direction: 'previous' | 'next';
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={Space.sm}
      onPress={onPress}
      style={({ pressed }) => [styles.pagerButton, disabled && styles.pagerButtonDisabled, pressed && styles.pressed]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={direction === 'previous' ? styles.pagerPreviousIcon : styles.pagerNextIcon}
      />
    </Pressable>
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

function buildTankResponse(analyses: ObjectAnalysis[]): TankResponse {
  const totalCount = analyses.length;
  const suspiciousAnalyses = analyses.filter((analysis) => analysis.status === 'suspicious');
  const suspiciousCount = suspiciousAnalyses.length;
  const normalCount = Math.max(totalCount - suspiciousCount, 0);
  const diseaseLabels = unique(suspiciousAnalyses.flatMap((analysis) => analysis.result.diseases));

  return {
    totalCount,
    suspiciousCount,
    normalCount,
    diseaseLabels,
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

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    gap: Space.md,
    maxWidth: 560,
    width: '100%',
  },
  completedSummary: {
    gap: Space.md,
  },
  summaryTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryMeta: {
    flex: 1,
    gap: Space.xxs,
    minWidth: 0,
  },
  tankNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.sm,
  },
  tankGroup: {
    color: Palette.onGradient,
    ...Type.body2,
    fontWeight: Type.body2.fontWeight,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.sm,
  },
  metaLabel: {
    color: Palette.onGradientMuted,
    ...Type.body2,
  },
  metaDivider: {
    backgroundColor: Palette.onGradientMuted,
    height: Space.md - Space.xs,
    width: 1,
  },
  metaValue: {
    color: Palette.onGradient,
    ...Type.fieldLabel,
  },
  gradeValue: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.sm,
  },
  gradeIcon: {
    height: Space.md,
    width: Space.md,
  },
  infoButton: {
    alignItems: 'center',
    height: INFO_BUTTON_SIZE,
    justifyContent: 'center',
    width: INFO_BUTTON_SIZE,
  },
  infoIcon: {
    alignItems: 'center',
    borderColor: Palette.onGradient,
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: Space.md,
    justifyContent: 'center',
    width: Space.md,
  },
  infoIconText: {
    color: Palette.onGradient,
    ...Type.label3,
  },
  guidanceButton: {
    alignItems: 'center',
    backgroundColor: Palette.glassStrong,
    borderRadius: Radius.roundButton,
    flexDirection: 'row',
    gap: Space.xxs,
    height: Space.xxl + Space.sm,
    justifyContent: 'center',
    marginLeft: Space.sm,
    width: 108,
  },
  guidanceButtonText: {
    color: Palette.detailAccent,
    ...Type.body1,
  },
  guidanceChevron: {
    borderBottomColor: Palette.detailAccent,
    borderBottomWidth: 1.5,
    borderRightColor: Palette.detailAccent,
    borderRightWidth: 1.5,
    height: Space.sm,
    transform: [{ rotate: '-45deg' }],
    width: Space.sm,
  },
  responseStats: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: Space.sm,
  },
  responseMetric: {
    alignItems: 'center',
    backgroundColor: Palette.glass,
    borderColor: Palette.glassLine,
    borderRadius: Radius.card,
    borderWidth: 1,
    flex: 1,
    gap: Space.sm - Space.xxs,
    justifyContent: 'center',
    minHeight: 88,
    minWidth: 0,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.sm + Space.xxs,
    ...Shadow.card,
  },
  responseMetricLabel: {
    color: Palette.textMuted,
    textAlign: 'center',
    ...Type.body2,
  },
  responseMetricValue: {
    textAlign: 'center',
    ...Type.heading2,
  },
  responseMetricDiagnosis: {
    ...Type.label1,
  },
  infectionTooltip: {
    position: 'absolute',
    zIndex: 2,
  },
  popoverLayer: {
    flex: 1,
  },
  popoverInfoButton: {
    position: 'absolute',
    zIndex: 1,
  },
  tooltipArrow: {
    alignSelf: 'flex-start',
    borderLeftColor: 'transparent',
    borderLeftWidth: Space.sm - Space.xxs,
    borderRightColor: 'transparent',
    borderRightWidth: Space.sm - Space.xxs,
    borderTopColor: Palette.textSubtle,
    borderTopWidth: Space.sm - Space.xxs,
    height: 0,
    width: 0,
  },
  tooltipBubble: {
    alignItems: 'center',
    backgroundColor: Palette.textSubtle,
    borderRadius: Radius.button,
    paddingVertical: Space.sm,
  },
  tooltipText: {
    color: Palette.onGradient,
    ...Type.label2,
  },
  completedAnalysis: {
    gap: Space.md,
    marginTop: Space.lg,
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
  objectSectionHeader: {
    marginTop: Space.sm,
  },
  objectSectionTitle: {
    color: Palette.text,
    ...Type.heading2,
  },
  analysisHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pager: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.xs,
  },
  pagerButton: {
    alignItems: 'center',
    height: Space.lg,
    justifyContent: 'center',
    width: Space.lg,
  },
  pagerButtonDisabled: {
    opacity: 0.45,
  },
  pagerPreviousIcon: {
    borderBottomColor: 'transparent',
    borderBottomWidth: Space.xs,
    borderRightColor: Palette.textMuted,
    borderRightWidth: Space.sm - Space.xxs,
    borderTopColor: 'transparent',
    borderTopWidth: Space.xs,
    height: 0,
    width: 0,
  },
  pagerNextIcon: {
    borderBottomColor: 'transparent',
    borderBottomWidth: Space.xs,
    borderLeftColor: Palette.textMuted,
    borderLeftWidth: Space.sm - Space.xxs,
    borderTopColor: 'transparent',
    borderTopWidth: Space.xs,
    height: 0,
    width: 0,
  },
  pagerText: {
    color: Palette.textMuted,
    minWidth: Space.xxl,
    textAlign: 'center',
    ...Type.fieldLabel,
  },
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.sm,
  },
  filterChip: {
    backgroundColor: Palette.glassMuted,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md - Space.xs,
    paddingVertical: Space.sm,
  },
  filterChipActive: {
    backgroundColor: Palette.detailAccentSoft,
  },
  filterText: {
    color: Palette.textSubtle,
    ...Type.fieldLabel,
  },
  filterTextActive: {
    color: Palette.detailAccent,
  },
  carouselShell: {
    marginTop: -Space.xs,
    minHeight: 217,
    overflow: 'hidden',
    width: '100%',
  },
  carouselItem: {
    gap: Space.sm,
    paddingBottom: Space.xs,
    position: 'relative',
    width: '100%',
  },
  photoStatus: {
    position: 'absolute',
    right: Space.md,
    top: Space.md,
  },
  emptyStage: {
    alignItems: 'center',
    aspectRatio: 353 / 217,
    backgroundColor: Palette.glass,
    borderColor: Palette.glassLine,
    borderRadius: Radius.analysisImage,
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
    backgroundColor: Palette.paginationInactive,
    borderRadius: Radius.pill,
    height: 5,
    width: 5,
  },
  dotActive: {
    backgroundColor: Palette.detailAccent,
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
  detailCard: {
    gap: Space.md,
    padding: Space.lg,
  },
  detailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Space.md - Space.xxs,
  },
  detailLabel: {
    color: Palette.textMuted,
    width: Space.lg * 4,
    ...Type.body2,
  },
  detailValue: {
    color: Palette.textMuted,
    flex: 1,
    ...Type.body1,
  },
  notice: {
    marginTop: Space.md - Space.xs,
    paddingHorizontal: Space.sm,
  },
  noticeText: {
    color: Palette.textMuted,
    textAlign: 'center',
    ...Type.caption,
  },
  grow: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
