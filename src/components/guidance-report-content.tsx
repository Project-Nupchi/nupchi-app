import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextStyle, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Palette, Radius, Space, Type } from '@/constants/aqua-theme';
import {
  InferenceApiError,
  inferenceClient,
  type GuideAction,
  type GuideEvidence,
  type GuideResponse,
} from '@/services/inference';

type GuideState =
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; response: GuideResponse };

type ResolvedGuideState =
  | { requestKey: string; status: 'error'; error: unknown }
  | { requestKey: string; status: 'success'; response: GuideResponse };

type GuidanceReportContentProps = {
  aiResultId?: string;
  compact?: boolean;
  enabled?: boolean;
  unavailableMessage?: string;
};

const guideCache = new Map<string, GuideResponse>();
const pendingGuides = new Map<string, Promise<GuideResponse>>();
const webKoreanWordBreak =
  Platform.OS === 'web'
    ? ({ overflowWrap: 'normal', wordBreak: 'keep-all' } as unknown as TextStyle)
    : null;

export function GuidanceReportContent({
  aiResultId,
  compact = false,
  enabled = true,
  unavailableMessage = '저장된 AI 진단 결과가 있어야 대응 보고서를 만들 수 있어요.',
}: GuidanceReportContentProps) {
  const normalizedId = aiResultId?.trim() ?? '';
  const [attempt, setAttempt] = useState(0);
  const [resolvedState, setResolvedState] = useState<ResolvedGuideState | null>(null);
  const requestKey = `${normalizedId}:${attempt}`;

  useEffect(() => {
    if (!enabled || !normalizedId) return;

    let active = true;
    void loadGuide(normalizedId)
      .then((response) => {
        if (active) setResolvedState({ requestKey, status: 'success', response });
      })
      .catch((error: unknown) => {
        if (active) setResolvedState({ requestKey, status: 'error', error });
      });

    return () => {
      active = false;
    };
  }, [enabled, normalizedId, requestKey]);

  const retry = useCallback(() => {
    if (!normalizedId) return;
    guideCache.delete(normalizedId);
    pendingGuides.delete(normalizedId);
    setAttempt((current) => current + 1);
  }, [normalizedId]);

  if (!enabled) return null;

  const state: GuideState = !normalizedId
    ? { status: 'unavailable' }
    : resolvedState?.requestKey === requestKey
      ? resolvedState
      : { status: 'loading' };

  if (state.status === 'unavailable') {
    return (
      <GuideMessage
        body={unavailableMessage}
        compact={compact}
        symbol="i"
        title="대응 보고서를 불러올 수 없어요"
      />
    );
  }

  if (state.status === 'loading') {
    return (
      <View accessibilityLiveRegion="polite" style={[styles.message, compact && styles.messageCompact]}>
        <ActivityIndicator color={Palette.primary} />
        <Text accessibilityRole="header" selectable style={styles.messageTitle}>
          대응 보고서를 만드는 중이에요
        </Text>
        <Text selectable style={styles.messageBody}>
          저장된 진단 결과와 근거를 확인하고 있어요. 잠시만 기다려 주세요.
        </Text>
      </View>
    );
  }

  if (state.status === 'error') {
    const errorCopy = guideErrorCopy(state.error);
    return (
      <View accessibilityLiveRegion="assertive" style={[styles.message, compact && styles.messageCompact]}>
        <View style={[styles.messageSymbol, styles.errorSymbol]}>
          <Text selectable={false} style={styles.errorSymbolText}>
            !
          </Text>
        </View>
        <Text accessibilityRole="header" selectable style={styles.messageTitle}>
          {errorCopy.title}
        </Text>
        <Text selectable style={styles.messageBody}>
          {errorCopy.body}
        </Text>
        <ActionButton label="다시 시도" onPress={retry} size="compact" variant="secondary" />
      </View>
    );
  }

  return <GuideReport response={state.response} compact={compact} />;
}

