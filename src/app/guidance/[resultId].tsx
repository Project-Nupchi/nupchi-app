import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ActionButton } from '@/components/action-button';
import { GlassCard } from '@/components/glass-card';
import { ScreenShell } from '@/components/screen-shell';
import { Section } from '@/components/section';
import { StatusBadge } from '@/components/status-badge';
import { Palette, Radius, Space } from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';
import { useAquaculture } from '@/state/aquaculture-store';

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
            {AppCopy.guidance.insufficientTitle}
          </Text>
          <Text selectable style={styles.body}>
            {AppCopy.guidance.insufficientBody}
          </Text>
          <ActionButton label={AppCopy.common.close} variant="secondary" onPress={() => router.back()} />
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
            {AppCopy.guidance.loadingTitle}
          </Text>
          <Text selectable style={styles.body}>
            {AppCopy.guidance.loadingBody}
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
            {result.tankId} · {tank?.groupId ?? AppCopy.common.tankGroupFallback}
          </Text>
          <Text selectable style={styles.heroTitle}>
            {AppCopy.guidance.heroTitle(tank?.groupId ?? AppCopy.common.tankGroupFallback)}
          </Text>
        </View>
        <StatusBadge status={result.grade} />
      </GlassCard>

      <Section title={AppCopy.guidance.fieldResponse}>
        <Step index="1" title={AppCopy.guidance.recaptureTitle} body={AppCopy.guidance.recaptureBody} />
        <Step index="2" title={AppCopy.guidance.blockGroupTitle} body={AppCopy.guidance.blockGroupBody(tank?.groupId ?? AppCopy.common.sharedGroupFallback)} />
        <Step index="3" title={AppCopy.guidance.expertTitle} body={AppCopy.guidance.expertBody} />
      </Section>

      <Section title={AppCopy.guidance.reporting}>
        <Text selectable style={styles.body}>
          {AppCopy.guidance.reportingBody}
        </Text>
      </Section>

      <Section title={AppCopy.guidance.sources}>
        {AppCopy.guidance.citations.map((c) => (
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
          {AppCopy.guidance.disclaimer}
        </Text>
      </View>

      <ActionButton label={AppCopy.common.close} variant="secondary" onPress={() => router.back()} />
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
