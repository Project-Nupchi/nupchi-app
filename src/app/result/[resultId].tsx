import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AccessibilityInfo,
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
const CAROUSEL_PAGE_GAP = Space.md;

// 분석 결과 — 촬영 후 서버 판정을 대기/완료/실패로 표시
export default function ResultScreen() {
  const { resultId } = useLocalSearchParams<{ resultId: string }>();
  const { results, tanks, apiMode, analyzeInspection, applyInspectionVerdict, retryInspection } = useAquaculture();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const carouselRef = useRef<FlatList<ObjectAnalysis>>(null);
  const initializedFilterResultId = useRef<string | null>(null);
  const [carouselWidth, setCarouselWidth] = useState(() => Math.min(560, windowWidth - Space.lg * 2));
  const carouselPageInterval = carouselWidth + CAROUSEL_PAGE_GAP;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [filter, setFilter] = useState<ObjectFilter>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const result = results.find((item) => item.id === resultId);
  const tank = result ? tanks.find((item) => item.id === result.tankId) : undefined;
  const contentTop = Platform.OS === 'ios' ? Space.sm : insets.top + APP_BAR_HEIGHT + Space.sm;

  useEffect(() => {
    if (result?.status !== 'pending') return;
    void analyzeInspection(result.id);
  }, [analyzeInspection, result?.id, result?.status]);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const applyPrototypeFallback = () => {
    if (!result) return;
    applyInspectionVerdict(buildPrototypeInspectionVerdict(result));
  };

  const objectAnalyses = useMemo(() => buildObjectAnalyses(result), [result]);

  useEffect(() => {
    if (result?.status !== 'completed' || initializedFilterResultId.current === result.id) return;

    initializedFilterResultId.current = result.id;
    setActiveIndex(0);
    setFilter(objectAnalyses.some((analysis) => analysis.status === 'suspicious') ? 'suspicious' : 'all');
  }, [objectAnalyses, result?.id, result?.status]);

  const filteredAnalyses = useMemo(
    () => objectAnalyses.filter((item) => filter === 'all' || item.status === filter),
    [filter, objectAnalyses]
  );
  const tankResponse = useMemo(
    () => buildTankResponse(result, objectAnalyses),
    [objectAnalyses, result]
  );
  const visibleIndex = Math.min(activeIndex, Math.max(filteredAnalyses.length - 1, 0));

  useEffect(() => {
    if (activeIndex === visibleIndex) return;

    const frame = requestAnimationFrame(() => {
      setActiveIndex(visibleIndex);
      carouselRef.current?.scrollToOffset({ animated: false, offset: visibleIndex * carouselPageInterval });
    });

    return () => cancelAnimationFrame(frame);
  }, [activeIndex, carouselPageInterval, visibleIndex]);

  const selectFilter = (nextFilter: ObjectFilter) => {
    setActiveIndex(0);
    setFilter(nextFilter);
  };

  const showAnalysis = (index: number) => {
    if (filteredAnalyses.length === 0) return;
    const nextIndex = Math.max(0, Math.min(index, filteredAnalyses.length - 1));
    if (nextIndex === visibleIndex) return;

    carouselRef.current?.scrollToOffset({
      animated: !reduceMotion,
      offset: nextIndex * carouselPageInterval,
    });
    if (reduceMotion) setActiveIndex(nextIndex);
  };

  const syncCarouselIndex = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (carouselPageInterval <= 0 || filteredAnalyses.length === 0) return;
    const nextIndex = Math.max(
      0,
      Math.min(
        Math.round(event.nativeEvent.contentOffset.x / carouselPageInterval),
        filteredAnalyses.length - 1
      )
    );
    setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
  };

  const updateCarouselWidth = (width: number) => {
    const nextWidth = Math.round(width);
    if (nextWidth <= 0 || nextWidth === carouselWidth) return;

    setCarouselWidth(nextWidth);
    requestAnimationFrame(() => {
      carouselRef.current?.scrollToOffset({
        animated: false,
        offset: visibleIndex * (nextWidth + CAROUSEL_PAGE_GAP),
      });
    });
  };

  const activeAnalysis = filteredAnalyses[visibleIndex] ?? filteredAnalyses[0];

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
            canOpenGuidance={Boolean(isActionableGrade(result.rawGrade) && result.aiResultId)}
            capturedAt={result.capturedAt}
            groupId={tank?.groupName ?? AppCopy.common.tankGroupFallback}
            onOpenGuidance={() => setIsGuidanceOpen(true)}
            response={tankResponse}
            status={result.grade}
            tankId={tank?.code ?? result.tankId}
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
                  disabled={visibleIndex <= 0 || filteredAnalyses.length === 0}
                  direction="previous"
                  onPress={() => showAnalysis(visibleIndex - 1)}
                />
                <Text selectable style={styles.pagerText}>
                  {filteredAnalyses.length === 0 ? 0 : visibleIndex + 1}/{filteredAnalyses.length}
                </Text>
                <PagerButton
                  accessibilityLabel="다음 개체"
                  disabled={visibleIndex >= filteredAnalyses.length - 1 || filteredAnalyses.length === 0}
                  direction="next"
                  onPress={() => showAnalysis(visibleIndex + 1)}
                />
              </View>
            </View>

            <View
              onLayout={(event) => updateCarouselWidth(event.nativeEvent.layout.width)}
              style={styles.carouselShell}
            >
              {filteredAnalyses.length > 0 ? (
                <FlatList
                  key={filter}
                  ref={carouselRef}
                  accessibilityLabel="개체별 분석 결과"
                  bounces={false}
                  data={filteredAnalyses}
                  decelerationRate="fast"
                  directionalLockEnabled
                  disableIntervalMomentum
                  getItemLayout={(_, index) => ({
                    index,
                    length: carouselPageInterval,
                    offset: carouselPageInterval * index,
                  })}
                  horizontal
                  initialNumToRender={2}
                  ItemSeparatorComponent={CarouselGap}
                  keyExtractor={(analysis) => analysis.id}
                  onMomentumScrollEnd={syncCarouselIndex}
                  onScroll={syncCarouselIndex}
                  overScrollMode="never"
                  removeClippedSubviews={false}
                  renderItem={({ item: analysis, index }) => (
                    <View
                      accessibilityLabel={`${index + 1}/${filteredAnalyses.length} 개체 분석`}
                      style={[styles.carouselItem, styles.carouselItemWithShadow, { width: carouselWidth }]}
                    >
                      <PhotoAnalysisStage result={analysis.result} />
                      <GlassCard style={styles.detailCard}>
                        <DetailRow label={AppCopy.result.symptom} value={getSymptomSummary(analysis.result)} />
                        <DetailRow
                          label={AppCopy.result.suspectedDisease}
                          value={analysis.result.diseases.join(', ') || AppCopy.result.noDisease}
                        />
                        {getObservedParts(analysis.result) ? (
                          <DetailRow
                            label={AppCopy.result.observedPart}
                            value={getObservedParts(analysis.result)}
                          />
                        ) : null}
                      </GlassCard>
                    </View>
                  )}
                  scrollEnabled={filteredAnalyses.length > 1}
                  scrollEventThrottle={16}
                  showsHorizontalScrollIndicator={false}
                  snapToAlignment="start"
                  snapToInterval={carouselPageInterval}
                  style={styles.carouselList}
                  windowSize={3}
                />
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
                  <View key={analysis.id} style={[styles.dot, index === visibleIndex && styles.dotActive]} />
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
              {tank?.code ?? result.tankId}
            </Text>
            <Text selectable style={styles.captureTime}>
              {tank?.groupName ?? AppCopy.common.tankGroupFallback} · {formatDateTime(result.capturedAt)}
            </Text>
          </View>

          <View style={styles.objectSectionHeader}>
            <Text selectable style={styles.objectSectionTitle}>
              {AppCopy.result.objectDetails}
            </Text>
          </View>

          <ObjectFilters filter={filter} onSelect={selectFilter} />

          <View style={styles.carouselShell}>
            {activeAnalysis ? (
              <View key={activeAnalysis.id} style={styles.carouselItem}>
                <PhotoAnalysisStage result={activeAnalysis.result} />
                {result.status !== 'failed' ? (
                  <View style={styles.photoStatus}>
                    <StatusBadge status={activeAnalysis.status} compact binary />
                  </View>
                ) : null}
              </View>
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
                <View key={analysis.id} style={[styles.dot, index === visibleIndex && styles.dotActive]} />
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
        aiResultId={isActionableGrade(result.rawGrade) ? result.aiResultId : undefined}
        groupId={tank?.groupName ?? AppCopy.common.tankGroupFallback}
        onClose={() => setIsGuidanceOpen(false)}
        visible={isGuidanceOpen}
      />
    </>
  );
}

function isActionableGrade(grade: InspectionResult['rawGrade']) {
  return grade === 'suspect' || grade === 'warning';
}

function CarouselGap() {
  return <View accessibilityElementsHidden importantForAccessibility="no" style={styles.carouselGap} />;
}

function CompletedSummary({
  canOpenGuidance,
  capturedAt,
  groupId,
  onOpenGuidance,
  response,
  status,
  tankId,
}: {
  canOpenGuidance: boolean;
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
  const totalCount = response.totalCount;
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
                tintColor={gradeColor}
                style={styles.gradeIcon}
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

        {canOpenGuidance ? (
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
        ) : null}
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
    bodyParts: object.symptomEvidence?.map(formatSymptomEvidence) ?? object.bodyParts,
    diseases: unique(object.diseaseEvidence?.map((evidence) => evidence.label) ?? object.diseases),
    evidenceSummary: object.evidenceSummary,
    lesions: object.lesions,
  };
}

function buildTankResponse(result: InspectionResult | undefined, analyses: ObjectAnalysis[]): TankResponse {
  const totalCount = result?.fishCount ?? analyses.length;
  const suspiciousAnalyses = analyses.filter((analysis) => analysis.status === 'suspicious');
  const suspiciousCount = result?.suspectCount ?? suspiciousAnalyses.length;
  const normalCount = Math.max(totalCount - suspiciousCount, 0);
  // Prefer the server's tank-level summary (deduped, prevalence-ordered) over per-object aggregation.
  const diseaseLabels =
    result?.diseases ?? unique(suspiciousAnalyses.flatMap((analysis) => analysis.result.diseases));

  return {
    totalCount,
    suspiciousCount,
    normalCount,
    diseaseLabels,
  };
}

function formatSymptomEvidence(evidence: NonNullable<InspectionObject['symptomEvidence']>[number]) {
  return evidence.confidence === undefined
    ? evidence.label
    : `${evidence.label} ${formatConfidence(evidence.confidence)}`;
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
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

// 관찰 부위는 증상과 구분되는 실제 부위(예: 체표, 지느러미)일 때만 노출한다. 라이브 추론은
// 부위 데이터를 별도로 주지 않아 bodyParts가 증상 라벨과 겹치는데, 이 경우(또는 데이터가 없을
// 때)는 빈 문자열을 돌려 행을 숨긴다. 샘플·이력의 실제 부위는 그대로 표시된다.
function getObservedParts(result: InspectionResult) {
  const symptomLabels = new Set(result.lesions.map((lesion) => lesion.label));
  return result.bodyParts.filter((part) => !symptomLabels.has(stripConfidence(part))).join(', ');
}

function stripConfidence(label: string) {
  return label.replace(/\s+\d+%$/, '');
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
  carouselList: {
    flexGrow: 0,
  },
  carouselGap: {
    width: CAROUSEL_PAGE_GAP,
  },
  carouselItem: {
    gap: Space.sm,
    paddingBottom: Space.xs,
    position: 'relative',
    width: '100%',
  },
  carouselItemWithShadow: {
    paddingBottom: Space.md,
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