function GuideReport({ response, compact }: { response: GuideResponse; compact: boolean }) {
  const actions = useMemo(
    () => [...response.report.actions].sort((left, right) => left.priority - right.priority),
    [response.report.actions]
  );

  if (compact) {
    return (
      <CompactGuideReport
        actions={actions}
        disclaimer={response.disclaimer}
        evidence={response.report.evidence}
        riskLevel={response.report.riskLevel}
        situation={response.report.situation}
      />
    );
  }

  const risk = riskPresentation(response.report.riskLevel);

  return (
    <View style={styles.report}>
      <View style={styles.situation}>
        <View style={[styles.riskBadge, { backgroundColor: risk.backgroundColor }]}>
          <Text selectable style={[styles.riskText, { color: risk.color }]}>
            위험도 {risk.label}
          </Text>
        </View>
        <Text selectable style={styles.situationText}>
          {response.report.situation}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text accessibilityRole="header" selectable style={styles.sectionTitle}>
          권장 대응
        </Text>
        {actions.length > 0 ? (
          <View style={styles.actionList}>
            {actions.map((action, index) => (
              <View key={`${action.priority}-${action.title}-${index}`} style={styles.action}>
                <View style={styles.actionNumber}>
                  <Text selectable={false} style={styles.actionNumberText}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.actionCopy}>
                  <Text selectable style={styles.actionTitle}>
                    {action.title}
                  </Text>
                  <Text selectable style={styles.actionDetail}>
                    {action.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text selectable style={styles.emptyText}>
            제안된 추가 조치가 없어요.
          </Text>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text accessibilityRole="header" selectable style={styles.sectionTitle}>
          판단 근거
        </Text>
        {response.report.evidence.length > 0 ? (
          <View style={styles.evidenceList}>
            {response.report.evidence.map((evidence, index) => (
              <View key={`${evidence.source}-${index}`} style={styles.evidence}>
                <Text selectable style={styles.evidenceSource}>
                  {evidence.source}
                </Text>
                <Text selectable style={styles.evidenceQuote}>
                  {evidence.quote}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text selectable style={styles.emptyText}>
            제공된 인용 근거가 없어요.
          </Text>
        )}
      </View>

      <View style={styles.disclaimer}>
        <Text selectable style={styles.disclaimerText}>
          {response.disclaimer}
        </Text>
      </View>
    </View>
  );
}

function CompactGuideReport({
  actions,
  disclaimer,
  evidence,
  riskLevel,
  situation,
}: {
  actions: GuideAction[];
  disclaimer: string;
  evidence: GuideEvidence[];
  riskLevel: string;
  situation: string;
}) {
  const risk = riskPresentation(riskLevel);

  return (
    <View style={styles.compactReport}>
      <View style={styles.compactMain}>
        <View style={styles.situation}>
          <View style={[styles.riskBadge, { backgroundColor: risk.backgroundColor }]}>
            <Text selectable style={[styles.riskText, { color: risk.color }]}>
              위험도 {risk.label}
            </Text>
          </View>
          <Text selectable style={styles.situationText}>
            {situation}
          </Text>
        </View>

        {actions.length > 0 ? (
          <View style={styles.actionList}>
            {actions.map((action, index) => {
              const footnote = index > 0 && evidence[index - 1] ? `${index})` : undefined;

              return (
                <View key={`${action.priority}-${action.title}-${index}`} style={styles.action}>
                  <View style={[styles.actionNumber, styles.compactActionNumber]}>
                    <Text selectable={false} style={[styles.actionNumberText, styles.compactActionNumberText]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.actionCopy}>
                    <View style={styles.compactActionTitleRow}>
                      <Text selectable style={styles.actionTitle}>
                        {action.title}
                      </Text>
                    </View>
                    {footnote ? (
                      <View style={styles.footnotedLine}>
                        <Text selectable={false} style={styles.footnoteMarker}>
                          {footnote}
                        </Text>
                        <Text selectable style={[styles.actionDetail, styles.footnotedText]}>
                          {action.detail}
                        </Text>
                      </View>
                    ) : (
                      <Text selectable style={styles.actionDetail}>
                        {action.detail}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text selectable style={styles.emptyText}>
            제안된 추가 조치가 없어요.
          </Text>
        )}

        {evidence.length > 0 ? (
          <View style={styles.compactEvidenceList}>
            {evidence.map((item, index) => (
              <View key={`${item.source}-${index}`} style={styles.footnotedLine}>
                <Text selectable={false} style={styles.footnoteMarker}>
                  {index + 1})
                </Text>
                <Text selectable style={[styles.compactEvidenceText, styles.footnotedText]}>
                  {item.source}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <Text
        lineBreakStrategyIOS="hangul-word"
        selectable
        style={[styles.compactDisclaimer, webKoreanWordBreak]}
      >
        {normalizeInline(disclaimer)}
      </Text>
    </View>
  );
}

function GuideMessage({
  body,
  compact,
  symbol,
  title,
}: {
  body: string;
  compact: boolean;
  symbol: string;
  title: string;
}) {
  return (
    <View accessibilityLiveRegion="polite" style={[styles.message, compact && styles.messageCompact]}>
      <View style={styles.messageSymbol}>
        <Text selectable={false} style={styles.messageSymbolText}>
          {symbol}
        </Text>
      </View>
      <Text accessibilityRole="header" selectable style={styles.messageTitle}>
        {title}
      </Text>
      <Text selectable style={styles.messageBody}>
        {body}
      </Text>
    </View>
  );
}

async function loadGuide(aiResultId: string): Promise<GuideResponse> {
  const cached = guideCache.get(aiResultId);
  if (cached) return cached;

  const pending = pendingGuides.get(aiResultId);
  if (pending) return pending;

  const request = inferenceClient.guide(aiResultId);
  pendingGuides.set(aiResultId, request);
  try {
    const response = await request;
    guideCache.set(aiResultId, response);
    return response;
  } finally {
    pendingGuides.delete(aiResultId);
  }
}

function guideErrorCopy(error: unknown): { title: string; body: string } {
  if (error instanceof InferenceApiError) {
    if (error.status === 404) {
      return {
        title: '저장된 진단 결과를 찾지 못했어요',
        body: '이력을 새로고침한 뒤 다시 시도해 주세요.',
      };
    }
    if (error.status !== undefined && error.status >= 500) {
      return {
        title: '대응 안내 서비스가 일시적으로 불안정해요',
        body: '잠시 후 다시 시도하거나 전문가에게 직접 확인해 주세요.',
      };
    }
    if (error.code === 'REQUEST_TIMEOUT') {
      return {
        title: '대응 보고서 생성이 지연되고 있어요',
        body: '요청 시간이 초과되었어요. 잠시 후 다시 시도해 주세요.',
      };
    }
    if (error.code === 'INFERENCE_URL_NOT_CONFIGURED') {
      return {
        title: '대응 안내 서비스가 연결되지 않았어요',
        body: '앱 환경 설정을 확인해 주세요.',
      };
    }
  }

  return {
    title: '대응 보고서를 불러오지 못했어요',
    body: error instanceof Error && error.message ? error.message : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
  };
}

function riskPresentation(level: string): {
  backgroundColor: string;
  color: string;
  label: string;
} {
  switch (level.trim().toLowerCase()) {
    case 'low':
      return { backgroundColor: Palette.normalBg, color: Palette.normal, label: '낮음' };
    case 'medium':
    case 'moderate':
      return { backgroundColor: Palette.cautionBg, color: Palette.caution, label: '중간' };
    case 'high':
      return { backgroundColor: Palette.suspiciousBg, color: Palette.suspicious, label: '높음' };
    case 'critical':
    case 'severe':
      return { backgroundColor: Palette.suspiciousBg, color: Palette.suspicious, label: '매우 높음' };
    default:
      return { backgroundColor: Palette.primarySoft, color: Palette.primary, label: level };
  }
}

function normalizeInline(value: string) {
  return value.replace(/\s+/g, ' ').trim().replace(/·/g, '\u2060·\u2060');
}

const styles = StyleSheet.create({
  report: {
    gap: Space.lg,
  },
  compactReport: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  compactMain: {
    gap: Space.lg,
  },
  situation: {
    alignItems: 'flex-start',
    gap: Space.sm,
  },
  riskBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
  },
  riskText: {
    ...Type.label2,
  },
  situationText: {
    color: Palette.text,
    ...Type.body1Medium,
  },
  divider: {
    backgroundColor: Palette.glassHairline,
    height: 1,
  },
  section: {
    gap: Space.md,
  },
  sectionTitle: {
    color: Palette.text,
    ...Type.heading2,
  },
  actionList: {
    gap: Space.md,
  },
  action: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Space.md,
  },
  actionNumber: {
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.pill,
    height: Space.xl,
    justifyContent: 'center',
    width: Space.xl,
  },
  actionNumberText: {
    color: Palette.primary,
    ...Type.label2,
  },
  compactActionNumber: {
    backgroundColor: Palette.glassHairline,
  },
  compactActionNumberText: {
    color: Palette.inkOverlay,
  },
  actionCopy: {
    flex: 1,
    gap: Space.xs,
    minWidth: 0,
  },
  actionTitle: {
    color: Palette.text,
    ...Type.body1,
  },
  compactActionTitleRow: {
    justifyContent: 'center',
    minHeight: Space.xl,
  },
  actionDetail: {
    color: Palette.textMuted,
    ...Type.body2,
  },
  evidenceList: {
    gap: Space.sm,
  },
  evidence: {
    backgroundColor: Palette.surfaceMuted,
    borderRadius: Radius.image,
    gap: Space.xs,
    padding: Space.md,
  },
  evidenceSource: {
    color: Palette.primary,
    ...Type.label2,
  },
  evidenceQuote: {
    color: Palette.textMuted,
    ...Type.caption,
  },
  compactEvidenceList: {
    backgroundColor: Palette.surfaceMuted,
    borderRadius: Radius.image,
    gap: Space.xs,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + Space.xs,
  },
  compactEvidenceText: {
    color: Palette.textMuted,
    ...Type.caption,
  },
  footnotedLine: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  footnoteMarker: {
    color: Palette.textMuted,
    fontSize: 9,
    lineHeight: 12,
    transform: [{ translateY: -Space.xxs }],
  },
  footnotedText: {
    flex: 1,
    minWidth: 0,
  },
  emptyText: {
    color: Palette.textSubtle,
    ...Type.body2,
  },
  disclaimer: {
    backgroundColor: Palette.cautionBg,
    borderRadius: Radius.image,
    padding: Space.md,
  },
  disclaimerText: {
    color: Palette.textMuted,
    ...Type.caption,
  },
  compactDisclaimer: {
    alignSelf: 'center',
    color: Palette.textSubtle,
    maxWidth: '80%',
    textAlign: 'center',
    width: '100%',
    ...Type.caption,
  },
  message: {
    alignItems: 'center',
    gap: Space.md,
    justifyContent: 'center',
    minHeight: 260,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xl,
  },
  messageCompact: {
    minHeight: 300,
    paddingHorizontal: 0,
  },
  messageSymbol: {
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.pill,
    height: Space.xxl,
    justifyContent: 'center',
    width: Space.xxl,
  },
  messageSymbolText: {
    color: Palette.primary,
    ...Type.label2,
  },
  errorSymbol: {
    backgroundColor: Palette.suspiciousBg,
  },
  errorSymbolText: {
    color: Palette.suspicious,
    ...Type.label2,
  },
  messageTitle: {
    color: Palette.text,
    textAlign: 'center',
    ...Type.heading2,
  },
  messageBody: {
    color: Palette.textMuted,
    textAlign: 'center',
    ...Type.body2,
  },
});
