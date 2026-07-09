import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ActionButton } from '@/components/action-button';
import { GlassCard } from '@/components/glass-card';
import { ScreenShell } from '@/components/screen-shell';
import { Section } from '@/components/section';
import { StatusBadge } from '@/components/status-badge';
import { Palette, Radius, Space } from '@/constants/aqua-theme';
import { useAquaculture } from '@/state/aquaculture-store';

const citations = [
  { title: '국립수산과학원 수산생물질병정보', url: 'https://www.nifs.go.kr/portal/fg/fisgA/actionDiseaseSearch.do' },
  { title: '국립수산과학원 질병예방 및 진단', url: 'https://nifs.go.kr/portal/pcon0000271/systA/actionConts.do' },
  { title: '국가법령정보센터: 수산생물질병 관리법 시행규칙', url: 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=193193' },
];

// AI 대응 제안 — 근거 인용 대응·신고 절차
export default function GuidanceScreen() {
  const { resultId } = useLocalSearchParams<{ resultId: string }>();
  const { results, tanks } = useAquaculture();
  const result = results.find((item) => item.id === resultId);
  const tank = result ? tanks.find((item) => item.id === result.tankId) : undefined;
  const hasGround = result?.status === 'completed' && result.grade !== 'normal';
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasGround) return;
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [hasGround, resultId]);

  if (!result || !hasGround) {
    return (
      <ScreenShell contentStyle={styles.top}>
        <GlassCard style={styles.panel}>
          <Text selectable style={styles.panelTitle}>
            근거 불충분
          </Text>
          <Text selectable style={styles.body}>
            의심·주의 등급과 병변 근거가 충분하지 않아 대응 제안을 생성하지 않습니다. 임의 생성 대신 수산질병관리원 등 전문가에게 문의하세요.
          </Text>
          <ActionButton label="닫기" variant="secondary" onPress={() => router.back()} />
        </GlassCard>
      </ScreenShell>
    );
  }

  if (loading) {
    return (
      <ScreenShell contentStyle={styles.top}>
        <GlassCard style={styles.loading}>
          <ActivityIndicator color={Palette.primary} />
          <Text selectable style={styles.panelTitle}>
            대응 제안 생성 중
          </Text>
          <Text selectable style={styles.body}>
            등급과 병변 근거를 기준으로 현장 대응·신고 안내를 구성하고 있어요.
          </Text>
        </GlassCard>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell contentStyle={styles.top}>
      <GlassCard emphasis="strong" style={styles.hero}>
        <View style={styles.heroText}>
          <Text selectable style={styles.heroKicker}>
            {result.tankId} · {tank?.groupId ?? '수조군'}
          </Text>
          <Text selectable style={styles.heroTitle}>
            {tank?.groupId ?? '수조군'} 차단 후 공식 절차 확인
          </Text>
        </View>
        <StatusBadge status={result.grade} />
      </GlassCard>

      <Section title="현장 대응">
        <Step index="1" title="동일 수조 재촬영" body="물 밖·근접·단일 개체 조건으로 1회 이상 재촬영해 병변 후보가 반복되는지 확인합니다." />
        <Step index="2" title="같은 수조군 차단" body={`${tank?.groupId ?? '공유 계통'}의 취수·배수·기구·작업 동선을 분리하고 인접 수조의 촬영 순위를 올립니다.`} />
        <Step index="3" title="전문가 확인" body="AI 결과, 원본 사진, 수조 정보를 묶어 수산질병관리원 등 전문가에게 확인을 요청합니다." />
      </Section>

      <Section title="신고 절차">
        <Text selectable style={styles.body}>
          바이러스성출혈성패혈증(VHS) 등 법정 전염병 또는 대량 폐사 의심 상황은 공식 기관 안내와 현행 법령을 확인해 신고 여부를 결정해야 합니다. 이 화면은 신고 판단을 대체하지 않습니다.
        </Text>
      </Section>

      <Section title="인용 출처">
        {citations.map((c) => (
          <Pressable
            key={c.url}
            accessibilityRole="link"
            onPress={() => Linking.openURL(c.url)}
            style={({ pressed }) => [styles.citation, pressed && styles.pressed]}
          >
            <Text selectable style={styles.citationTitle}>
              {c.title}
            </Text>
            <Text selectable style={styles.citationUrl}>
              {c.url}
            </Text>
          </Pressable>
        ))}
      </Section>

      <View style={styles.notice}>
        <Text selectable style={styles.noticeText}>
          AI 판정은 확진이 아닙니다. 방역·투약·출하 제한·신고는 양식장 관리자 책임 아래 공식 지침과 전문가 판단을 기준으로 진행하세요.
        </Text>
      </View>

      <ActionButton label="닫기" variant="secondary" onPress={() => router.back()} />
    </ScreenShell>
  );
}

function Step({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text selectable={false} style={styles.stepNumText}>
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
  top: {
    paddingTop: 68,
  },
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Space.md,
    justifyContent: 'space-between',
    padding: Space.lg,
  },
  heroText: {
    flex: 1,
    gap: 3,
  },
  heroKicker: {
    color: Palette.textSubtle,
    fontSize: 13,
    fontWeight: '700',
  },
  heroTitle: {
    color: Palette.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  panel: {
    gap: Space.md,
    padding: Space.lg,
  },
  loading: {
    alignItems: 'center',
    gap: Space.md,
    padding: Space.xl,
  },
  panelTitle: {
    color: Palette.text,
    fontSize: 21,
    fontWeight: '800',
  },
  body: {
    color: Palette.textMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  step: {
    flexDirection: 'row',
    gap: Space.md,
  },
  stepNum: {
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepNumText: {
    color: Palette.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    color: Palette.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  citation: {
    borderBottomColor: Palette.glassHairline,
    borderBottomWidth: 1,
    gap: 3,
    paddingBottom: Space.md,
  },
  citationTitle: {
    color: Palette.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  citationUrl: {
    color: Palette.textSubtle,
    fontSize: 12,
    lineHeight: 18,
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
  pressed: {
    opacity: 0.7,
  },
});
