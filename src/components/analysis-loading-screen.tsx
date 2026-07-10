import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  AnalysisLoading,
  FigmaTokens,
  Gradient,
  Palette,
  Space,
  Type,
} from '@/constants/aqua-theme';
import { AppCopy } from '@/constants/copy';

const loadingFish = require('../../assets/images/results/analysis-loading-fish.png');
const loadingMagnifier = require('../../assets/images/results/analysis-loading-magnifier.png');
const loadingSpinner = require('../../assets/images/results/analysis-loading-spinner.png');

export function AnalysisLoadingScreen() {
  const { height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [orbitProgress] = useState(() => new Animated.Value(0));
  const [spinnerProgress] = useState(() => new Animated.Value(0));

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

  useEffect(() => {
    orbitProgress.stopAnimation();
    spinnerProgress.stopAnimation();
    orbitProgress.setValue(0);
    spinnerProgress.setValue(0);

    if (reduceMotion) return;

    const orbitAnimation = Animated.loop(
      Animated.timing(orbitProgress, {
        duration: AnalysisLoading.loopDuration,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      })
    );
    const spinnerAnimation = Animated.loop(
      Animated.timing(spinnerProgress, {
        duration: AnalysisLoading.loopDuration,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      })
    );

    orbitAnimation.start();
    spinnerAnimation.start();

    return () => {
      orbitAnimation.stop();
      spinnerAnimation.stop();
    };
  }, [orbitProgress, reduceMotion, spinnerProgress]);

  const orbitRotation = orbitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['45deg', '405deg'],
  });
  const magnifierCounterRotation = orbitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-45deg', '-405deg'],
  });
  const spinnerRotation = spinnerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...Gradient.photoReviewColors]}
        locations={[...Gradient.photoReviewLocations]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[FigmaTokens.color.white[0], Palette.white]}
        locations={[0, 1]}
        style={styles.bottomFade}
      />

      <View
        accessibilityLabel={`${AppCopy.result.pendingTitle}. ${AppCopy.result.pendingBody}`}
        accessibilityLiveRegion="polite"
        accessibilityRole="progressbar"
        accessibilityState={{ busy: true }}
        style={[styles.content, { paddingTop: height * AnalysisLoading.contentTopRatio }]}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.stage}
        >
          <Image contentFit="contain" source={loadingFish} style={styles.fish} />

          <Animated.View
            style={[styles.orbit, { transform: [{ rotate: orbitRotation }] }]}
          >
            <Animated.View
              style={[styles.magnifier, { transform: [{ rotate: magnifierCounterRotation }] }]}
            >
              <Image contentFit="contain" source={loadingMagnifier} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </Animated.View>
        </View>

        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.spinner, { transform: [{ rotate: spinnerRotation }] }]}
        >
          <Image contentFit="contain" source={loadingSpinner} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <View style={styles.message}>
          <Text selectable style={styles.messageText}>
            {AppCopy.result.pendingTitle}
          </Text>
          <Text selectable style={styles.messageText}>
            {AppCopy.result.pendingBody}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.canvas,
    flex: 1,
  },
  bottomFade: {
    bottom: 0,
    height: '53%',
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
  },
  content: {
    alignItems: 'center',
    flex: 1,
  },
  stage: {
    alignItems: 'center',
    height: AnalysisLoading.stageSize,
    justifyContent: 'center',
    position: 'relative',
    width: AnalysisLoading.stageSize,
  },
  fish: {
    height: AnalysisLoading.fishSize,
    width: AnalysisLoading.fishSize,
  },
  orbit: {
    height: AnalysisLoading.orbitSize,
    left: (AnalysisLoading.stageSize - AnalysisLoading.orbitSize) / 2,
    position: 'absolute',
    top: (AnalysisLoading.stageSize - AnalysisLoading.orbitSize) / 2,
    width: AnalysisLoading.orbitSize,
  },
  magnifier: {
    height: AnalysisLoading.magnifierSize,
    position: 'absolute',
    right: -AnalysisLoading.magnifierSize / 2,
    top: (AnalysisLoading.orbitSize - AnalysisLoading.magnifierSize) / 2,
    width: AnalysisLoading.magnifierSize,
  },
  spinner: {
    height: AnalysisLoading.spinnerSize,
    marginTop: -Space.lg,
    width: AnalysisLoading.spinnerSize,
  },
  message: {
    alignItems: 'center',
    marginTop: Space.md - Space.xs,
  },
  messageText: {
    color: Palette.analysisLoadingText,
    textAlign: 'center',
    ...Type.title,
  },
});
