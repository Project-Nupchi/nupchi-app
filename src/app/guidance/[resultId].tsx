import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ActionButton } from '@/components/action-button';
import { ScreenShell } from '@/components/screen-shell';
import { Section } from '@/components/section';
import { StatusBadge } from '@/components/status-badge';
import { Palette, Radius, Space } from '@/constants/aqua-theme';
import { useAquaculture } from '@/state/aquaculture-store';

const citations = [
  {
    title: '국립수산과학원 수산생물질병정보',
    url: 'https://www.nifs.go.kr/portal/fg/fisgA/actionDiseaseSearch.do',
  },
  {
    title: '국립수산과학원 질병예방 및 진단',
    url: 'https://nifs.go.kr/portal/pcon0000271/systA/actionConts.do',
  },
  {
    title: '국가법령정보센터: 수산생물질병 관리법 시행규칙',
    url: 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=193193',
  },
];

export default function GuidanceScreen() {
  const { resultId } = useLocalSearchParams<{ resultId: string }>();
  const { results, tanks } = useAquaculture();
  const result = results.find((item) => item.id === resultId);
  const tank = result ? tanks.find((item) => item.id === result.tankId) : undefined;
  const hasEnoughGround = result?.status === 'completed' && result.grade === 'suspicious';
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hasEnoughGround) return;
    const timer = setTimeout(() => setIsLoading(false), 450);
    return () => clearTimeout(timer);
  }, [hasEnoughGround, resultId]);

  return (
    <ScreenShell>
      {!result ? (
        <View style={styles.panel}>
          <Text selectable style={styles.title}>
            안내를 만들 결과가 없습니다
          </Text>
          <ActionButton label="닫기" variant="secondary" onPress={() => router.back()} />
        </View>
      ) : null}

      {result && !hasEnoughGround ? (
        <View style={styles.panel}>
          <Text selectable style={styles.title}>
            근거 불충분
          </Text>
          <Text selectable style={styles.body}>
            의심 등급과 병변 근거가 충분하지 않아 대응·신고 안내를 생성하지 않습니다. 수산질병관리원 등 전문가에게 문의하세요.
          </Text>
          <ActionButton label="닫기" variant="secondary" onPress={() => router.back()} />
        </View>
      ) : null}

      {result && hasEnoughGround && isLoading ? (
        <View style={styles.panel}>
          <ActivityIndicator color={Palette.accent} />
          <Text selectable style={styles.title}>
            안내 생성 중
          </Text>
          <Text selectable style={styles.body}>
            등급과 병변 근거를 기준으로 대응·신고 안내를 구성하고 있습니다.
          </Text>
        </View>
      ) : null}

      {result && hasEnoughGround && !isLoading ? (
        <>
          <View style={styles.hero}>
            <View style={styles.heroText}>
              <Text selectable style={styles.kicker}>
                {result.tankId} 대응 요약
              </Text>
              <Text selectable style={styles.title}>
                {tank?.groupId ?? '수조군'} 차단 후 공식 절차 확인
              </Text>
            </View>
            <StatusBadge status={result.grade} />
          </View>

          <Section title="현장 대응">
            <Step index="1" title="동일 수조 재촬영" body="물 밖·근접·단일 개체 조건으로 1회 이상 재촬영해 병변 후보가 반복되는지 확인합니다." />
            <Step index="2" title="같은 수조군 차단" body={`${tank?.groupId ?? '공유 계통'}의 취수·배수·기구·작업 동선을 분리하고 인접 수조의 우선 촬영 순위를 올립니다.`} />
            <Step index="3" title="전문가 확인" body="AI 결과, 원본 사진, 수조 ID, 수조군, 광어 입식 정보를 묶어 수산질병관리원 등 전문가에게 확인을 요청합니다." />
          </Section>

          <Section title="신고 절차">
            <Text selectable style={styles.body}>
              바이러스성출혈성패혈증(VHS) 등 법정 전염병 또는 대량 폐사 의심 상황은 공식 기관 안내와 현행 법령을 확인해 신고 여부를 결정해야 합니다. 이 화면은 신고 판단을 대체하지 않습니다.
            </Text>
          </Section>

          <Section title="인용 출처">
            {citations.map((citation) => (
              <Pressable
                key={citation.url}
                accessibilityRole="link"
                onPress={() => Linking.openURL(citation.url)}
                style={({ pressed }) => [styles.citation, pressed && styles.pressed]}
              >
                <Text selectable style={styles.citationTitle}>
                  {citation.title}
                </Text>
                <Text selectable style={styles.citationUrl}>
                  {citation.url}
                </Text>
              </Pressable>
            ))}
          </Section>

          <View style={styles.notice}>
            <Text selectable style={styles.noticeTitle}>
              관리자 책임 고지
            </Text>
            <Text selectable style={styles.noticeBody}>
              AI 판정은 확진이 아닙니다. 방역 조치, 투약, 출하 제한, 신고는 광어 양식장 관리자 책임 아래 공식 지침과 전문가 판단을 기준으로 진행해야 합니다.
            </Text>
          </View>

          <ActionButton label="닫기" icon="xmark" variant="secondary" onPress={() => router.back()} />
        </>
      ) : null}
    </ScreenShell>
  );
}

function Step({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text selectable={false} style={styles.stepNumberText}>
          {index}
        </Text>
      </View>
      <View style={styles.stepText}>
        <Text selectable style={styles.stepTitle}>
          {title}
        </Text>
        <Text selectable style={styles.body}>
          {body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    backgroundColor: Palette.black,
    borderRadius: Radius.card,
    flexDirection: 'row',
    gap: Space.md,
    justifyContent: 'space-between',
    padding: Space.lg,
  },
  heroText: {
    flex: 1,
    gap: Space.xs,
  },
  kicker: {
    color: '#9FD8CF',
    fontSize: 13,
    fontWeight: '900',
  },
  title: {
    color: Palette.text,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  panel: {
    backgroundColor: Palette.surface,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Space.md,
    padding: Space.lg,
  },
  body: {
    color: Palette.textMuted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  step: {
    flexDirection: 'row',
    gap: Space.md,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: Palette.accentBg,
    borderRadius: Radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepNumberText: {
    color: Palette.accent,
    fontSize: 15,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    color: Palette.text,
    fontSize: 16,
    fontWeight: '900',
  },
  citation: {
    borderBottomColor: Palette.line,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: Space.md,
  },
  citationTitle: {
    color: Palette.accent,
    fontSize: 16,
    fontWeight: '900',
  },
  citationUrl: {
    color: Palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  notice: {
    backgroundColor: Palette.cautionBg,
    borderColor: '#E9C078',
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 6,
    padding: Space.md,
  },
  noticeTitle: {
    color: Palette.caution,
    fontSize: 15,
    fontWeight: '900',
  },
  noticeBody: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
