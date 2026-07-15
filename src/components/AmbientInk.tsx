import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { color, levelPalettes } from '@/theme/tokens';

const blotSpecs = [
  { size: 116, top: -18, left: -24, color: levelPalettes[3].deep, opacity: 0.12 },
  { size: 146, top: -34, right: -26, color: levelPalettes[2].deep, opacity: 0.12 },
  { size: 122, bottom: -28, left: 4, color: levelPalettes[4].deep, opacity: 0.12 },
  { size: 172, bottom: -48, right: 36, color: levelPalettes[5].deep, opacity: 0.13 },
  { size: 76, bottom: 4, left: 86, color: levelPalettes[1].deep, opacity: 0.16 },
] as const;

const speckSpecs = [
  { top: '10%', left: '12%', size: 3, color: levelPalettes[3].deep },
  { top: '14%', right: '18%', size: 2, color: levelPalettes[1].deep },
  { top: '24%', left: '72%', size: 3, color: levelPalettes[4].deep },
  { top: '36%', left: '16%', size: 2, color: levelPalettes[2].deep },
  { top: '44%', right: '12%', size: 3, color: levelPalettes[5].deep },
  { top: '58%', left: '10%', size: 2, color: levelPalettes[1].deep },
  { top: '64%', right: '22%', size: 2, color: levelPalettes[2].deep },
  { top: '78%', left: '30%', size: 3, color: levelPalettes[4].deep },
  { top: '86%', right: '14%', size: 2, color: levelPalettes[3].deep },
] as const;

export function AmbientInk({
  specks = false,
  style,
}: {
  specks?: boolean;
  style?: ViewStyle;
}) {
  const drift = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    cancelAnimation(drift);
    if (reducedMotion) {
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: 5400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(drift);
  }, [drift, reducedMotion]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap, style]}>
      {blotSpecs.map((blot, index) => (
        <DriftingBlot
          key={blot.color + '-' + index}
          blot={blot}
          index={index}
          drift={drift}
        />
      ))}
      {specks &&
        speckSpecs.map((speck, index) => (
          <DriftingSpeck key={'speck-' + index} speck={speck} index={index} drift={drift} />
        ))}
    </View>
  );
}

function DriftingBlot({
  blot,
  index,
  drift,
}: {
  blot: (typeof blotSpecs)[number];
  index: number;
  drift: SharedValue<number>;
}) {
  const direction = index % 2 === 0 ? 1 : -1;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: direction * 8 * drift.value },
      { translateY: direction * -10 * drift.value },
      { scale: 1 + 0.08 * drift.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.blot,
        {
          width: blot.size,
          height: blot.size,
          borderRadius: blot.size / 2,
          backgroundColor: blot.color,
          opacity: blot.opacity,
          ...positionStyle(blot),
        },
        animatedStyle,
      ]}
    />
  );
}

function DriftingSpeck({
  speck,
  index,
  drift,
}: {
  speck: (typeof speckSpecs)[number];
  index: number;
  drift: SharedValue<number>;
}) {
  const direction = index % 2 === 0 ? 1 : -1;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.22 + 0.28 * (1 - Math.abs(drift.value * 2 - 1)),
    transform: [{ translateY: direction * -10 * drift.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.speck,
        {
          width: speck.size,
          height: speck.size,
          borderRadius: speck.size / 2,
          backgroundColor: speck.color,
          ...positionStyle(speck),
        },
        animatedStyle,
      ]}
    />
  );
}

type PositionSpec = {
  top?: ViewStyle['top'];
  right?: ViewStyle['right'];
  bottom?: ViewStyle['bottom'];
  left?: ViewStyle['left'];
};

function positionStyle(spec: PositionSpec): ViewStyle {
  return {
    top: spec.top,
    right: spec.right,
    bottom: spec.bottom,
    left: spec.left,
  };
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  blot: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  speck: {
    position: 'absolute',
    backgroundColor: color.inkFaint,
  },
});
