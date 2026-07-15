import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { levelPalettes } from '@/theme/tokens';

const specks = [
  { x: 0.12, y: 0.1, size: 5, color: levelPalettes[3].deep },
  { x: 0.82, y: 0.14, size: 4, color: levelPalettes[1].deep },
  { x: 0.72, y: 0.24, size: 6, color: levelPalettes[4].deep },
  { x: 0.16, y: 0.36, size: 4, color: levelPalettes[2].deep },
  { x: 0.88, y: 0.44, size: 6, color: levelPalettes[5].deep },
  { x: 0.1, y: 0.58, size: 4, color: levelPalettes[1].deep },
  { x: 0.78, y: 0.64, size: 5, color: levelPalettes[2].deep },
  { x: 0.3, y: 0.78, size: 6, color: levelPalettes[4].deep },
  { x: 0.86, y: 0.86, size: 4, color: levelPalettes[3].deep },
] as const;

export function StatsBurst({ burstKey }: { burstKey: number }) {
  const { width, height } = useWindowDimensions();
  const origin = { x: width / 2, y: height * 0.28 };

  return (
    <View style={styles.layer} pointerEvents="none" accessibilityElementsHidden>
      {specks.map((speck, index) => (
        <BurstSpeck
          key={`${speck.x}-${speck.y}`}
          burstKey={burstKey}
          delay={index * 24}
          finalX={width * speck.x}
          finalY={height * speck.y}
          originX={origin.x}
          originY={origin.y}
          size={speck.size}
          color={speck.color}
        />
      ))}
    </View>
  );
}

function BurstSpeck({
  burstKey,
  delay,
  finalX,
  finalY,
  originX,
  originY,
  size,
  color,
}: {
  burstKey: number;
  delay: number;
  finalX: number;
  finalY: number;
  originX: number;
  originY: number;
  size: number;
  color: string;
}) {
  const progress = useSharedValue(1);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    cancelAnimation(progress);
    cancelAnimation(scale);
    cancelAnimation(opacity);

    if (burstKey === 0 || reducedMotion) {
      progress.value = 1;
      scale.value = 1;
      opacity.value = 0.3;
      return;
    }

    progress.value = 0;
    scale.value = 0.5;
    opacity.value = 0;

    progress.value = withDelay(
      delay,
      withSequence(
        withTiming(1.14, { duration: 390, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 12, stiffness: 90, mass: 0.7 }),
      ),
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.4, { duration: 360, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 11, stiffness: 100, mass: 0.65 }),
      ),
    );
    opacity.value = withDelay(delay, withTiming(0.3, { duration: 240 }));
  }, [burstKey, delay, opacity, progress, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: (originX - finalX) * (1 - progress.value) },
      { translateY: (originY - finalY) * (1 - progress.value) },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.speck,
        {
          left: finalX,
          top: finalY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  speck: { position: 'absolute' },
});
