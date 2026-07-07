import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

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
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 5400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 5400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });
  const scale = drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const speckOpacity = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.22, 0.5, 0.22] });

  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap, style]}>
      {blotSpecs.map((blot, index) => (
        <Animated.View
          key={`${blot.color}-${index}`}
          style={[
            styles.blot,
            {
              width: blot.size,
              height: blot.size,
              borderRadius: blot.size / 2,
              backgroundColor: blot.color,
              opacity: blot.opacity,
              transform: [
                { translateX: index % 2 === 0 ? translateX : Animated.multiply(translateX, -1) },
                { translateY: index % 2 === 0 ? translateY : Animated.multiply(translateY, -1) },
                { scale },
              ],
              ...positionStyle(blot),
            },
          ]}
        />
      ))}
      {specks &&
        speckSpecs.map((speck, index) => (
          <Animated.View
            key={`speck-${index}`}
            style={[
              styles.speck,
              {
                width: speck.size,
                height: speck.size,
                borderRadius: speck.size / 2,
                backgroundColor: speck.color,
                opacity: speckOpacity,
                transform: [
                  { translateY: index % 2 === 0 ? translateY : Animated.multiply(translateY, -1) },
                ],
                ...positionStyle(speck),
              },
            ]}
          />
        ))}
    </View>
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
